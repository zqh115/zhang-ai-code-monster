<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import { ArrowLeftOutlined, EditOutlined, EyeOutlined, RocketOutlined, SendOutlined } from '@ant-design/icons-vue'
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
const composerTooltip = computed(() =>
  canChat.value ? '' : '无法在别人的作品下对话哦~',
)
const emptyDescription = computed(() => {
  if (isViewMode.value) {
    return canChat.value ? '当前为查看模式，可继续输入新需求完善作品' : '当前作品暂无可展示的对话记录'
  }
  return '发送一句描述，开始生成你的应用'
})

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
      ? await getAppVoByIdByAdmin({
          id: appId.value,
        })
      : await getAppVoById({
          id: appId.value,
        })
    if (res.data.code === 0 && res.data.data) {
      appDetail.value = res.data.data
      return
    }
    message.error(`获取应用详情失败：${res.data.message ?? '请稍后重试'}`)
    await router.replace('/')
  } catch (error) {
    message.error(`获取应用详情失败：${(error as Error).message || '请稍后重试'}`)
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
    message.warning('无法在别人的作品下对话哦~')
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
      assistantMessage.content = '代码生成已完成，你可以继续补充需求完善这个应用。'
      messages.value = [...messages.value]
    }
    await refreshPreview()
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      assistantMessage.content ||= '生成过程被中断了，请稍后重试。'
      messages.value = [...messages.value]
      message.error(`生成失败：${(error as Error).message || '请稍后重试'}`)
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
  if (!canManageApp.value) {
    return
  }
  if (!appId.value) {
    return
  }
  deploying.value = true
  try {
    const res = await deployApp({
      appId: appId.value,
    })
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
    message.error(`部署失败：${res.data.message ?? '请稍后重试'}`)
  } finally {
    deploying.value = false
  }
}

const openPreviewInNewTab = () => {
  if (previewUrl.value) {
    window.open(previewUrl.value, '_blank')
  }
}

const goEditPage = () => {
  if (!canManageApp.value) {
    return
  }
  router.push({ name: 'appEdit', params: { id: appId.value } })
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
            {{ appDetail?.initPrompt || '通过对话不断补充需求，你可以继续完善这个应用。' }}
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
                  <div class="message-content">{{ item.content || '正在生成中…' }}</div>
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
                    : '无法在别人的作品下对话哦~'
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

      <section class="preview-panel page-shell">
        <div class="preview-panel__header">
          <div>
            <h2>生成后的网页展示</h2>
            <p>流式返回完成后，右侧会自动刷新并展示最新生成的网站效果。</p>
          </div>
          <a-button v-if="previewUrl" @click="openPreviewInNewTab">
            <EyeOutlined />
            新窗口打开
          </a-button>
        </div>

        <div class="preview-panel__body">
          <a-spin :spinning="previewLoading">
            <iframe v-if="previewUrl" :src="previewUrl" class="preview-frame" title="应用预览" />
            <div v-else class="preview-empty">
              <h3>等待生成结果</h3>
              <p>发送你的描述后，AI 会边生成边回复，网页完成后会在这里自动展示。</p>
            </div>
          </a-spin>
        </div>
      </section>
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
  grid-template-columns: 420px minmax(0, 1fr);
  gap: 20px;
  height: calc(100vh - 132px);
  min-height: 0;
}

.chat-workspace--single {
  grid-template-columns: minmax(0, 1fr);
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
  padding: 22px;
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
  max-width: 86%;
  padding: 14px 16px;
  border-radius: 20px;
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
  white-space: pre-wrap;
  word-break: break-word;
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

.composer-tip,
.preview-panel__header p {
  color: #64748b;
}

.preview-panel__header {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: center;
  padding: 22px 22px 0;
}

.preview-panel__header h2 {
  margin-bottom: 6px;
  font-size: 26px;
}

.preview-panel__body {
  flex: 1;
  padding: 22px;
  min-height: 0;
  overflow: hidden;
}

.preview-panel__body :deep(.ant-spin-nested-loading) {
  height: 100%;
}

.preview-panel__body :deep(.ant-spin-container) {
  height: 100%;
}

.preview-frame {
  width: 100%;
  height: 100%;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 24px;
  background: #fff;
}

.preview-empty {
  display: flex;
  height: 100%;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 8px;
  border-radius: 24px;
  border: 1px dashed rgba(148, 163, 184, 0.4);
  background: linear-gradient(135deg, rgba(236, 254, 255, 0.62), rgba(255, 255, 255, 0.96));
  text-align: center;
}

.preview-empty p {
  max-width: 380px;
  color: #64748b;
}

@media (max-width: 1200px) {
  .app-chat-page {
    height: auto;
    overflow: visible;
  }

  .chat-workspace,
  .chat-workspace--single {
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

  .preview-frame {
    min-height: 520px;
  }

  .preview-empty {
    min-height: 520px;
  }

  .preview-panel__body :deep(.ant-spin-nested-loading),
  .preview-panel__body :deep(.ant-spin-container) {
    min-height: 520px;
  }
}

@media (max-width: 768px) {
  .app-chat-page {
    padding: 14px;
  }

  .chat-topbar,
  .chat-topbar__left,
  .chat-topbar__actions,
  .composer__footer,
  .preview-panel__header {
    flex-direction: column;
    align-items: stretch;
  }

  .message-bubble {
    max-width: 100%;
  }
}
</style>
