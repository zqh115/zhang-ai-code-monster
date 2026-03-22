<script setup lang="ts">
import BasicLayout from '@/layouts/BasicLayout.vue'

import { health } from '@/api/health.ts'
import { useLoginUserStore } from '@/stores/loginUser.ts'
import '@/access'

const loginUserStore = useLoginUserStore()
loginUserStore.fetchLoginUser()


health().then((res) => {
  console.log(res)
})
</script>

<template>
  <BasicLayout />
</template>

<style>
</style>
