<script setup lang="ts">
import { reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { userLogin } from '@/api/userController.ts'
import { useLoginUserStore } from '@/stores/loginUser.ts'

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
    router.push(redirect || '/')
  } else {
    message.error(`登录失败，${res.data.message ?? '请检查账号密码'}`)
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card page-shell">
      <div class="auth-brand">一句话 · 呈所想</div>
      <h1>登录账号</h1>
      <p>登录后即可创建应用、继续对话并管理自己的作品。</p>

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
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: calc(100vh - 220px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.auth-card {
  width: min(460px, 100%);
  padding: 36px;
}

.auth-brand {
  width: fit-content;
  padding: 6px 12px;
  margin-bottom: 18px;
  border-radius: 999px;
  background: rgba(204, 251, 241, 0.8);
  color: #0f766e;
  font-weight: 700;
}

.auth-card h1 {
  margin-bottom: 8px;
  font-size: 36px;
}

.auth-card p {
  margin-bottom: 24px;
  color: #64748b;
}

.tips {
  margin-bottom: 16px;
  color: #64748b;
  text-align: right;
}

.tips a {
  color: #0f766e;
}
</style>
