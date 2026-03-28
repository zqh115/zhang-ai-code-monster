<script setup lang="ts">
import axios from 'axios'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import hljs from 'highlight.js'
import MarkdownIt from 'markdown-it'
import 'highlight.js/styles/github-dark.css'
import { message, Modal } from 'ant-design-vue'
import {
  ArrowLeftOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  HighlightOutlined,
  RocketOutlined,
  SendOutlined,
} from '@ant-design/icons-vue'
import AppPreviewPanel from '@/components/AppPreviewPanel.vue'
import { useVisualEditing } from '@/composables/useVisualEditing'
import { deployApp, getAppVoById, getAppVoByIdByAdmin } from '@/api/appController'
import { listAppChatHistory } from '@/api/chatHistoryController'
import request, { API_BASE_URL } from '@/request'
import { useLoginUserStore } from '@/stores/loginUser'
import { buildLocalPreviewUrl, hasEntityId, isSameEntityId, normalizeEntityId } from '@/utils/app'
import { streamSse } from '@/utils/sse'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  createTime?: string
}

const HISTORY_PAGE_SIZE = 10
const PENDING_INIT_PROMPT_STORAGE_KEY = 'pending-app-init-prompt:'

const route = useRoute()
const router = useRouter()
const loginUserStore = useLoginUserStore()

const {
  isEditing,
  hasSelectedElement,
  selectedElement,
  handleFrameLoad,
  toggleEditMode,
  clearSelectedElement,
  exitEditMode,
  buildPromptWithSelectedElement,
} = useVisualEditing()

const loading = ref(false)
const historyLoading = ref(false)
const historyLoadingMore = ref(false)
const sending = ref(false)
const downloadingCode = ref(false)
const deploying = ref(false)
const previewLoading = ref(false)
const appDetail = ref<API.AppVO>()
const previewUrl = ref('')
const inputMessage = ref('')
const messages = ref<ChatMessage[]>([])
const historyTotal = ref(0)
const hasMoreHistory = ref(false)
const autoSent = ref(false)
const historyInitialized = ref(false)
const messageListRef = ref<HTMLElement>()

let currentAbortController: AbortController | null = null

const appId = computed(() => normalizeEntityId(route.params.id))
const appName = computed(() => appDetail.value?.appName || `应用 #${appId.value}`)
const isOwner = computed(() =>
  Boolean(appDetail.value?.userId && isSameEntityId(appDetail.value.userId, loginUserStore.loginUser.id)),
)
const hasUnknownOwner = computed(() => Boolean(appDetail.value && !hasEntityId(appDetail.value.userId)))
const canManageApp = computed(() => Boolean(loginUserStore.isAdmin || isOwner.value || hasUnknownOwner.value))
const canChat = computed(() => canManageApp.value)
const shouldShowPreview = computed(() => historyTotal.value >= 2)
const canDownloadCode = computed(() => canManageApp.value && Boolean(previewUrl.value))
const canUseVisualEditing = computed(() => canChat.value && Boolean(previewUrl.value))
const composerTooltip = computed(() => (canChat.value ? '' : '你只能继续编辑自己的应用'))
const downloadTooltip = computed(() =>
  canDownloadCode.value ? '' : '只有已经生成可访问预览地址的应用才允许下载代码',
)
const visualEditingTooltip = computed(() => {
  if (!canChat.value) {
    return '你只能继续编辑自己的应用'
  }
  if (!previewUrl.value) {
    return '请先生成可预览的网站内容，再进入可视化编辑'
  }
  return isEditing.value ? '退出可视化编辑' : '进入可视化编辑'
})
const emptyDescription = computed(() =>
  canChat.value ? '发送一句描述，开始生成你的应用' : '当前应用暂无可展示的对话记录',
)

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

const normalizeMessageRole = (messageType?: string): ChatMessage['role'] => {
  const normalizedType = messageType?.trim().toLowerCase()
  if (normalizedType === 'user' || normalizedType === 'human') {
    return 'user'
  }
  return 'assistant'
}

const mapHistoryToMessage = (item: API.ChatHistory): ChatMessage => ({
  id: `history-${item.id ?? `${item.messageType}-${item.createTime}`}`,
  role: normalizeMessageRole(item.messageType),
  content: item.message || '',
  createTime: item.createTime,
})

const sortMessagesByCreateTime = (items: ChatMessage[]) =>
  [...items].sort((left, right) => {
    const leftTime = left.createTime ? new Date(left.createTime).getTime() : Number.MAX_SAFE_INTEGER
    const rightTime = right.createTime ? new Date(right.createTime).getTime() : Number.MAX_SAFE_INTEGER
    return leftTime - rightTime
  })

const mergeMessages = (incomingMessages: ChatMessage[]) => {
  const messageMap = new Map<string, ChatMessage>()
  for (const item of [...messages.value, ...incomingMessages]) {
    messageMap.set(item.id, item)
  }
  messages.value = sortMessagesByCreateTime([...messageMap.values()])
}

const oldestLoadedCreateTime = computed(() =>
  sortMessagesByCreateTime(messages.value)
    .find((item) => item.createTime)
    ?.createTime,
)

const latestUserOnlyMessage = computed(() => {
  if (historyTotal.value !== 1 || messages.value.length !== 1) {
    return undefined
  }

  const [onlyMessage] = messages.value
  if (onlyMessage?.role !== 'user' || !onlyMessage.content.trim()) {
    return undefined
  }
  return onlyMessage
})

const singleMessage = computed(() => (messages.value.length === 1 ? messages.value[0] : undefined))

const hasAssistantReply = computed(() =>
  messages.value.some((item) => item.role === 'assistant' && Boolean(item.content.trim())),
)

const selectedElementDescription = computed(() => {
  if (!selectedElement.value) {
    return ''
  }

  const { tagName, id, className, textContent, path } = selectedElement.value
  const details = [
    `标签：${tagName}`,
    id ? `ID：${id}` : '',
    className ? `类名：${className}` : '',
    textContent ? `文本：${textContent}` : '',
    `路径：${path}`,
  ].filter(Boolean)

  return details.join(' ｜ ')
})

const getPendingInitPromptStorageKey = () => `${PENDING_INIT_PROMPT_STORAGE_KEY}${appId.value}`

const getPendingInitPrompt = () => {
  if (typeof window === 'undefined' || !hasEntityId(appId.value)) {
    return ''
  }

  return window.sessionStorage.getItem(getPendingInitPromptStorageKey())?.trim() ?? ''
}

const clearPendingInitPrompt = () => {
  if (typeof window === 'undefined' || !hasEntityId(appId.value)) {
    return
  }

  window.sessionStorage.removeItem(getPendingInitPromptStorageKey())
}

const syncPreviewUrl = () => {
  if (!appDetail.value?.id || !shouldShowPreview.value) {
    previewUrl.value = ''
    return
  }
  previewUrl.value = buildLocalPreviewUrl(appDetail.value.id, appDetail.value.codeGenType) || ''
}

const scrollToBottom = () => {
  nextTick(() => {
    const element = messageListRef.value
    if (element) {
      element.scrollTop = element.scrollHeight
    }
  })
}

const createAssistantMessage = (baseCreateTime?: string): ChatMessage => {
  const baseTimestamp = baseCreateTime ? new Date(baseCreateTime).getTime() : Date.now()
  return {
    id: `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role: 'assistant',
    content: '',
    createTime: new Date(baseTimestamp + 1).toISOString(),
  }
}

const fetchAppDetail = async () => {
  if (!hasEntityId(appId.value)) {
    message.error('应用 ID 无效')
    await router.replace('/')
    return
  }

  loading.value = true
  try {
    const res = loginUserStore.isAdmin
      ? await getAppVoByIdByAdmin({ id: appId.value })
      : await getAppVoById({ id: appId.value })

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

const fetchChatHistory = async (loadMore = false) => {
  if (!hasEntityId(appId.value)) {
    return
  }

  if (loadMore) {
    if (!hasMoreHistory.value || historyLoadingMore.value) {
      return
    }
    historyLoadingMore.value = true
  } else {
    historyLoading.value = true
  }

  try {
    const res = await listAppChatHistory({
      appId: appId.value,
      pageSize: HISTORY_PAGE_SIZE,
      lastCreateTime: loadMore ? oldestLoadedCreateTime.value : undefined,
    })

    if (res.data.code === 0 && res.data.data) {
      const historyMessages = (res.data.data.records ?? []).map(mapHistoryToMessage)
      mergeMessages(historyMessages)
      historyTotal.value = res.data.data.totalRow ?? historyTotal.value
      hasMoreHistory.value = messages.value.length < historyTotal.value
      syncPreviewUrl()
      return
    }

    message.error(`获取对话历史失败：${res.data.message ?? '请稍后重试'}`)
  } finally {
    if (!loadMore) {
      historyInitialized.value = true
    }

    if (loadMore) {
      historyLoadingMore.value = false
    } else {
      historyLoading.value = false
    }
  }
}

const refreshPreview = async () => {
  await fetchAppDetail()
  syncPreviewUrl()
}

const streamAssistantReply = async (
  promptToBackend: string,
  assistantMessage: ChatMessage,
  historyIncrement: number,
) => {
  const search = new URLSearchParams({
    appId: String(appId.value),
    message: promptToBackend,
  })

  await streamSse({
    url: `${API_BASE_URL}/app/chat/gen/code?${search.toString()}`,
    signal: currentAbortController!.signal,
    onMessage: (chunk) => {
      assistantMessage.content += chunk
      mergeMessages([])
      scrollToBottom()
    },
  })

  if (!assistantMessage.content.trim()) {
    assistantMessage.content = '代码生成已完成，你可以继续补充需求来完善这个应用。'
    mergeMessages([])
  }

  historyTotal.value = Math.max(historyTotal.value + historyIncrement, messages.value.length)
  hasMoreHistory.value = messages.value.length < historyTotal.value
  await refreshPreview()
}

const sendMessage = async (rawMessage?: string) => {
  if (!canChat.value) {
    message.warning('你只能继续编辑自己的应用')
    return
  }

  const displayContent = (rawMessage ?? inputMessage.value).trim()
  if (!displayContent || sending.value || !hasEntityId(appId.value)) {
    return
  }

  const promptToBackend = buildPromptWithSelectedElement(displayContent)
  exitEditMode()

  currentAbortController?.abort()
  currentAbortController = new AbortController()

  const now = new Date().toISOString()
  const userMessage: ChatMessage = {
    id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role: 'user',
    content: displayContent,
    createTime: now,
  }
  const assistantMessage = createAssistantMessage(now)

  mergeMessages([userMessage, assistantMessage])
  inputMessage.value = ''
  sending.value = true
  previewLoading.value = true
  scrollToBottom()

  try {
    await streamAssistantReply(promptToBackend, assistantMessage, 2)
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      assistantMessage.content ||= '生成过程被中断了，请稍后重试。'
      mergeMessages([])
      message.error(`生成失败：${(error as Error).message || '请稍后重试'}`)
    }
  } finally {
    sending.value = false
    previewLoading.value = false
    currentAbortController = null
    syncPreviewUrl()
    scrollToBottom()
  }
}

const continueLatestMessage = async (pendingMessage: ChatMessage) => {
  const content = pendingMessage.content.trim()
  if (!content || sending.value || !hasEntityId(appId.value)) {
    return
  }

  currentAbortController?.abort()
  currentAbortController = new AbortController()

  const assistantMessage = createAssistantMessage(pendingMessage.createTime)
  mergeMessages([assistantMessage])
  sending.value = true
  previewLoading.value = true
  scrollToBottom()

  try {
    await streamAssistantReply(content, assistantMessage, 1)
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      assistantMessage.content ||= '生成过程被中断了，请稍后重试。'
      mergeMessages([])
      message.error(`生成失败：${(error as Error).message || '请稍后重试'}`)
    }
  } finally {
    sending.value = false
    previewLoading.value = false
    currentAbortController = null
    syncPreviewUrl()
    scrollToBottom()
  }
}

const tryAutoSendInitPrompt = async () => {
  if (
    autoSent.value ||
    !historyInitialized.value ||
    !appDetail.value ||
    !canChat.value ||
    loading.value ||
    historyLoading.value ||
    sending.value
  ) {
    return
  }

  const pendingPrompt = getPendingInitPrompt() || appDetail.value.initPrompt?.trim() || ''

  if (!hasAssistantReply.value && messages.value.length === 0) {
    const prompt = pendingPrompt
    if (!prompt) {
      return
    }

    autoSent.value = true
    await sendMessage(prompt)
    clearPendingInitPrompt()
    return
  }

  if (!hasAssistantReply.value && singleMessage.value) {
    const singleMessageContent = singleMessage.value.content.trim()
    const content = pendingPrompt || singleMessageContent
    const canContinue = Boolean(content) && (Boolean(pendingPrompt) || singleMessage.value.role === 'user')

    if (canContinue) {
      autoSent.value = true
      await continueLatestMessage({
        ...singleMessage.value,
        role: 'user',
        content,
      })
      clearPendingInitPrompt()
      return
    }
  }

  if (latestUserOnlyMessage.value) {
    autoSent.value = true
    await continueLatestMessage(latestUserOnlyMessage.value)
    clearPendingInitPrompt()
    return
  }

  clearPendingInitPrompt()
}

const ensureLoginUserReady = async () => {
  if (loginUserStore.loginUser.id || loginUserStore.isAdmin) {
    return
  }

  await loginUserStore.fetchLoginUser()
}

const parseDownloadFileName = (contentDisposition?: string) => {
  const fallbackName = `${appId.value || 'app'}.zip`
  if (!contentDisposition) {
    return fallbackName
  }

  const utf8Match = contentDisposition.match(/filename\*\s*=\s*UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1])
  }

  const quotedMatch = contentDisposition.match(/filename\s*=\s*"([^"]+)"/i)
  if (quotedMatch?.[1]) {
    return quotedMatch[1]
  }

  const plainMatch = contentDisposition.match(/filename\s*=\s*([^;]+)/i)
  if (plainMatch?.[1]) {
    return plainMatch[1].trim()
  }

  return fallbackName
}

const extractErrorMessageFromBlob = async (blob?: Blob) => {
  if (!blob) {
    return ''
  }

  const text = await blob.text()
  if (!text) {
    return ''
  }

  try {
    const parsed = JSON.parse(text) as { message?: string }
    return parsed.message || text
  } catch {
    return text
  }
}

const triggerBlobDownload = (blob: Blob, fileName: string) => {
  const objectUrl = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  window.URL.revokeObjectURL(objectUrl)
}

const handleDownloadCode = async () => {
  if (!canManageApp.value || !hasEntityId(appId.value)) {
    return
  }
  if (!previewUrl.value) {
    message.warning('请先生成可访问的应用预览后再下载代码')
    return
  }

  downloadingCode.value = true
  try {
    const response = await request.get<Blob>(`/app/download/${appId.value}`, {
      responseType: 'blob',
      headers: {
        Accept: 'application/zip',
      },
    })

    const contentType = String(response.headers['content-type'] ?? '')
    if (!contentType.includes('application/zip')) {
      const errorMessage = await extractErrorMessageFromBlob(response.data)
      throw new Error(errorMessage || '下载内容不是有效的 ZIP 包')
    }

    const fileName = parseDownloadFileName(String(response.headers['content-disposition'] ?? ''))
    const zipBlob = response.data instanceof Blob ? response.data : new Blob([response.data], { type: contentType })
    triggerBlobDownload(zipBlob, fileName)
    message.success('代码包开始下载')
  } catch (error) {
    let errorMessage = (error as Error).message || '请稍后重试'

    if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
      errorMessage = (await extractErrorMessageFromBlob(error.response.data)) || errorMessage
    }

    message.error(`下载代码失败：${errorMessage}`)
  } finally {
    downloadingCode.value = false
  }
}

const handleDeploy = async () => {
  if (!canManageApp.value || !hasEntityId(appId.value)) {
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

    message.error(`部署失败：${res.data.message ?? '请稍后重试'}`)
  } finally {
    deploying.value = false
  }
}

const handleToggleVisualEditing = () => {
  if (!canUseVisualEditing.value) {
    if (!previewUrl.value) {
      message.warning('请先生成可预览的网站内容，再进入可视化编辑')
    }
    return
  }
  toggleEditMode()
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

const initializePage = async () => {
  if (!hasEntityId(appId.value)) {
    message.error('应用 ID 无效')
    await router.replace('/')
    return
  }

  exitEditMode()
  messages.value = []
  previewUrl.value = ''
  historyTotal.value = 0
  hasMoreHistory.value = false
  autoSent.value = false
  historyInitialized.value = false

  await ensureLoginUserReady()
  await fetchAppDetail()
  await fetchChatHistory()
  await tryAutoSendInitPrompt()
  syncPreviewUrl()
  scrollToBottom()
}

watch(
  () => route.fullPath,
  () => {
    void initializePage()
  },
  { immediate: true },
)

watch(
  [
    () => loginUserStore.loginUser.id,
    () => canChat.value,
    () => appDetail.value?.id,
    () => historyTotal.value,
    () => latestUserOnlyMessage.value?.id,
  ],
  () => {
    void tryAutoSendInitPrompt()
  },
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
          <p>{{ appDetail?.initPrompt || '通过持续对话不断补充需求，你可以逐步完善这个应用。' }}</p>
        </div>
      </div>

      <div v-if="canManageApp" class="chat-topbar__actions">
        <a-button @click="goEditPage">
          <EditOutlined />
          编辑信息
        </a-button>

        <a-tooltip :title="downloadTooltip" :disabled="canDownloadCode">
          <a-button :loading="downloadingCode" :disabled="!canDownloadCode" @click="handleDownloadCode">
            <DownloadOutlined />
            下载代码
          </a-button>
        </a-tooltip>

        <a-button type="primary" :loading="deploying" @click="handleDeploy">
          <RocketOutlined />
          部署应用
        </a-button>
      </div>
    </header>

    <div class="chat-workspace">
      <section class="chat-panel page-shell">
        <div ref="messageListRef" class="message-list">
          <div v-if="hasMoreHistory" class="history-load-more">
            <a-button type="link" :loading="historyLoadingMore" @click="fetchChatHistory(true)">
              加载更多
            </a-button>
          </div>

          <a-spin :spinning="loading || historyLoading">
            <template v-if="messages.length">
              <div
                v-for="item in messages"
                :key="item.id"
                :class="['message-item', item.role === 'user' ? 'message-item--user' : 'message-item--assistant']"
              >
                <div class="message-bubble">
                  <div class="message-role">{{ item.role === 'user' ? '我' : 'AI' }}</div>
                  <div class="message-content" v-html="renderMessageContent(item.content || '正在生成中...')"></div>
                </div>
              </div>
            </template>
            <a-empty v-else :description="emptyDescription" />
          </a-spin>
        </div>

        <div class="composer">
          <a-alert
            v-if="hasSelectedElement"
            class="composer__selection-alert"
            type="info"
            show-icon
            closable
            @close="clearSelectedElement"
          >
            <template #message>已选中页面元素</template>
            <template #description>
              {{ selectedElementDescription }}
            </template>
          </a-alert>

          <a-tooltip :title="composerTooltip" :disabled="canChat">
            <div class="composer__textarea-wrap">
              <a-textarea
                v-model:value="inputMessage"
                :auto-size="{ minRows: 4, maxRows: 8 }"
                :disabled="!canChat"
                :placeholder="canChat ? '描述越具体，页面结构、文案和风格会越贴合你的需求。' : '你只能继续编辑自己的应用'"
                @pressEnter.exact.prevent="sendMessage()"
              />
            </div>
          </a-tooltip>

          <div class="composer__footer">
            <span class="composer-tip">当前账号：{{ loginUserStore.loginUser.userName || '未登录' }}</span>

            <div class="composer__action-group">
              <a-tooltip :title="visualEditingTooltip" :disabled="canUseVisualEditing">
                <a-button :type="isEditing ? 'primary' : 'default'" :ghost="isEditing" @click="handleToggleVisualEditing">
                  <HighlightOutlined />
                  {{ isEditing ? '退出编辑' : '可视化编辑' }}
                </a-button>
              </a-tooltip>

              <a-button type="primary" :loading="sending" :disabled="!canChat" @click="sendMessage()">
                <SendOutlined />
                发送
              </a-button>
            </div>
          </div>
        </div>
      </section>

      <AppPreviewPanel
        class="preview-panel"
        title="生成后的网页展示"
        :src="previewUrl"
        :loading="previewLoading"
        iframe-title="应用预览"
        empty-title="等待生成结果"
        empty-description="继续补充你的需求，生成完成后这里会展示对应的网站内容。"
        :full-height="true"
        min-height="520px"
        @frame-load="handleFrameLoad"
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

.history-load-more {
  display: flex;
  justify-content: center;
  margin-bottom: 12px;
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

.composer__selection-alert {
  margin-bottom: 14px;
}

.composer__textarea-wrap {
  width: 100%;
}

.composer__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-top: 12px;
}

.composer__action-group {
  display: flex;
  align-items: center;
  gap: 12px;
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
  .composer__footer,
  .composer__action-group {
    flex-direction: column;
    align-items: stretch;
  }

  .message-bubble {
    max-width: 100%;
  }
}
</style>
