<script setup lang="ts">
import { computed } from 'vue'
import { DeleteOutlined, EditOutlined, EyeOutlined, LinkOutlined, StarFilled } from '@ant-design/icons-vue'
import { type EntityId, formatRelativeDate, getAppCoverStyle, getAppTypeMeta } from '@/utils/app'

const props = withDefaults(
  defineProps<{
    app: API.AppVO
    editable?: boolean
    deletable?: boolean
    featured?: boolean
  }>(),
  {
    editable: false,
    deletable: false,
    featured: false,
  },
)

const emit = defineEmits<{
  (event: 'open', appId?: EntityId): void
  (event: 'openDeploy', deployKey?: string): void
  (event: 'edit', appId?: EntityId): void
  (event: 'delete', appId?: EntityId): void
}>()

const coverStyle = computed(() => getAppCoverStyle(props.app.appName || String(props.app.id || '0')))
const appTitle = computed(() => props.app.appName || '未命名应用')
const ownerName = computed(() => props.app.user?.userName || '官方精选')
const ownerInitial = computed(() => ownerName.value.slice(0, 1).toUpperCase())
const isFeatured = computed(() => props.featured || props.app.priority === 99)
const appTypeMeta = computed(() => getAppTypeMeta(props.app.codeGenType))
const appTypeStyle = computed(() => ({
  background: appTypeMeta.value.background,
  color: appTypeMeta.value.color,
  borderColor: appTypeMeta.value.borderColor,
  boxShadow: `inset 0 1px 0 rgba(255, 255, 255, 0.42), 0 8px 18px ${appTypeMeta.value.shadowColor}`,
}))
const placeholderDescription = computed(
  () => props.app.initPrompt || '等待更多描述来丰富页面内容和交互结构。',
)
</script>

<template>
  <article class="app-card" @click="emit('open', app.id)">
    <div class="app-card__cover" :style="!app.cover ? coverStyle : undefined">
      <img v-if="app.cover" :src="app.cover" :alt="appTitle" class="app-card__image" />
      <div v-else class="app-card__placeholder">
        <div class="placeholder-chip" :style="appTypeStyle">{{ appTypeMeta.label }}</div>
        <div class="placeholder-title">{{ appTitle }}</div>
        <div class="placeholder-desc">{{ placeholderDescription }}</div>
      </div>
    </div>

    <div class="app-card__body">
      <div class="app-card__info">
        <a-avatar :src="app.user?.userAvatar" :size="56" class="app-card__avatar">
          {{ ownerInitial }}
        </a-avatar>

        <div class="app-card__meta">
          <div class="app-card__meta-main">
            <h3>{{ appTitle }}</h3>
            <p class="app-card__owner">{{ ownerName }}</p>
          </div>

          <div class="app-card__badges">
            <span class="app-type-badge" :style="appTypeStyle">{{ appTypeMeta.label }}</span>
            <a-tag v-if="isFeatured" color="gold">
              <template #icon>
                <StarFilled />
              </template>
              精选
            </a-tag>
          </div>
        </div>
      </div>

      <div class="app-card__tags">
        <a-tag v-if="app.createTime" color="default">{{ formatRelativeDate(app.createTime) }}</a-tag>
      </div>

      <div class="app-card__actions">
        <a-button type="link" @click.stop="emit('open', app.id)">
          <EyeOutlined />
          查看对话
        </a-button>
        <a-button v-if="app.deployKey" type="link" @click.stop="emit('openDeploy', app.deployKey)">
          <LinkOutlined />
          查看应用
        </a-button>
        <a-button v-if="editable" type="link" @click.stop="emit('edit', app.id)">
          <EditOutlined />
          编辑
        </a-button>
        <a-popconfirm
          v-if="deletable"
          title="确认删除这个应用吗？"
          ok-text="删除"
          cancel-text="取消"
          @confirm="emit('delete', app.id)"
        >
          <a-button danger type="link" @click.stop>
            <DeleteOutlined />
            删除
          </a-button>
        </a-popconfirm>
      </div>
    </div>
  </article>
</template>

<style scoped>
.app-card {
  overflow: hidden;
  border-radius: 24px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  background: #fff;
  box-shadow: 0 12px 34px rgba(15, 23, 42, 0.06);
  cursor: pointer;
  transition:
    transform 0.22s ease,
    box-shadow 0.22s ease;
}

.app-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.1);
}

.app-card__cover {
  position: relative;
  aspect-ratio: 16 / 10;
  overflow: hidden;
}

.app-card__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.app-card__placeholder {
  display: flex;
  height: 100%;
  flex-direction: column;
  justify-content: flex-end;
  gap: 10px;
  padding: 20px;
}

.placeholder-chip {
  width: fit-content;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid transparent;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.placeholder-title {
  font-size: 24px;
  font-weight: 700;
  color: #0f172a;
}

.placeholder-desc {
  display: -webkit-box;
  overflow: hidden;
  color: #334155;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.app-card__body {
  padding: 18px 18px 14px;
}

.app-card__info {
  display: flex;
  gap: 14px;
  align-items: center;
}

.app-card__avatar {
  flex-shrink: 0;
  background: linear-gradient(135deg, #14b8a6, #38bdf8);
  color: #fff;
  font-size: 22px;
  font-weight: 700;
}

.app-card__meta {
  display: flex;
  flex: 1;
  min-width: 0;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.app-card__meta-main {
  min-width: 0;
  flex: 1;
}

.app-card__meta h3 {
  margin-bottom: 6px;
  font-size: 28px;
  line-height: 1.1;
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.app-card__owner {
  margin: 0;
  color: #64748b;
  font-size: 15px;
  font-weight: 500;
}

.app-card__badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.app-type-badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid transparent;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
}

.app-card__tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 12px;
}

.app-card__actions {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-top: 14px;
  margin-left: -8px;
}

@media (max-width: 768px) {
  .app-card__meta {
    flex-direction: column;
    align-items: flex-start;
  }

  .app-card__badges {
    justify-content: flex-start;
  }

  .app-card__meta h3 {
    font-size: 24px;
  }
}
</style>
