<script setup lang="ts">
import { computed } from 'vue'
import { DeleteOutlined, EditOutlined, EyeOutlined, LinkOutlined, StarFilled } from '@ant-design/icons-vue'
import { formatRelativeDate, getAppCoverStyle, getAppTypeLabel } from '@/utils/app'

const props = withDefaults(
  defineProps<{
    app: API.AppVO
    showOwner?: boolean
    editable?: boolean
    deletable?: boolean
    featured?: boolean
  }>(),
  {
    showOwner: false,
    editable: false,
    deletable: false,
    featured: false,
  },
)

const emit = defineEmits<{
  open: [appId?: string]
  openDeploy: [deployKey?: string]
  edit: [appId?: string]
  delete: [appId?: string]
}>()

const coverStyle = computed(() => getAppCoverStyle(props.app.appName || String(props.app.id || '0')))
</script>

<template>
  <article class="app-card" @click="emit('open', app.id)">
    <div class="app-card__cover" :style="!app.cover ? coverStyle : undefined">
      <img v-if="app.cover" :src="app.cover" :alt="app.appName" class="app-card__image" />
      <div v-else class="app-card__placeholder">
        <div class="placeholder-chip">{{ getAppTypeLabel(app.codeGenType) }}</div>
        <div class="placeholder-title">{{ app.appName || '未命名应用' }}</div>
        <div class="placeholder-desc">{{ app.initPrompt || '等待更多描述来塑造页面内容与交互结构。' }}</div>
      </div>
    </div>

    <div class="app-card__body">
      <div class="app-card__meta">
        <div>
          <h3>{{ app.appName || '未命名应用' }}</h3>
          <p>{{ formatRelativeDate(app.createTime) }}</p>
        </div>
        <a-tag v-if="featured" color="gold">
          <template #icon>
            <StarFilled />
          </template>
          精选
        </a-tag>
      </div>

      <div class="app-card__tags">
        <a-tag color="processing">{{ getAppTypeLabel(app.codeGenType) }}</a-tag>
        <a-tag v-if="app.priority === 99" color="success">优先级 99</a-tag>
      </div>

      <p v-if="showOwner" class="app-card__owner">
        {{ app.user?.userName || '官方精选' }}
      </p>

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
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.78);
  color: #0f172a;
  font-size: 12px;
  font-weight: 600;
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

.app-card__meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.app-card__meta h3 {
  margin-bottom: 4px;
  font-size: 28px;
  line-height: 1.1;
}

.app-card__meta p,
.app-card__owner {
  color: #64748b;
}

.app-card__tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 14px;
}

.app-card__owner {
  margin-top: 10px;
  font-size: 14px;
}

.app-card__actions {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-top: 14px;
  margin-left: -8px;
}
</style>
