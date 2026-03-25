import { message } from 'ant-design-vue'
import router from '@/router'
import { useLoginUserStore } from '@/stores/loginUser'

let firstFetchLoginUser = true

router.beforeEach(async (to, from, next) => {
  const loginUserStore = useLoginUserStore()

  if (firstFetchLoginUser) {
    await loginUserStore.fetchLoginUser()
    firstFetchLoginUser = false
  }

  const loginUser = loginUserStore.loginUser
  const requiresAuth = Boolean(to.meta.requiresAuth || to.meta.requiresAdmin)
  const requiresAdmin = Boolean(to.meta.requiresAdmin)

  if (requiresAuth && !loginUser?.id) {
    message.warning('请先登录后继续操作')
    next(`/user/login?redirect=${encodeURIComponent(to.fullPath)}`)
    return
  }

  if (requiresAdmin && loginUser?.userRole !== 'admin') {
    message.error('当前账号没有访问该页面的权限')
    next('/')
    return
  }

  next()
})
