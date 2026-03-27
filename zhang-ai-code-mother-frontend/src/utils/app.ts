import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import { API_BASE_URL, API_ORIGIN } from '@/request'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

export const DEFAULT_APP_PAGE_SIZE = 6
export const MAX_USER_PAGE_SIZE = 20

const trimTrailingSlashes = (value: string) => value.replace(/\/+$/, '')

const ensureApiSuffix = (value: string) => {
  const normalizedValue = trimTrailingSlashes(value)
  return normalizedValue.endsWith('/api') ? normalizedValue : `${normalizedValue}/api`
}

const getDefaultDeployBaseUrl = () => {
  if (typeof window === 'undefined') {
    return 'http://localhost'
  }
  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:'
  return `${protocol}//localhost`
}

export const APP_PREVIEW_BASE_URL = ensureApiSuffix(
  import.meta.env.VITE_APP_PREVIEW_BASE_URL ?? API_BASE_URL ?? API_ORIGIN,
)

export const APP_DEPLOY_BASE_URL = trimTrailingSlashes(
  import.meta.env.VITE_APP_DEPLOY_BASE_URL ?? getDefaultDeployBaseUrl(),
)

export type EntityId = string | number
export type EntityIdInput = EntityId | readonly string[]

export function normalizeEntityId(id?: EntityIdInput | null) {
  if (id === undefined || id === null) {
    return ''
  }
  if (Array.isArray(id)) {
    return normalizeEntityId(id[0])
  }
  return String(id).trim()
}

export function hasEntityId(id?: EntityIdInput | null) {
  return normalizeEntityId(id).length > 0
}

export function isSameEntityId(left?: EntityIdInput | null, right?: EntityIdInput | null) {
  const normalizedLeft = normalizeEntityId(left)
  const normalizedRight = normalizeEntityId(right)
  return normalizedLeft.length > 0 && normalizedLeft === normalizedRight
}

export function buildLocalPreviewUrl(appId: string | number, codeGenType?: string) {
  if (!codeGenType) {
    return ''
  }

  const basePreviewUrl = `${APP_PREVIEW_BASE_URL}/static/${codeGenType}_${appId}/`
  const previewEntry = codeGenType === 'vue_project' ? 'dist/index.html' : ''
  return `${basePreviewUrl}${previewEntry}?t=${Date.now()}`
}

export function buildAppDeployUrl(deployKey?: string) {
  const normalizedDeployKey = deployKey?.trim()
  if (!normalizedDeployKey) {
    return ''
  }
  return `${APP_DEPLOY_BASE_URL}/${normalizedDeployKey}`
}

export function formatDateTime(dateTime?: string) {
  if (!dateTime) {
    return '--'
  }
  return dayjs(dateTime).format('YYYY-MM-DD HH:mm:ss')
}

export function formatRelativeDate(dateTime?: string) {
  if (!dateTime) {
    return '刚刚'
  }
  return dayjs(dateTime).fromNow()
}

export function getAppTypeLabel(codeGenType?: string) {
  return getAppTypeMeta(codeGenType).label
}

export function getAppTypeMeta(codeGenType?: string) {
  const typeMap: Record<
    string,
    {
      label: string
      background: string
      color: string
      borderColor: string
      shadowColor: string
    }
  > = {
    html: {
      label: '原生 HTML 项目',
      background: 'linear-gradient(135deg, rgba(255, 247, 237, 0.98), rgba(255, 237, 213, 0.96))',
      color: '#c2410c',
      borderColor: 'rgba(249, 115, 22, 0.26)',
      shadowColor: 'rgba(249, 115, 22, 0.12)',
    },
    multi_file: {
      label: '原生多文件项目',
      background: 'linear-gradient(135deg, rgba(239, 246, 255, 0.98), rgba(219, 234, 254, 0.96))',
      color: '#2563eb',
      borderColor: 'rgba(59, 130, 246, 0.24)',
      shadowColor: 'rgba(59, 130, 246, 0.14)',
    },
    vue: {
      label: 'Vue 项目',
      background: 'linear-gradient(135deg, rgba(236, 253, 245, 0.98), rgba(209, 250, 229, 0.96))',
      color: '#047857',
      borderColor: 'rgba(16, 185, 129, 0.24)',
      shadowColor: 'rgba(16, 185, 129, 0.14)',
    },
    vue_project: {
      label: 'Vue 项目',
      background: 'linear-gradient(135deg, rgba(236, 253, 245, 0.98), rgba(209, 250, 229, 0.96))',
      color: '#047857',
      borderColor: 'rgba(16, 185, 129, 0.24)',
      shadowColor: 'rgba(16, 185, 129, 0.14)',
    },
  }

  return (
    typeMap[codeGenType ?? ''] ?? {
      label: codeGenType || 'Web 项目',
      background: 'linear-gradient(135deg, rgba(248, 250, 252, 0.98), rgba(241, 245, 249, 0.96))',
      color: '#475569',
      borderColor: 'rgba(148, 163, 184, 0.24)',
      shadowColor: 'rgba(148, 163, 184, 0.12)',
    }
  )
}

export function getAppCoverStyle(seed = '') {
  const colorSets: [string, string, string][] = [
    ['#dff7f4', '#f8fdff', '#7dd3fc'],
    ['#fef3c7', '#fff9eb', '#f59e0b'],
    ['#e0f2fe', '#f8fafc', '#38bdf8'],
    ['#ede9fe', '#f8f7ff', '#8b5cf6'],
    ['#dcfce7', '#f7fff9', '#22c55e'],
  ]
  const [start, middle, end] =
    colorSets[seed.length % colorSets.length] ?? ['#dff7f4', '#f8fdff', '#7dd3fc']
  return {
    background: `linear-gradient(135deg, ${start} 0%, ${middle} 55%, ${end} 140%)`,
  }
}
