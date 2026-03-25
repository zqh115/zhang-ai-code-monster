<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    title: string
    description?: string
    src?: string
    iframeTitle?: string
    loading?: boolean
    emptyTitle?: string
    emptyDescription?: string
    fullHeight?: boolean
    minHeight?: string
  }>(),
  {
    description: '',
    src: '',
    iframeTitle: '应用预览',
    loading: false,
    emptyTitle: '暂无预览内容',
    emptyDescription: '生成完成后，这里会展示最新的应用效果。',
    fullHeight: false,
    minHeight: '520px',
  },
)

const panelClass = computed(() => ['app-preview-panel page-shell', { 'app-preview-panel--full': props.fullHeight }])
const contentStyle = computed(() => ({ minHeight: props.minHeight }))
</script>

<template>
  <section :class="panelClass">
    <div class="app-preview-panel__header">
      <div>
        <h2>{{ title }}</h2>
        <p v-if="description">{{ description }}</p>
      </div>
      <div v-if="$slots.actions" class="app-preview-panel__actions">
        <slot name="actions" />
      </div>
    </div>

    <div class="app-preview-panel__body">
      <a-spin :spinning="loading">
        <iframe
          v-if="src"
          :src="src"
          :title="iframeTitle"
          class="app-preview-panel__frame"
          :style="contentStyle"
        />
        <div v-else class="app-preview-panel__empty" :style="contentStyle">
          <h3>{{ emptyTitle }}</h3>
          <p>{{ emptyDescription }}</p>
        </div>
      </a-spin>
    </div>
  </section>
</template>

<style scoped>
.app-preview-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.app-preview-panel--full {
  height: 100%;
}

.app-preview-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  padding: 22px 22px 0;
}

.app-preview-panel__header h2 {
  margin-bottom: 6px;
  font-size: 26px;
}

.app-preview-panel__header p {
  color: #64748b;
}

.app-preview-panel__actions {
  flex-shrink: 0;
  display: flex;
  gap: 12px;
}

.app-preview-panel__body {
  flex: 1;
  min-height: 0;
  padding: 22px;
  overflow: hidden;
}

.app-preview-panel__body :deep(.ant-spin-nested-loading),
.app-preview-panel__body :deep(.ant-spin-container) {
  height: 100%;
}

.app-preview-panel__frame {
  width: 100%;
  height: 100%;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 24px;
  background: #fff;
}

.app-preview-panel__empty {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 100%;
  border-radius: 24px;
  border: 1px dashed rgba(148, 163, 184, 0.4);
  background: linear-gradient(135deg, rgba(236, 254, 255, 0.62), rgba(255, 255, 255, 0.96));
  text-align: center;
}

.app-preview-panel__empty p {
  max-width: 380px;
  color: #64748b;
}

@media (max-width: 768px) {
  .app-preview-panel__header {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
