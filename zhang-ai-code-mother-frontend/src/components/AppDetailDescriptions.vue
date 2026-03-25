<script setup lang="ts">
import { computed } from 'vue'
import { formatDateTime, getAppTypeLabel } from '@/utils/app'

const props = defineProps<{
  app?: API.AppVO
}>()

const items = computed(() => [
  { label: '应用 ID', value: props.app?.id ?? '--' },
  { label: '代码类型', value: getAppTypeLabel(props.app?.codeGenType) },
  { label: '创建者', value: props.app?.user?.userName || '未知用户' },
  { label: '部署 Key', value: props.app?.deployKey || '--' },
  { label: '创建时间', value: formatDateTime(props.app?.createTime) },
])
</script>

<template>
  <div class="meta-list">
    <div v-for="item in items" :key="item.label" class="meta-item">
      <span>{{ item.label }}</span>
      <strong>{{ item.value }}</strong>
    </div>
    <div class="meta-item meta-item--column">
      <span>初始提示词</span>
      <strong>{{ app?.initPrompt || '--' }}</strong>
    </div>
  </div>
</template>

<style scoped>
.meta-list {
  display: grid;
  gap: 14px;
  margin-top: 24px;
}

.meta-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px dashed rgba(148, 163, 184, 0.28);
}

.meta-item span {
  color: #64748b;
}

.meta-item strong {
  text-align: right;
}

.meta-item--column {
  flex-direction: column;
}
</style>
