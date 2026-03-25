<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import PageHeader from '@/components/PageHeader.vue'
import { listAllChatHistoryByPageForAdmin, remove } from '@/api/chatHistoryController'
import { formatDateTime, hasEntityId, normalizeEntityId } from '@/utils/app'

const router = useRouter()

const loading = ref(false)
const detailVisible = ref(false)
const currentRecord = ref<API.ChatHistory>()
const data = ref<API.ChatHistory[]>([])
const total = ref(0)

const searchParams = reactive<
  Omit<API.ChatHistoryQueryRequest, 'id' | 'appId' | 'userId'> & {
    id?: string
    appId?: string
    userId?: string
  }
>({
  pageNum: 1,
  pageSize: 10,
  id: undefined,
  message: '',
  messageType: '',
  appId: undefined,
  userId: undefined,
  lastCreateTime: '',
})

const columns = [
  { title: 'ID', dataIndex: 'id', width: 80, fixed: 'left' },
  { title: '应用 ID', dataIndex: 'appId', width: 100 },
  { title: '用户 ID', dataIndex: 'userId', width: 100 },
  { title: '消息类型', dataIndex: 'messageType', width: 120 },
  { title: '消息内容', dataIndex: 'message', ellipsis: true },
  { title: '创建时间', dataIndex: 'createTime', width: 180 },
  { title: '更新时间', dataIndex: 'updateTime', width: 180 },
  { title: '操作', key: 'action', width: 220, fixed: 'right' },
]

const pagination = computed(() => ({
  current: searchParams.pageNum ?? 1,
  pageSize: searchParams.pageSize ?? 10,
  total: total.value,
  showSizeChanger: true,
  showTotal: (count: number) => `共 ${count} 条`,
}))

const messageTypeLabel = (messageType?: string) => {
  const normalizedType = messageType?.trim().toLowerCase()
  if (normalizedType === 'user' || normalizedType === 'human') {
    return '用户'
  }
  if (normalizedType === 'assistant' || normalizedType === 'ai') {
    return 'AI'
  }
  return messageType || '--'
}

const buildQueryParams = (): API.ChatHistoryQueryRequest => {
  const params: API.ChatHistoryQueryRequest = {
    pageNum: searchParams.pageNum,
    pageSize: searchParams.pageSize,
  }

  if (searchParams.id?.trim()) params.id = searchParams.id.trim()
  if (searchParams.appId?.trim()) params.appId = searchParams.appId.trim()
  if (searchParams.userId?.trim()) params.userId = searchParams.userId.trim()
  if (searchParams.message?.trim()) params.message = searchParams.message.trim()
  if (searchParams.messageType?.trim()) params.messageType = searchParams.messageType.trim()
  if (searchParams.lastCreateTime?.trim()) params.lastCreateTime = searchParams.lastCreateTime.trim()

  return params
}

const fetchData = async () => {
  loading.value = true
  try {
    const res = await listAllChatHistoryByPageForAdmin(buildQueryParams())
    if (res.data.code === 0 && res.data.data) {
      data.value = res.data.data.records ?? []
      total.value = res.data.data.totalRow ?? 0
      return
    }
    message.error(`获取对话列表失败，${res.data.message ?? '请稍后重试'}`)
  } finally {
    loading.value = false
  }
}

const handleTableChange = (page: { current?: number; pageSize?: number }) => {
  searchParams.pageNum = page.current ?? 1
  searchParams.pageSize = page.pageSize ?? searchParams.pageSize
  fetchData()
}

const doSearch = () => {
  searchParams.pageNum = 1
  fetchData()
}

const resetSearch = () => {
  searchParams.pageNum = 1
  searchParams.pageSize = 10
  searchParams.id = undefined
  searchParams.message = ''
  searchParams.messageType = ''
  searchParams.appId = undefined
  searchParams.userId = undefined
  searchParams.lastCreateTime = ''
  fetchData()
}

const openDetail = (record: API.ChatHistory) => {
  currentRecord.value = record
  detailVisible.value = true
}

const openAppChat = async (appId?: API.IdType) => {
  if (!hasEntityId(appId)) {
    return
  }
  const targetAppId = String(appId)
  await router.push({
    name: 'appChat',
    params: { id: targetAppId },
  })
}

const handleDelete = async (id?: API.IdType) => {
  const targetId = normalizeEntityId(id)
  if (!targetId) {
    return
  }
  const res = await remove({ id: targetId })
  if (res.data) {
    message.success('对话记录已删除')
    fetchData()
    return
  }
  message.error('删除失败，请稍后重试')
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="manage-page page-shell">
    <PageHeader title="对话管理" subtitle="管理员可以按应用、用户、消息类型等条件筛选对话历史，并查看详情或删除记录。" />

    <a-form layout="vertical" class="search-form" @finish="doSearch">
      <div class="search-grid">
        <a-form-item label="记录 ID">
          <a-input v-model:value="searchParams.id" allow-clear />
        </a-form-item>
        <a-form-item label="应用 ID">
          <a-input v-model:value="searchParams.appId" allow-clear />
        </a-form-item>
        <a-form-item label="用户 ID">
          <a-input v-model:value="searchParams.userId" allow-clear />
        </a-form-item>
        <a-form-item label="消息类型">
          <a-input v-model:value="searchParams.messageType" placeholder="如 user / assistant" allow-clear />
        </a-form-item>
        <a-form-item label="最后创建时间游标">
          <a-input v-model:value="searchParams.lastCreateTime" placeholder="YYYY-MM-DD HH:mm:ss" allow-clear />
        </a-form-item>
        <a-form-item label="每页数量">
          <a-input-number v-model:value="searchParams.pageSize" :min="1" style="width: 100%" />
        </a-form-item>
      </div>
      <a-form-item label="消息内容">
        <a-input v-model:value="searchParams.message" allow-clear />
      </a-form-item>
      <a-space>
        <a-button type="primary" html-type="submit">搜索</a-button>
        <a-button @click="resetSearch">重置</a-button>
      </a-space>
    </a-form>

    <a-table
      row-key="id"
      :columns="columns"
      :data-source="data"
      :loading="loading"
      :pagination="pagination"
      :scroll="{ x: 1500 }"
      @change="handleTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'messageType'">
          <a-tag :color="record.messageType?.toLowerCase() === 'user' ? 'blue' : 'green'">
            {{ messageTypeLabel(record.messageType) }}
          </a-tag>
        </template>
        <template v-else-if="column.dataIndex === 'createTime'">
          {{ formatDateTime(record.createTime) }}
        </template>
        <template v-else-if="column.dataIndex === 'updateTime'">
          {{ formatDateTime(record.updateTime) }}
        </template>
        <template v-else-if="column.key === 'action'">
          <a-space wrap>
            <a-button type="link" @click="openDetail(record)">详情</a-button>
            <a-button type="link" @click="openAppChat(record.appId)">查看对话页</a-button>
            <a-popconfirm title="确认删除这条对话记录吗？" ok-text="删除" cancel-text="取消" @confirm="handleDelete(record.id)">
              <a-button danger type="link">删除</a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </template>
    </a-table>

    <a-modal
      v-model:open="detailVisible"
      title="对话详情"
      width="760px"
      :footer="null"
      destroy-on-close
    >
      <template v-if="currentRecord">
        <div class="detail-grid">
          <div class="detail-item">
            <span>记录 ID</span>
            <strong>{{ currentRecord.id ?? '--' }}</strong>
          </div>
          <div class="detail-item">
            <span>应用 ID</span>
            <strong>{{ currentRecord.appId ?? '--' }}</strong>
          </div>
          <div class="detail-item">
            <span>用户 ID</span>
            <strong>{{ currentRecord.userId ?? '--' }}</strong>
          </div>
          <div class="detail-item">
            <span>消息类型</span>
            <strong>{{ messageTypeLabel(currentRecord.messageType) }}</strong>
          </div>
          <div class="detail-item">
            <span>创建时间</span>
            <strong>{{ formatDateTime(currentRecord.createTime) }}</strong>
          </div>
          <div class="detail-item">
            <span>更新时间</span>
            <strong>{{ formatDateTime(currentRecord.updateTime) }}</strong>
          </div>
        </div>

        <div class="detail-message">
          <span>消息内容</span>
          <pre>{{ currentRecord.message || '--' }}</pre>
        </div>
      </template>
    </a-modal>
  </div>
</template>

<style scoped>
.manage-page {
  padding: 32px;
}

.search-form {
  margin-bottom: 24px;
}

.search-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0 16px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-item span,
.detail-message span {
  color: #64748b;
}

.detail-message {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 20px;
}

.detail-message pre {
  margin: 0;
  padding: 16px;
  border-radius: 16px;
  background: rgba(248, 250, 252, 0.96);
  border: 1px solid rgba(148, 163, 184, 0.18);
  white-space: pre-wrap;
  word-break: break-word;
}

@media (max-width: 1080px) {
  .search-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .manage-page {
    padding: 20px;
  }

  .search-grid,
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
