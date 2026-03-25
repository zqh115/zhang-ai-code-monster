<script setup lang="ts">
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import AuthCard from '@/components/AuthCard.vue'
import { userRegister } from '@/api/userController'

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
    await router.push('/user/login')
    return
  }
  message.error(`注册失败，${res.data.message ?? '请稍后重试'}`)
}
</script>

<template>
  <AuthCard
    brand="快速开始"
    title="注册账号"
    description="注册后即可创建应用、保存作品，并体验完整的用户工作流。"
    variant="indigo"
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
  </AuthCard>
</template>

<style scoped>
.tips {
  margin-bottom: 16px;
  color: #64748b;
  text-align: right;
}

.tips a {
  color: #3730a3;
}
</style>
