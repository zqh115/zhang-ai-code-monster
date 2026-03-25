import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getCurrentUser } from '@/api/userController.ts'

export const useLoginUserStore = defineStore('loginUser', () => {
  const loginUser = ref<API.LoginUserVO>({
    userName: '未登录',
  })

  async function fetchLoginUser() {
    try {
      const res = await getCurrentUser()
      if (res.data.code === 0 && res.data.data) {
        loginUser.value = res.data.data
        return
      }
    } catch (error) {
      console.warn('fetchLoginUser failed', error)
    }

    loginUser.value = {
      userName: '未登录',
    }
  }

  function setLoginUser(newLoginUser: API.LoginUserVO) {
    loginUser.value = newLoginUser
  }

  const isLogin = computed(() => Boolean(loginUser.value?.id))
  const isAdmin = computed(() => loginUser.value?.userRole === 'admin')

  return { loginUser, setLoginUser, fetchLoginUser, isLogin, isAdmin }
})
