<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import AppDetailDescriptions from '@/components/AppDetailDescriptions.vue'
import AppPreviewPanel from '@/components/AppPreviewPanel.vue'
import PageHeader from '@/components/PageHeader.vue'
import { getAppVoById, getAppVoByIdByAdmin, updateApp, updateAppByAdmin } from '@/api/appController'
import { useLoginUserStore } from '@/stores/loginUser'
import { buildLocalPreviewUrl, hasEntityId, isSameEntityId, normalizeEntityId } from '@/utils/app'

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

const appId = computed(() => normalizeEntityId(route.params.id))
const isAdmin = computed(() => loginUserStore.isAdmin)
const previewUrl = computed(() =>
  appDetail.value?.id ? buildLocalPreviewUrl(appDetail.value.id, appDetail.value.codeGenType) : '',
)

const fetchDetail = async () => {
  if (!hasEntityId(appId.value)) {
    message.error('应用 ID 无效')
    await router.replace('/')
    return
  }

  loading.value = true
  try {
    const res = isAdmin.value
      ? await getAppVoByIdByAdmin({ id: appId.value })
      : await getAppVoById({ id: appId.value })

    if (res.data.code === 0 && res.data.data) {
      const app = res.data.data
      if (hasEntityId(app.userId) && !isSameEntityId(app.userId, loginUserStore.loginUser.id) && !isAdmin.value) {
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
  if (!hasEntityId(formState.id)) {
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
  void fetchDetail()
})
</script>

<template>
  <div class="edit-page page-shell">
    <PageHeader title="应用信息修改" subtitle="普通用户当前支持修改应用名称；管理员还可以调整封面与优先级。">
      <template #actions>
        <a-space>
          <a-button @click="router.push({ name: 'appChat', params: { id: appId } })">进入对话页</a-button>
          <a-button type="primary" :loading="saving" @click="handleSubmit">保存修改</a-button>
        </a-space>
      </template>
    </PageHeader>

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

          <AppDetailDescriptions :app="appDetail" />
        </section>

        <AppPreviewPanel
          class="edit-preview"
          title="网页预览"
          description="生成完成后，这里会直接加载当前应用的预览结果。"
          :src="previewUrl"
          iframe-title="应用预览"
          empty-title="暂无预览内容"
          empty-description="可以先进入对话页生成应用，再回到这里完善应用信息。"
          min-height="680px"
        />
      </div>
    </a-spin>
  </div>
</template>

<style scoped>
.edit-page {
  padding: 32px;
}

.edit-page__content {
  display: grid;
  grid-template-columns: 420px minmax(0, 1fr);
  gap: 24px;
}

.edit-form {
  padding: 24px;
  border-radius: 24px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(255, 255, 255, 0.84);
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
}
</style>
