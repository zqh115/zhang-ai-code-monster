<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { addApp, deleteApp, listGoodAppVoByPage, listMyAppVoByPage } from '@/api/appController'
import AppCard from '@/components/AppCard.vue'
import { useLoginUserStore } from '@/stores/loginUser'
import { buildAppDeployUrl, DEFAULT_APP_PAGE_SIZE, MAX_USER_PAGE_SIZE } from '@/utils/app'

const router = useRouter()
const loginUserStore = useLoginUserStore()

const prompt = ref('')
const creating = ref(false)
const myLoading = ref(false)
const featuredLoading = ref(false)
const myApps = ref<API.AppVO[]>([])
const featuredApps = ref<API.AppVO[]>([])
const myTotal = ref(0)
const featuredTotal = ref(0)

const quickPrompts = [
  '帮我做一个企业官网，风格简洁高级',
  '创建一个个人博客，支持文章列表和详情页',
  '设计一个电商运营后台，突出数据看板',
  '做一个图片裁剪工具，支持常用尺寸导出',
]

const mySearchParams = reactive<API.AppQueryRequest>({
  pageNum: 1,
  pageSize: DEFAULT_APP_PAGE_SIZE,
  appName: '',
})

const featuredSearchParams = reactive<API.AppQueryRequest>({
  pageNum: 1,
  pageSize: DEFAULT_APP_PAGE_SIZE,
  appName: '',
})

const fetchMyApps = async () => {
  if (!loginUserStore.isLogin) {
    myApps.value = []
    myTotal.value = 0
    return
  }

  myLoading.value = true
  try {
    const res = await listMyAppVoByPage({
      ...mySearchParams,
      pageSize: Math.min(mySearchParams.pageSize ?? DEFAULT_APP_PAGE_SIZE, MAX_USER_PAGE_SIZE),
    })
    if (res.data.code === 0 && res.data.data) {
      myApps.value = res.data.data.records ?? []
      myTotal.value = res.data.data.totalRow ?? 0
      return
    }
    message.error(`获取我的应用失败，${res.data.message ?? '请稍后重试'}`)
  } finally {
    myLoading.value = false
  }
}

const fetchFeaturedApps = async () => {
  featuredLoading.value = true
  try {
    const res = await listGoodAppVoByPage({
      ...featuredSearchParams,
      pageSize: Math.min(featuredSearchParams.pageSize ?? DEFAULT_APP_PAGE_SIZE, MAX_USER_PAGE_SIZE),
    })
    if (res.data.code === 0 && res.data.data) {
      featuredApps.value = res.data.data.records ?? []
      featuredTotal.value = res.data.data.totalRow ?? 0
      return
    }
    message.error(`获取精选应用失败，${res.data.message ?? '请稍后重试'}`)
  } finally {
    featuredLoading.value = false
  }
}

const handleCreateApp = async (presetPrompt?: string) => {
  const finalPrompt = (presetPrompt ?? prompt.value).trim()
  if (!finalPrompt) {
    message.warning('先输入你想生成的应用描述')
    return
  }
  if (!loginUserStore.isLogin) {
    message.warning('登录后才能创建应用')
    await router.push(`/user/login?redirect=${encodeURIComponent('/')}`)
    return
  }

  creating.value = true
  try {
    const res = await addApp({
      initPrompt: finalPrompt,
    })
    if (res.data.code === 0 && res.data.data) {
      message.success('应用创建成功，正在进入生成页面')
      await router.push({
        name: 'appChat',
        params: {
          id: res.data.data,
        },
        query: {
          autoSend: '1',
          prompt: finalPrompt,
        },
      })
      return
    }
    message.error(`创建应用失败，${res.data.message ?? '请稍后重试'}`)
  } finally {
    creating.value = false
  }
}

const openChat = (appId?: string) => {
  if (!appId) {
    return
  }
  router.push({
    name: 'appChat',
    params: { id: appId },
    query: { view: '1' },
  })
}

const openDeploy = (deployKey?: string) => {
  const deployUrl = buildAppDeployUrl(deployKey)
  if (!deployUrl) {
    return
  }
  window.open(deployUrl, '_blank')
}

const openEdit = (appId?: string) => {
  if (!appId) {
    return
  }
  router.push({
    name: 'appEdit',
    params: { id: appId },
  })
}

const handleDelete = async (appId?: string) => {
  if (!appId) {
    return
  }
  const res = await deleteApp({ id: appId })
  if (res.data.code === 0) {
    message.success('应用已删除')
    fetchMyApps()
  } else {
    message.error(`删除失败，${res.data.message ?? '请稍后重试'}`)
  }
}

const handleMyPageChange = (page: number, pageSize: number) => {
  mySearchParams.pageNum = page
  mySearchParams.pageSize = pageSize
  fetchMyApps()
}

const handleFeaturedPageChange = (page: number, pageSize: number) => {
  featuredSearchParams.pageNum = page
  featuredSearchParams.pageSize = pageSize
  fetchFeaturedApps()
}

watch(
  () => loginUserStore.isLogin,
  (isLogin) => {
    if (isLogin) {
      fetchMyApps()
    } else {
      myApps.value = []
      myTotal.value = 0
    }
  },
  { immediate: true },
)

onMounted(() => {
  fetchFeaturedApps()
})
</script>

<template>
  <div class="home-page">
    <section class="hero-section">
      <div class="hero-noise"></div>
      <div class="hero-inner">
        <div class="hero-brand">
          <img src="@/assets/logo.png" alt="logo" class="hero-logo" />
          <span>一句话 · 呈所想</span>
        </div>
        <h1 class="hero-title">与 AI 对话，轻松创建应用和网站</h1>
        <p class="hero-subtitle">
          输入一句需求，自动创建应用、生成网页并实时展示效果。个人作品与精选案例都能在首页快速浏览。
        </p>

        <div class="prompt-panel">
          <a-textarea
            v-model:value="prompt"
            :auto-size="{ minRows: 5, maxRows: 8 }"
            placeholder="使用 NoCode 创建一个高效的小工具，帮助我计算、展示和管理数据……"
          />
          <div class="prompt-panel__footer">
            <div class="prompt-hints">
              <a-tag
                v-for="item in quickPrompts"
                :key="item"
                class="prompt-chip"
                @click="prompt = item"
              >
                {{ item }}
              </a-tag>
            </div>
            <a-button type="primary" size="large" :loading="creating" @click="handleCreateApp()">
              开始生成应用
            </a-button>
          </div>
        </div>
      </div>
    </section>

    <section class="content-shell">
      <div class="list-block page-shell">
        <div class="list-block__header">
          <div>
            <h2>我的应用</h2>
            <p>继续创作、编辑信息、删除应用，所有作品都能从这里快速进入。</p>
          </div>
          <div class="list-block__actions">
            <a-input-search
              v-model:value="mySearchParams.appName"
              placeholder="按应用名称搜索"
              allow-clear
              @search="() => { mySearchParams.pageNum = 1; fetchMyApps() }"
            />
          </div>
        </div>

        <template v-if="loginUserStore.isLogin">
          <a-spin :spinning="myLoading">
            <div v-if="myApps.length" class="app-grid">
              <AppCard
                v-for="app in myApps"
                :key="app.id"
                :app="app"
                editable
                deletable
                @open="openChat"
                @open-deploy="openDeploy"
                @edit="openEdit"
                @delete="handleDelete"
              />
            </div>
            <a-empty v-else description="你还没有应用，先从一句描述开始吧">
              <a-button type="primary" @click="handleCreateApp('创建一个个人博客，支持文章列表和详情页')">
                立即创建示例应用
              </a-button>
            </a-empty>
          </a-spin>
          <div class="pagination-wrap" v-if="myTotal > (mySearchParams.pageSize ?? DEFAULT_APP_PAGE_SIZE)">
            <a-pagination
              :current="mySearchParams.pageNum"
              :page-size="mySearchParams.pageSize"
              :total="myTotal"
              show-less-items
              @change="handleMyPageChange"
            />
          </div>
        </template>
        <template v-else>
          <div class="login-callout">
            <div>
              <h3>登录后即可保存和管理你的应用</h3>
              <p>创建应用、继续对话、修改名称和删除作品都需要登录后完成。</p>
            </div>
            <a-space>
              <a-button @click="router.push('/user/login')">去登录</a-button>
              <a-button type="primary" @click="router.push('/user/register')">注册账号</a-button>
            </a-space>
          </div>
        </template>
      </div>

      <div class="list-block page-shell">
        <div class="list-block__header">
          <div>
            <h2>精选应用</h2>
            <p>优先级更高的作品会展示在这里，方便浏览优秀案例和灵感方向。</p>
          </div>
          <div class="list-block__actions">
            <a-input-search
              v-model:value="featuredSearchParams.appName"
              placeholder="按应用名称搜索"
              allow-clear
              @search="() => { featuredSearchParams.pageNum = 1; fetchFeaturedApps() }"
            />
          </div>
        </div>

        <a-spin :spinning="featuredLoading">
          <div v-if="featuredApps.length" class="app-grid">
            <AppCard
              v-for="app in featuredApps"
              :key="app.id"
              :app="app"
              show-owner
              featured
              @open="openChat"
              @open-deploy="openDeploy"
            />
          </div>
          <a-empty v-else description="暂无精选应用" />
        </a-spin>

        <div class="pagination-wrap" v-if="featuredTotal > (featuredSearchParams.pageSize ?? DEFAULT_APP_PAGE_SIZE)">
          <a-pagination
            :current="featuredSearchParams.pageNum"
            :page-size="featuredSearchParams.pageSize"
            :total="featuredTotal"
            show-less-items
            @change="handleFeaturedPageChange"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home-page {
  padding-bottom: 48px;
}

.hero-section {
  position: relative;
  overflow: hidden;
  padding: 56px 24px 40px;
  min-height: 620px;
  background:
    radial-gradient(circle at 20% 20%, rgba(45, 212, 191, 0.26), transparent 30%),
    radial-gradient(circle at 80% 10%, rgba(96, 165, 250, 0.2), transparent 25%),
    linear-gradient(180deg, #f7fbff 0%, #f9fffe 48%, #ebfbff 100%);
}

.hero-noise {
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(rgba(148, 163, 184, 0.18) 0.7px, transparent 0.7px),
    radial-gradient(rgba(125, 211, 252, 0.14) 0.7px, transparent 0.7px);
  background-position: 0 0, 18px 18px;
  background-size: 36px 36px;
  opacity: 0.28;
  pointer-events: none;
}

.hero-inner {
  position: relative;
  z-index: 1;
  width: min(980px, 100%);
  margin: 0 auto;
  text-align: center;
}

.hero-brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 8px 16px;
  margin-bottom: 28px;
  border-radius: 999px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: rgba(255, 255, 255, 0.76);
  color: #0f172a;
  font-weight: 600;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.06);
}

.hero-logo {
  width: 34px;
  height: 34px;
  border-radius: 10px;
}

.hero-title {
  max-width: 780px;
  margin: 0 auto 18px;
  font-size: clamp(40px, 7vw, 72px);
  line-height: 1.02;
  letter-spacing: -0.04em;
}

.hero-subtitle {
  max-width: 700px;
  margin: 0 auto 32px;
  color: #64748b;
  font-size: clamp(16px, 2vw, 20px);
}

.prompt-panel {
  margin: 0 auto;
  padding: 18px;
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(226, 232, 240, 0.88);
  box-shadow: 0 28px 80px rgba(15, 23, 42, 0.08);
  text-align: left;
}

.prompt-panel :deep(.ant-input) {
  font-size: 20px;
  line-height: 1.7;
  padding: 12px 8px;
}

.prompt-panel__footer {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: flex-end;
  margin-top: 18px;
}

.prompt-hints {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.prompt-chip {
  padding: 7px 14px;
  border-radius: 999px;
  cursor: pointer;
  color: #334155;
  border-color: rgba(148, 163, 184, 0.32);
  background: white;
}

.content-shell {
  width: min(1280px, calc(100vw - 48px));
  margin: 0 auto;
  display: grid;
  gap: 28px;
}

.list-block {
  padding: 32px;
}

.list-block__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 20px;
  margin-bottom: 24px;
}

.list-block__header h2 {
  font-size: 38px;
  margin-bottom: 8px;
}

.list-block__header p {
  color: #64748b;
}

.list-block__actions {
  width: min(320px, 100%);
}

.app-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 24px;
}

.login-callout {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: center;
  padding: 28px;
  border-radius: 24px;
  background: linear-gradient(135deg, rgba(236, 254, 255, 0.9), rgba(255, 255, 255, 0.95));
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.login-callout h3 {
  margin-bottom: 6px;
  font-size: 24px;
}

.login-callout p {
  color: #64748b;
}

@media (max-width: 1080px) {
  .app-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .hero-section {
    padding: 36px 16px 28px;
    min-height: auto;
  }

  .content-shell {
    width: calc(100vw - 24px);
  }

  .list-block {
    padding: 22px;
  }

  .prompt-panel__footer,
  .list-block__header,
  .login-callout {
    flex-direction: column;
    align-items: stretch;
  }

  .app-grid {
    grid-template-columns: 1fr;
  }
}
</style>
