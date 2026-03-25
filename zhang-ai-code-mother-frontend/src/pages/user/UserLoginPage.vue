<script setup lang="ts">
import { reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import AuthCard from '@/components/AuthCard.vue'
import { userLogin } from '@/api/userController'
import { useLoginUserStore } from '@/stores/loginUser'

const route = useRoute()
const router = useRouter()
const loginUserStore = useLoginUserStore()

const formState = reactive<API.UserLoginRequest>({
  userAccount: '',
  userPassword: '',
})

const handleSubmit = async (values: API.UserLoginRequest) => {
  const res = await userLogin(values)
  if (res.data.code === 0 && res.data.data) {
    await loginUserStore.fetchLoginUser()
    message.success('登录成功')
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    await router.push(redirect || '/')
    return
  }
  message.error(`登录失败，${res.data.message ?? '请检查账号密码'}`)
}
</script>

<template>
  <AuthCard
    brand="一句话 · 即刻成站"
    title="登录账号"
    description="登录后即可创建应用、继续对话，并管理自己的作品。"
    variant="teal"
  >
    <a-form :model="formState" layout="vertical" autocomplete="off" @finish="handleSubmit">
      <a-form-item name="userAccount" label="账号" :rules="[{ required: true, message: '请输入账号' }]">
        <a-input v-model:value="formState.userAccount" placeholder="请输入账号" size="large" />
      </a-form-item>
      <a-form-item
        name="userPassword"
        label="密码"
        :rules="[
          { required: true, message: '请输入密码' },
          { min: 8, message: '密码长度不能少于 8 位' },
        ]"
      >
        <a-input-password v-model:value="formState.userPassword" placeholder="请输入密码" size="large" />
      </a-form-item>
      <div class="tips">
        还没有账号？
        <RouterLink to="/user/register">去注册</RouterLink>
      </div>
      <a-button type="primary" html-type="submit" size="large" block>登录</a-button>
    </a-form>
  </AuthCard>
</template>

<style scoped>
.tips {
  margin-bottom: 16px;
  color: #64748b;
  text-align: right;
}

.tips a {
  color: #0f766e;
}
</style>
