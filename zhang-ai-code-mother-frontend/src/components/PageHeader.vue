<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
}>()
</script>

<template>
  <div class="page-header">
    <div class="page-header__content">
      <h1 class="page-title">{{ title }}</h1>
      <p v-if="subtitle" class="page-subtitle">{{ subtitle }}</p>
    </div>

    <div v-if="$slots.actions" class="page-header__actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 24px;
}

.page-header__content {
  min-width: 0;
}

.page-header__actions {
  display: flex;
  flex-shrink: 0;
  gap: 12px;
}

@media (max-width: 768px) {
  .page-header,
  .page-header__actions {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
