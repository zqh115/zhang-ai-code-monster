<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    brand: string
    title: string
    description: string
    variant?: 'teal' | 'indigo'
  }>(),
  {
    variant: 'teal',
  },
)

const variantClass = `auth-brand--${props.variant}`
</script>

<template>
  <div class="auth-page">
    <div class="auth-card page-shell">
      <div class="auth-brand" :class="variantClass">{{ brand }}</div>
      <h1>{{ title }}</h1>
      <p>{{ description }}</p>
      <slot />
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
  font-weight: 700;
}

.auth-brand--teal {
  background: rgba(204, 251, 241, 0.8);
  color: #0f766e;
}

.auth-brand--indigo {
  background: rgba(224, 231, 255, 0.9);
  color: #3730a3;
}

.auth-card h1 {
  margin-bottom: 8px;
  font-size: 36px;
}

.auth-card p {
  margin-bottom: 24px;
  color: #64748b;
}
</style>
