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
  return `${APP_PREVIEW_BASE_URL}/static/${codeGenType}_${appId}/?t=${Date.now()}`
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
  const typeMap: Record<string, string> = {
    html: 'HTML',
    react: 'React',
    vue: 'Vue',
    vue_project: 'Vue',
  }
  return typeMap[codeGenType ?? ''] ?? (codeGenType || 'Web')
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
