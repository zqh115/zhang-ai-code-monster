<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import hljs from 'highlight.js'
import MarkdownIt from 'markdown-it'
import 'highlight.js/styles/github-dark.css'
import { message, Modal } from 'ant-design-vue'
import { ArrowLeftOutlined, EditOutlined, EyeOutlined, RocketOutlined, SendOutlined } from '@ant-design/icons-vue'
import AppPreviewPanel from '@/components/AppPreviewPanel.vue'
import { deployApp, getAppVoById, getAppVoByIdByAdmin } from '@/api/appController'
import { API_BASE_URL } from '@/request'
import { useLoginUserStore } from '@/stores/loginUser'
import { buildLocalPreviewUrl } from '@/utils/app'
import { streamSse } from '@/utils/sse'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const route = useRoute()
const router = useRouter()
const loginUserStore = useLoginUserStore()

const loading = ref(false)
const sending = ref(false)
const deploying = ref(false)
const previewLoading = ref(false)
const appDetail = ref<API.AppVO>()
const previewUrl = ref('')
const inputMessage = ref('')
const messages = ref<ChatMessage[]>([])
const hasAutoSent = ref(false)
const messageListRef = ref<HTMLElement>()

let currentAbortController: AbortController | null = null

const appId = computed(() => String(route.params.id ?? ''))
const appName = computed(() => appDetail.value?.appName || `应用 #${appId.value}`)
const isViewMode = computed(() => route.query.view === '1')
const isOwner = computed(
  () => Boolean(appDetail.value?.userId && appDetail.value.userId === loginUserStore.loginUser.id),
)
const canManageApp = computed(() => Boolean(loginUserStore.isAdmin || isOwner.value))
const canChat = computed(() => canManageApp.value)
const composerTooltip = computed(() => (canChat.value ? '' : '你只能继续编辑自己的应用'))
const emptyDescription = computed(() => {
  if (isViewMode.value) {
    return canChat.value ? '当前是查看模式，你仍然可以继续补充需求优化应用。' : '当前应用暂无可展示的对话记录'
  }
  return '发送一句描述，开始生成你的应用'
})

const highlightLanguageAliases: Record<string, string> = {
  html: 'xml',
  js: 'javascript',
  ts: 'typescript',
  shell: 'bash',
  sh: 'bash',
  vue: 'xml',
}

const resolveHighlightLanguage = (language?: string) => {
  const normalizedLanguage = language?.trim().toLowerCase()
  if (!normalizedLanguage) {
    return undefined
  }

  const aliasedLanguage = highlightLanguageAliases[normalizedLanguage] ?? normalizedLanguage
  return hljs.getLanguage(aliasedLanguage) ? aliasedLanguage : undefined
}

const markdownRenderer = new MarkdownIt({
  breaks: true,
  linkify: true,
  typographer: true,
  highlight(code: string, language: string) {
    const resolvedLanguage = resolveHighlightLanguage(language)
    const highlightedCode = resolvedLanguage
      ? hljs.highlight(code, {
          language: resolvedLanguage,
          ignoreIllegals: true,
        }).value
      : hljs.highlightAuto(code).value

    const languageClass = resolvedLanguage ? ` language-${resolvedLanguage}` : ''
    return `<pre class="code-block"><code class="hljs${languageClass}">${highlightedCode}</code></pre>`
  },
})

const renderMessageContent = (content: string) => {
  const normalizedContent = content.trim()
  if (!normalizedContent) {
    return ''
  }
  return markdownRenderer.render(normalizedContent)
}

const scrollToBottom = () => {
  nextTick(() => {
    const el = messageListRef.value
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  })
}

const syncPreviewUrl = () => {
  if (!appDetail.value?.id) {
    previewUrl.value = ''
    return
  }
  previewUrl.value = buildLocalPreviewUrl(appDetail.value.id, appDetail.value.codeGenType) || ''
}

const fetchAppDetail = async () => {
  loading.value = true
  try {
    const res = loginUserStore.isAdmin
      ? await getAppVoByIdByAdmin({ id: appId.value })
      : await getAppVoById({ id: appId.value })

    if (res.data.code === 0 && res.data.data) {
      appDetail.value = res.data.data
      return
    }

    message.error(`获取应用详情失败，${res.data.message ?? '请稍后重试'}`)
    await router.replace('/')
  } catch (error) {
    message.error(`获取应用详情失败，${(error as Error).message || '请稍后重试'}`)
    await router.replace('/')
  } finally {
    loading.value = false
  }
}

const refreshPreview = async () => {
  await fetchAppDetail()
  syncPreviewUrl()
}

const sendMessage = async (rawMessage?: string) => {
  if (!canChat.value) {
    message.warning('你只能继续编辑自己的应用')
    return
  }

  const content = (rawMessage ?? inputMessage.value).trim()
  if (!content || sending.value || !appId.value) {
    return
  }

  currentAbortController?.abort()
  currentAbortController = new AbortController()

  messages.value.push({
    id: `user-${Date.now()}`,
    role: 'user',
    content,
  })

  const assistantMessage: ChatMessage = {
    id: `assistant-${Date.now()}`,
    role: 'assistant',
    content: '',
  }
  messages.value.push(assistantMessage)
  inputMessage.value = ''
  sending.value = true
  previewLoading.value = true
  scrollToBottom()

  try {
    const search = new URLSearchParams({
      appId: String(appId.value),
      message: content,
    })

    await streamSse({
      url: `${API_BASE_URL}/app/chat/gen/code?${search.toString()}`,
      signal: currentAbortController.signal,
      onMessage: (chunk) => {
        assistantMessage.content += chunk
        messages.value = [...messages.value]
        scrollToBottom()
      },
    })

    if (!assistantMessage.content.trim()) {
      assistantMessage.content = '代码生成已完成，你可以继续补充需求来完善这个应用。'
      messages.value = [...messages.value]
    }

    await refreshPreview()
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      assistantMessage.content ||= '生成过程被中断了，请稍后重试。'
      messages.value = [...messages.value]
      message.error(`生成失败，${(error as Error).message || '请稍后重试'}`)
    }
  } finally {
    sending.value = false
    previewLoading.value = false
    currentAbortController = null
    scrollToBottom()
  }
}

const tryAutoSend = async () => {
  if (hasAutoSent.value || isViewMode.value || route.query.autoSend !== '1' || !appDetail.value) {
    return
  }

  const promptFromQuery =
    typeof route.query.prompt === 'string' ? route.query.prompt : appDetail.value.initPrompt || ''

  if (!promptFromQuery.trim()) {
    return
  }

  hasAutoSent.value = true
  await sendMessage(promptFromQuery)
}

const handleDeploy = async () => {
  if (!canManageApp.value || !appId.value) {
    return
  }

  deploying.value = true
  try {
    const res = await deployApp({ appId: appId.value })
    if (res.data.code === 0 && res.data.data) {
      Modal.success({
        title: '部署成功',
        content: res.data.data,
        okText: '打开地址',
        onOk: () => {
          window.open(res.data.data, '_blank')
        },
      })
      return
    }
    message.error(`部署失败，${res.data.message ?? '请稍后重试'}`)
  } finally {
    deploying.value = false
  }
}

const openPreviewInNewTab = () => {
  if (previewUrl.value) {
    window.open(previewUrl.value, '_blank')
  }
}

const goEditPage = async () => {
  if (!canManageApp.value) {
    return
  }
  await router.push({ name: 'appEdit', params: { id: appId.value } })
}

watch(
  () => route.fullPath,
  async () => {
    messages.value = []
    previewUrl.value = ''
    hasAutoSent.value = false
    await fetchAppDetail()
    syncPreviewUrl()
    await tryAutoSend()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  currentAbortController?.abort()
})
</script>

<template>
  <div class="app-chat-page">
    <header class="chat-topbar">
      <div class="chat-topbar__left">
        <a-button type="text" class="back-button" @click="router.push('/')">
          <ArrowLeftOutlined />
          返回首页
        </a-button>
        <div class="title-block">
          <h1>{{ appName }}</h1>
          <p>
            {{ appDetail?.initPrompt || '通过持续对话不断补充需求，你可以逐步完善这个应用。' }}
          </p>
        </div>
      </div>

      <div v-if="canManageApp" class="chat-topbar__actions">
        <a-button @click="goEditPage">
          <EditOutlined />
          编辑信息
        </a-button>
        <a-button type="primary" :loading="deploying" @click="handleDeploy">
          <RocketOutlined />
          部署应用
        </a-button>
      </div>
    </header>

    <div class="chat-workspace">
      <section class="chat-panel page-shell">
        <div ref="messageListRef" class="message-list">
          <a-spin :spinning="loading">
            <template v-if="messages.length">
              <div
                v-for="item in messages"
                :key="item.id"
                :class="['message-item', item.role === 'user' ? 'message-item--user' : 'message-item--assistant']"
              >
                <div class="message-bubble">
                  <div class="message-role">{{ item.role === 'user' ? '我' : 'AI' }}</div>
                  <div
                    class="message-content"
                    v-html="renderMessageContent(item.content || '正在生成中...')"
                  ></div>
                </div>
              </div>
            </template>
            <a-empty v-else :description="emptyDescription" />
          </a-spin>
        </div>

        <div class="composer">
          <a-tooltip :title="composerTooltip" :disabled="canChat">
            <div class="composer__textarea-wrap">
              <a-textarea
                v-model:value="inputMessage"
                :auto-size="{ minRows: 4, maxRows: 8 }"
                :disabled="!canChat"
                :placeholder="
                  canChat
                    ? '描述越具体，页面结构、文案和风格会越贴合你的需求。'
                    : '你只能继续编辑自己的应用'
                "
                @pressEnter.exact.prevent="sendMessage()"
              />
            </div>
          </a-tooltip>
          <div class="composer__footer">
            <span class="composer-tip">当前账号：{{ loginUserStore.loginUser.userName || '未登录' }}</span>
            <a-button type="primary" :loading="sending" :disabled="!canChat" @click="sendMessage()">
              <SendOutlined />
              发送
            </a-button>
          </div>
        </div>
      </section>

      <AppPreviewPanel
        class="preview-panel"
        title="生成后的网页展示"
        description="流式返回完成后，右侧会自动刷新并展示最新生成的网站效果。"
        :src="previewUrl"
        :loading="previewLoading"
        iframe-title="应用预览"
        empty-title="等待生成结果"
        empty-description="发送你的描述后，AI 会一边生成一边回复，网页完成后会在这里自动展示。"
        :full-height="true"
        min-height="520px"
      >
        <template #actions>
          <a-button v-if="previewUrl" @click="openPreviewInNewTab">
            <EyeOutlined />
            新窗口打开
          </a-button>
        </template>
      </AppPreviewPanel>
    </div>
  </div>
</template>

<style scoped>
.app-chat-page {
  min-height: 100vh;
  height: 100vh;
  padding: 24px;
  background:
    radial-gradient(circle at top right, rgba(45, 212, 191, 0.18), transparent 22%),
    linear-gradient(180deg, #f7fbff 0%, #ffffff 100%);
  overflow: hidden;
}

.chat-topbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 20px;
}

.chat-topbar__left {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.back-button {
  margin-top: 4px;
}

.title-block h1 {
  font-size: 32px;
  margin-bottom: 6px;
}

.title-block p {
  max-width: 640px;
  color: #64748b;
}

.chat-topbar__actions {
  display: flex;
  gap: 12px;
}

.chat-workspace {
  display: grid;
  grid-template-columns: minmax(480px, 560px) minmax(0, 1fr);
  gap: 24px;
  height: calc(100vh - 132px);
  min-height: 0;
}

.chat-panel,
.preview-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}

.chat-panel {
  overflow: hidden;
}

.message-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 24px;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.72), rgba(255, 255, 255, 0.95));
}

.message-item {
  display: flex;
  margin-bottom: 16px;
}

.message-item--user {
  justify-content: flex-end;
}

.message-bubble {
  max-width: 94%;
  padding: 16px 18px;
  border-radius: 22px;
  background: #fff;
  border: 1px solid rgba(148, 163, 184, 0.18);
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.05);
}

.message-item--user .message-bubble {
  background: linear-gradient(135deg, #0f172a, #134e4a);
  color: #fff;
}

.message-role {
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 700;
  opacity: 0.72;
}

.message-content {
  word-break: break-word;
  font-size: 14px;
  line-height: 1.75;
}

.message-content :deep(*:first-child) {
  margin-top: 0;
}

.message-content :deep(*:last-child) {
  margin-bottom: 0;
}

.message-content :deep(h1),
.message-content :deep(h2),
.message-content :deep(h3),
.message-content :deep(h4),
.message-content :deep(h5),
.message-content :deep(h6) {
  margin: 1.1em 0 0.55em;
  line-height: 1.35;
}

.message-content :deep(h1) {
  font-size: 1.5em;
}

.message-content :deep(h2) {
  font-size: 1.32em;
}

.message-content :deep(h3) {
  font-size: 1.18em;
}

.message-content :deep(p),
.message-content :deep(ul),
.message-content :deep(ol),
.message-content :deep(blockquote),
.message-content :deep(pre),
.message-content :deep(table),
.message-content :deep(hr) {
  margin: 0.9em 0;
}

.message-content :deep(ul),
.message-content :deep(ol) {
  padding-left: 1.4em;
}

.message-content :deep(li + li) {
  margin-top: 0.35em;
}

.message-content :deep(a) {
  color: #1677ff;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.message-content :deep(strong) {
  font-weight: 700;
}

.message-content :deep(code:not(.hljs)) {
  padding: 0.18em 0.45em;
  border-radius: 7px;
  background: rgba(15, 23, 42, 0.07);
  color: #0f172a;
  font-size: 0.92em;
  font-family: 'Cascadia Code', 'Fira Code', Consolas, 'Courier New', monospace;
}

.message-content :deep(blockquote) {
  padding: 0.9em 1em;
  border-left: 4px solid rgba(22, 119, 255, 0.28);
  border-radius: 0 14px 14px 0;
  background: rgba(241, 245, 249, 0.92);
  color: #475569;
}

.message-content :deep(hr) {
  border: 0;
  border-top: 1px solid rgba(148, 163, 184, 0.26);
}

.message-content :deep(table) {
  display: block;
  width: 100%;
  overflow-x: auto;
  border-collapse: collapse;
}

.message-content :deep(th),
.message-content :deep(td) {
  padding: 10px 12px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  text-align: left;
  vertical-align: top;
}

.message-content :deep(th) {
  background: rgba(241, 245, 249, 0.95);
  font-weight: 700;
}

.message-content :deep(.code-block) {
  margin: 1em 0;
  overflow-x: auto;
  border-radius: 18px;
  border: 1px solid rgba(15, 23, 42, 0.1);
  background: #0f172a;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.message-content :deep(.code-block code.hljs) {
  display: block;
  padding: 18px 20px;
  background: transparent;
  font-size: 13.5px;
  line-height: 1.7;
  font-family: 'Cascadia Code', 'Fira Code', Consolas, 'Courier New', monospace;
}

.message-item--user .message-content :deep(a) {
  color: #bfdbfe;
}

.message-item--user .message-content :deep(code:not(.hljs)) {
  background: rgba(255, 255, 255, 0.18);
  color: #f8fafc;
}

.message-item--user .message-content :deep(blockquote) {
  background: rgba(255, 255, 255, 0.08);
  border-left-color: rgba(255, 255, 255, 0.28);
  color: rgba(255, 255, 255, 0.84);
}

.composer {
  flex-shrink: 0;
  padding: 18px;
  border-top: 1px solid rgba(148, 163, 184, 0.16);
  background: #fff;
}

.composer__textarea-wrap {
  width: 100%;
}

.composer__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
}

.composer-tip {
  color: #64748b;
}

@media (max-width: 1200px) {
  .app-chat-page {
    height: auto;
    overflow: visible;
  }

  .chat-workspace {
    grid-template-columns: 1fr;
    height: auto;
  }

  .chat-panel,
  .preview-panel {
    height: auto;
  }

  .message-list {
    max-height: 560px;
  }
}

@media (max-width: 768px) {
  .app-chat-page {
    padding: 14px;
  }

  .chat-topbar,
  .chat-topbar__left,
  .chat-topbar__actions,
  .composer__footer {
    flex-direction: column;
    align-items: stretch;
  }

  .message-bubble {
    max-width: 100%;
  }
}
</style>
