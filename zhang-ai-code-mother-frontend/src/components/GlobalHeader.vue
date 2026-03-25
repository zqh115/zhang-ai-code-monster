<template>
  <a-layout-header class="header">
    <div class="header-shell">
      <RouterLink to="/" class="brand-link">
        <div class="header-left">
          <img class="logo" src="@/assets/logo.png" alt="Logo" />
          <div>
            <div class="site-title">一句话 · 呈所想</div>
            <div class="site-subtitle">对话式创建应用和网站</div>
          </div>
        </div>
      </RouterLink>

      <a-menu
        v-model:selectedKeys="selectedKeys"
        mode="horizontal"
        :items="menuItems"
        class="nav-menu"
        @click="handleMenuClick"
      />

      <div class="user-login-status">
        <template v-if="loginUserStore.isLogin">
          <a-dropdown>
            <a-space class="user-trigger">
              <a-avatar :src="loginUserStore.loginUser.userAvatar">
                {{ (loginUserStore.loginUser.userName ?? '用').slice(0, 1) }}
              </a-avatar>
              <span class="user-name">{{ loginUserStore.loginUser.userName ?? '无名用户' }}</span>
            </a-space>
            <template #overlay>
              <a-menu>
                <a-menu-item @click="router.push('/')">返回首页</a-menu-item>
                <a-menu-item @click="doLogout">
                  <LogoutOutlined />
                  退出登录
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </template>
        <template v-else>
          <a-space>
            <a-button @click="router.push('/user/login')">登录</a-button>
            <a-button type="primary" @click="router.push('/user/register')">注册</a-button>
          </a-space>
        </template>
      </div>
    </div>
  </a-layout-header>
</template>

<script setup lang="ts">
import { computed, h, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { type MenuProps, message } from 'ant-design-vue'
import { HomeOutlined, LogoutOutlined } from '@ant-design/icons-vue'
import { useLoginUserStore } from '@/stores/loginUser.ts'
import { userLogout } from '@/api/userController.ts'

const loginUserStore = useLoginUserStore()
const router = useRouter()
const route = useRoute()
const selectedKeys = ref<string[]>([route.path])

const originItems = [
  {
    key: '/',
    icon: () => h(HomeOutlined),
    label: '首页',
    title: '首页',
  },
  {
    key: '/admin/userManage',
    label: '用户管理',
    title: '用户管理',
  },
  {
    key: '/admin/appManage',
    label: '应用管理',
    title: '应用管理',
  },
]

watch(
  () => route.path,
  (newPath) => {
    if (newPath.startsWith('/admin/userManage')) {
      selectedKeys.value = ['/admin/userManage']
      return
    }
    if (newPath.startsWith('/admin/appManage')) {
      selectedKeys.value = ['/admin/appManage']
      return
    }
    selectedKeys.value = ['/']
  },
  { immediate: true },
)

const filterMenus = (menus = [] as MenuProps['items']) => {
  return menus?.filter((menu) => {
    const menuKey = menu?.key as string
    if (menuKey?.startsWith('/admin')) {
      return loginUserStore.isAdmin
    }
    return true
  })
}

const menuItems = computed<MenuProps['items']>(() => filterMenus(originItems))

const handleMenuClick: MenuProps['onClick'] = (e) => {
  const key = e.key as string
  selectedKeys.value = [key]
  if (key.startsWith('/')) {
    router.push(key)
  }
}

const doLogout = async () => {
  const res = await userLogout()
  if (res.data.code === 0) {
    loginUserStore.setLoginUser({
      userName: '未登录',
    })
    message.success('退出登录成功')
    await router.push('/user/login')
  } else {
    message.error(`退出登录失败，${res.data.message ?? '请稍后重试'}`)
  }
}
</script>

<style scoped>
.header {
  position: sticky;
  top: 0;
  z-index: 20;
  height: auto;
  line-height: normal;
  padding: 16px 24px 0;
  background: transparent;
}

.header-shell {
  width: min(1200px, 100%);
  margin: 0 auto;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 20px;
  padding: 14px 18px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(18px);
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.06);
}

.brand-link {
  color: inherit;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.logo {
  height: 46px;
  width: 46px;
  border-radius: 14px;
  box-shadow: 0 12px 30px rgba(45, 212, 191, 0.22);
}

.site-title {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.site-subtitle {
  color: #64748b;
  font-size: 12px;
}

.nav-menu {
  min-width: 0;
  border-bottom: none !important;
  background: transparent;
}

.user-login-status {
  display: flex;
  align-items: center;
}

.user-trigger {
  padding: 6px 10px;
  border-radius: 999px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.user-trigger:hover {
  background: rgba(15, 23, 42, 0.04);
}

.user-name {
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #0f172a;
  font-weight: 500;
}

@media (max-width: 960px) {
  .header {
    padding: 12px 16px 0;
  }

  .header-shell {
    grid-template-columns: 1fr;
    justify-items: stretch;
  }

  .nav-menu {
    order: 3;
  }

  .user-login-status {
    justify-content: flex-end;
  }
}
</style>
