import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'
import { API_ORIGIN } from '@/request'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

export const DEFAULT_APP_PAGE_SIZE = 6
export const MAX_USER_PAGE_SIZE = 20

const trimTrailingSlashes = (value: string) => value.replace(/\/+$/, '')

const getDefaultDeployBaseUrl = () => {
  if (typeof window === 'undefined') {
    return 'http://localhost'
  }
  const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:'
  return `${protocol}//localhost`
}

export const APP_PREVIEW_BASE_URL = trimTrailingSlashes(
  import.meta.env.VITE_APP_PREVIEW_BASE_URL ?? API_ORIGIN,
)

export const APP_DEPLOY_BASE_URL = trimTrailingSlashes(
  import.meta.env.VITE_APP_DEPLOY_BASE_URL ?? getDefaultDeployBaseUrl(),
)

export function buildLocalPreviewUrl(appId: string, codeGenType?: string) {
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
