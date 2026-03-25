<template>
  <a-layout class="basic-layout">
    <GlobalHeader v-if="!route.meta.hideGlobalHeader" />
    <a-layout-content
      :class="[
        'main-content',
        {
          'main-content--wide': route.meta.fullWidth,
          'main-content--immersive': route.meta.immersive,
        },
      ]"
    >
      <router-view />
    </a-layout-content>
    <GlobalFooter v-if="!route.meta.hideGlobalFooter" />
  </a-layout>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import GlobalHeader from '@/components/GlobalHeader.vue'
import GlobalFooter from '@/components/GlobalFooter.vue'

const route = useRoute()
</script>

<style scoped>
.basic-layout {
  min-height: 100vh;
  background:
    radial-gradient(circle at top right, rgba(84, 214, 232, 0.2), transparent 30%),
    linear-gradient(180deg, #f6fbff 0%, #ffffff 22%, #f8fbff 100%);
}

.main-content {
  width: min(1200px, calc(100vw - 48px));
  margin: 24px auto 48px;
  padding: 0;
}

.main-content--wide {
  width: 100%;
  margin: 0;
}

.main-content--immersive {
  min-height: 100vh;
  margin: 0;
}
</style>
