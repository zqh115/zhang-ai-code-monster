<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { getAppVoById, getAppVoByIdByAdmin, updateApp, updateAppByAdmin } from '@/api/appController'
import { useLoginUserStore } from '@/stores/loginUser'
import { buildLocalPreviewUrl, formatDateTime, getAppTypeLabel } from '@/utils/app'

const route = useRoute()
const router = useRouter()
const loginUserStore = useLoginUserStore()

const loading = ref(false)
const saving = ref(false)
const appDetail = ref<API.AppVO>()
const formState = reactive<API.AppAdminUpdateRequest>({
  id: undefined,
  appName: '',
  cover: '',
  priority: undefined,
})

const appId = computed(() => String(route.params.id ?? ''))
const isAdmin = computed(() => loginUserStore.isAdmin)
const previewUrl = computed(() =>
  appDetail.value?.id ? buildLocalPreviewUrl(appDetail.value.id, appDetail.value.codeGenType) : '',
)

const fetchDetail = async () => {
  loading.value = true
  try {
    const res = isAdmin.value
      ? await getAppVoByIdByAdmin({
          id: appId.value,
        })
      : await getAppVoById({
          id: appId.value,
        })
    if (res.data.code === 0 && res.data.data) {
      const app = res.data.data
      if (app.userId && app.userId !== loginUserStore.loginUser.id && !isAdmin.value) {
        message.error('你只能编辑自己的应用')
        await router.replace('/')
        return
      }
      appDetail.value = app
      formState.id = app.id
      formState.appName = app.appName || ''
      formState.cover = app.cover || ''
      formState.priority = app.priority
      return
    }
    message.error(`获取应用详情失败，${res.data.message ?? '请稍后重试'}`)
  } finally {
    loading.value = false
  }
}

const handleSubmit = async () => {
  if (!formState.id) {
    return
  }
  if (!formState.appName?.trim()) {
    message.warning('应用名称不能为空')
    return
  }

  saving.value = true
  try {
    const res = isAdmin.value
      ? await updateAppByAdmin({
          id: formState.id,
          appName: formState.appName.trim(),
          cover: formState.cover?.trim(),
          priority: formState.priority,
        })
      : await updateApp({
          id: formState.id,
          appName: formState.appName.trim(),
        })

    if (res.data.code === 0) {
      message.success('应用信息已更新')
      await fetchDetail()
      return
    }
    message.error(`更新失败，${res.data.message ?? '请稍后重试'}`)
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  fetchDetail()
})
</script>

<template>
  <div class="edit-page page-shell">
    <div class="edit-page__header">
      <div>
        <h1 class="page-title">应用信息修改</h1>
        <p class="page-subtitle">
          普通用户当前支持修改应用名称；管理员还可以调整封面与优先级。
        </p>
      </div>
      <a-space>
        <a-button @click="router.push({ name: 'appChat', params: { id: appId } })">进入对话页</a-button>
        <a-button type="primary" :loading="saving" @click="handleSubmit">保存修改</a-button>
      </a-space>
    </div>

    <a-spin :spinning="loading">
      <div class="edit-page__content">
        <section class="edit-form">
          <a-form layout="vertical">
            <a-form-item label="应用名称" required>
              <a-input v-model:value="formState.appName" placeholder="请输入应用名称" />
            </a-form-item>

            <template v-if="isAdmin">
              <a-form-item label="应用封面">
                <a-input v-model:value="formState.cover" placeholder="请输入封面图片 URL" />
              </a-form-item>
              <a-form-item label="优先级">
                <a-input-number
                  v-model:value="formState.priority"
                  :min="0"
                  :max="999"
                  style="width: 100%"
                  placeholder="请输入优先级"
                />
              </a-form-item>
            </template>
          </a-form>

          <div class="meta-list">
            <div class="meta-item">
              <span>应用 ID</span>
              <strong>{{ appDetail?.id ?? '--' }}</strong>
            </div>
            <div class="meta-item">
              <span>代码类型</span>
              <strong>{{ getAppTypeLabel(appDetail?.codeGenType) }}</strong>
            </div>
            <div class="meta-item">
              <span>创建者</span>
              <strong>{{ appDetail?.user?.userName || '未知用户' }}</strong>
            </div>
            <div class="meta-item">
              <span>部署 Key</span>
              <strong>{{ appDetail?.deployKey || '--' }}</strong>
            </div>
            <div class="meta-item">
              <span>创建时间</span>
              <strong>{{ formatDateTime(appDetail?.createTime) }}</strong>
            </div>
            <div class="meta-item meta-item--column">
              <span>初始提示词</span>
              <strong>{{ appDetail?.initPrompt || '--' }}</strong>
            </div>
          </div>
        </section>

        <section class="edit-preview">
          <div class="preview-header">
            <h2>网页预览</h2>
            <p>生成完成后，这里会直接加载本地静态预览地址。</p>
          </div>
          <iframe v-if="previewUrl" :src="previewUrl" title="应用预览" class="preview-frame" />
          <div v-else class="preview-empty">
            <h3>暂无预览内容</h3>
            <p>可以先进入对话页生成应用，再回到这里完善应用信息。</p>
          </div>
        </section>
      </div>
    </a-spin>
  </div>
</template>

<style scoped>
.edit-page {
  padding: 32px;
}

.edit-page__header {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: flex-start;
  margin-bottom: 28px;
}

.edit-page__content {
  display: grid;
  grid-template-columns: 420px minmax(0, 1fr);
  gap: 24px;
}

.edit-form,
.edit-preview {
  padding: 24px;
  border-radius: 24px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(255, 255, 255, 0.84);
}

.meta-list {
  display: grid;
  gap: 14px;
  margin-top: 24px;
}

.meta-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px dashed rgba(148, 163, 184, 0.28);
}

.meta-item span,
.preview-header p {
  color: #64748b;
}

.meta-item strong {
  text-align: right;
}

.meta-item--column {
  flex-direction: column;
}

.preview-header {
  margin-bottom: 16px;
}

.preview-header h2 {
  margin-bottom: 6px;
}

.preview-frame,
.preview-empty {
  width: 100%;
  min-height: 680px;
  border-radius: 20px;
}

.preview-frame {
  border: 1px solid rgba(148, 163, 184, 0.24);
  background: #fff;
}

.preview-empty {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 8px;
  border: 1px dashed rgba(148, 163, 184, 0.38);
  background: linear-gradient(135deg, rgba(236, 254, 255, 0.62), rgba(255, 255, 255, 0.96));
}

@media (max-width: 1080px) {
  .edit-page__content {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .edit-page {
    padding: 22px;
  }

  .edit-page__header {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
