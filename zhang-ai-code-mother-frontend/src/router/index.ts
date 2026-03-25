import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/pages/HomePage.vue'),
      meta: {
        title: '首页',
        showInMenu: true,
        fullWidth: true,
      },
    },
    {
      path: '/user/login',
      name: 'userLogin',
      component: () => import('@/pages/user/UserLoginPage.vue'),
      meta: {
        title: '用户登录',
      },
    },
    {
      path: '/user/register',
      name: 'userRegister',
      component: () => import('@/pages/user/UserRegisterPage.vue'),
      meta: {
        title: '用户注册',
      },
    },
    {
      path: '/app/chat/:id',
      name: 'appChat',
      component: () => import('@/pages/app/AppChatPage.vue'),
      meta: {
        title: '应用生成',
        fullWidth: true,
        immersive: true,
        hideGlobalHeader: true,
        hideGlobalFooter: true,
      },
    },
    {
      path: '/app/edit/:id',
      name: 'appEdit',
      component: () => import('@/pages/app/AppEditPage.vue'),
      meta: {
        title: '应用信息',
        requiresAuth: true,
      },
    },
    {
      path: '/admin/userManage',
      name: 'adminUserManage',
      component: () => import('@/pages/admin/UserManagePage.vue'),
      meta: {
        title: '用户管理',
        showInMenu: true,
        requiresAdmin: true,
      },
    },
    {
      path: '/admin/appManage',
      name: 'adminAppManage',
      component: () => import('@/pages/admin/AppManagePage.vue'),
      meta: {
        title: '应用管理',
        showInMenu: true,
        requiresAdmin: true,
      },
    },
  ],
})

export default router
