<script setup lang="ts">
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { userRegister } from '@/api/userController.ts'

const router = useRouter()

const formState = reactive<API.UserRegisterRequest>({
  userAccount: '',
  userPassword: '',
  checkPassword: '',
})

const validateCheckPassword = async () => {
  if (formState.checkPassword && formState.checkPassword !== formState.userPassword) {
    return Promise.reject('两次输入的密码不一致')
  }
  return Promise.resolve()
}

const handleSubmit = async (values: API.UserRegisterRequest) => {
  const res = await userRegister(values)
  if (res.data.code === 0) {
    message.success('注册成功，请登录')
    router.push('/user/login')
  } else {
    message.error(`注册失败，${res.data.message ?? '请稍后重试'}`)
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card page-shell">
      <div class="auth-brand">快速开始</div>
      <h1>注册账号</h1>
      <p>注册后即可创建应用、保存作品，并体验管理员外的完整用户流程。</p>

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
        <a-form-item
          name="checkPassword"
          label="确认密码"
          :rules="[
            { required: true, message: '请再次输入密码' },
            { min: 8, message: '密码长度不能少于 8 位' },
            { validator: validateCheckPassword },
          ]"
        >
          <a-input-password v-model:value="formState.checkPassword" placeholder="请再次输入密码" size="large" />
        </a-form-item>
        <div class="tips">
          已有账号？
          <RouterLink to="/user/login">去登录</RouterLink>
        </div>
        <a-button type="primary" html-type="submit" size="large" block>注册</a-button>
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
  background: rgba(224, 231, 255, 0.9);
  color: #3730a3;
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
  color: #3730a3;
}
</style>
