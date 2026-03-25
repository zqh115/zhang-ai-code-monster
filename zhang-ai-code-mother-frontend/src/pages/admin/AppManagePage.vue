<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import PageHeader from '@/components/PageHeader.vue'
import { deleteAppByAdmin, listAppVoByPageByAdmin, updateAppByAdmin } from '@/api/appController'
import { formatDateTime, getAppTypeLabel, hasEntityId } from '@/utils/app'

const router = useRouter()

const loading = ref(false)
const data = ref<API.AppVO[]>([])
const total = ref(0)

const searchParams = reactive<
  Omit<API.AppQueryRequest, 'id' | 'userId'> & {
    id?: string
    userId?: string
  }
>({
  pageNum: 1,
  pageSize: 10,
  id: undefined,
  appName: '',
  cover: '',
  initPrompt: '',
  codeGenType: '',
  deployKey: '',
  priority: undefined,
  userId: undefined,
})

const columns = [
  { title: 'ID', dataIndex: 'id', width: 80, fixed: 'left' },
  { title: '应用名称', dataIndex: 'appName', width: 180 },
  { title: '封面', dataIndex: 'cover', width: 120 },
  { title: '初始提示词', dataIndex: 'initPrompt', ellipsis: true },
  { title: '代码类型', dataIndex: 'codeGenType', width: 120 },
  { title: '优先级', dataIndex: 'priority', width: 100 },
  { title: '创建者', dataIndex: 'user', width: 150 },
  { title: 'Deploy Key', dataIndex: 'deployKey', width: 180, ellipsis: true },
  { title: '部署时间', dataIndex: 'deployedTime', width: 180 },
  { title: '创建时间', dataIndex: 'createTime', width: 180 },
  { title: '操作', key: 'action', width: 220, fixed: 'right' },
]

const pagination = computed(() => ({
  current: searchParams.pageNum ?? 1,
  pageSize: searchParams.pageSize ?? 10,
  total: total.value,
  showSizeChanger: true,
  showTotal: (count: number) => `共 ${count} 条`,
}))

const handleTableChange = (page: { current?: number; pageSize?: number }) => {
  searchParams.pageNum = page.current ?? 1
  searchParams.pageSize = page.pageSize ?? searchParams.pageSize
  fetchData()
}

const buildQueryParams = (): API.AppQueryRequest => {
  const params: API.AppQueryRequest = {
    pageNum: searchParams.pageNum,
    pageSize: searchParams.pageSize,
  }

  if (searchParams.id?.trim()) params.id = searchParams.id.trim()
  if (searchParams.userId?.trim()) params.userId = searchParams.userId.trim()
  if (searchParams.priority !== undefined && searchParams.priority !== null) params.priority = searchParams.priority
  if (searchParams.appName?.trim()) params.appName = searchParams.appName.trim()
  if (searchParams.cover?.trim()) params.cover = searchParams.cover.trim()
  if (searchParams.initPrompt?.trim()) params.initPrompt = searchParams.initPrompt.trim()
  if (searchParams.codeGenType?.trim()) params.codeGenType = searchParams.codeGenType.trim()
  if (searchParams.deployKey?.trim()) params.deployKey = searchParams.deployKey.trim()

  return params
}

const fetchData = async () => {
  loading.value = true
  try {
    const res = await listAppVoByPageByAdmin(buildQueryParams())
    if (res.data.code === 0 && res.data.data) {
      data.value = res.data.data.records ?? []
      total.value = res.data.data.totalRow ?? 0
      return
    }
    message.error(`获取应用列表失败，${res.data.message ?? '请稍后重试'}`)
  } finally {
    loading.value = false
  }
}

const doSearch = () => {
  searchParams.pageNum = 1
  fetchData()
}

const resetSearch = () => {
  searchParams.pageNum = 1
  searchParams.pageSize = 10
  searchParams.id = undefined
  searchParams.appName = ''
  searchParams.cover = ''
  searchParams.initPrompt = ''
  searchParams.codeGenType = ''
  searchParams.deployKey = ''
  searchParams.priority = undefined
  searchParams.userId = undefined
  fetchData()
}

const openEditPage = (appId?: API.IdType) => {
  if (!hasEntityId(appId)) return
  const url = router.resolve({ name: 'appEdit', params: { id: appId } }).href
  window.open(url, '_blank')
}

const openChatPage = async (appId?: API.IdType) => {
  if (!hasEntityId(appId)) return
  await router.push({ name: 'appChat', params: { id: appId } })
}

const handleDelete = async (appId?: API.IdType) => {
  if (!hasEntityId(appId)) return
  const res = await deleteAppByAdmin({ id: appId })
  if (res.data.code === 0) {
    message.success('应用已删除')
    fetchData()
    return
  }
  message.error(`删除失败，${res.data.message ?? '请稍后重试'}`)
}

const markFeatured = async (app?: API.AppVO) => {
  if (!app || !hasEntityId(app.id)) return
  const res = await updateAppByAdmin({
    id: app.id,
    appName: app.appName,
    cover: app.cover,
    priority: 99,
  })
  if (res.data.code === 0) {
    message.success('已设为精选')
    fetchData()
    return
  }
  message.error(`设置精选失败，${res.data.message ?? '请稍后重试'}`)
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="manage-page page-shell">
    <PageHeader
      title="应用管理"
      subtitle="管理员可按除时间外的任意字段筛选应用，并进行编辑、删除和精选操作。"
    />

    <a-form layout="vertical" class="search-form" @finish="doSearch">
      <div class="search-grid">
        <a-form-item label="应用 ID">
          <a-input v-model:value="searchParams.id" allow-clear />
        </a-form-item>
        <a-form-item label="应用名称">
          <a-input v-model:value="searchParams.appName" allow-clear />
        </a-form-item>
        <a-form-item label="创建者 ID">
          <a-input v-model:value="searchParams.userId" allow-clear />
        </a-form-item>
        <a-form-item label="代码类型">
          <a-input v-model:value="searchParams.codeGenType" allow-clear />
        </a-form-item>
        <a-form-item label="优先级">
          <a-input-number v-model:value="searchParams.priority" :min="0" :max="999" style="width: 100%" />
        </a-form-item>
        <a-form-item label="Deploy Key">
          <a-input v-model:value="searchParams.deployKey" allow-clear />
        </a-form-item>
        <a-form-item label="封面地址">
          <a-input v-model:value="searchParams.cover" allow-clear />
        </a-form-item>
        <a-form-item label="每页数量">
          <a-input-number v-model:value="searchParams.pageSize" :min="1" style="width: 100%" />
        </a-form-item>
      </div>
      <a-form-item label="初始提示词">
        <a-input v-model:value="searchParams.initPrompt" allow-clear />
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
      :scroll="{ x: 1600 }"
      @change="handleTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'cover'">
          <a-image
            v-if="record.cover"
            :src="record.cover"
            :width="64"
            :height="40"
            style="object-fit: cover; border-radius: 8px"
          />
          <span v-else>--</span>
        </template>
        <template v-else-if="column.dataIndex === 'codeGenType'">
          {{ getAppTypeLabel(record.codeGenType) }}
        </template>
        <template v-else-if="column.dataIndex === 'priority'">
          <a-tag :color="record.priority === 99 ? 'gold' : 'blue'">
            {{ record.priority === 99 ? '精选' : record.priority ?? 0 }}
          </a-tag>
        </template>
        <template v-else-if="column.dataIndex === 'user'">
          {{ record.user?.userName || `用户 #${record.userId}` }}
        </template>
        <template v-else-if="column.dataIndex === 'deployedTime'">
          {{ formatDateTime(record.deployedTime) }}
        </template>
        <template v-else-if="column.dataIndex === 'createTime'">
          {{ formatDateTime(record.createTime) }}
        </template>
        <template v-else-if="column.key === 'action'">
          <a-space wrap>
            <a-button type="link" @click="openEditPage(record.id)">编辑</a-button>
            <a-button type="link" @click="openChatPage(record.id)">详情</a-button>
            <a-button type="link" @click="markFeatured(record)">精选</a-button>
            <a-popconfirm title="确认删除该应用吗？" ok-text="删除" cancel-text="取消" @confirm="handleDelete(record.id)">
              <a-button danger type="link">删除</a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </template>
    </a-table>
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
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0 16px;
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

  .search-grid {
    grid-template-columns: 1fr;
  }
}
</style>
