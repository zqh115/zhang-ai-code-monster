import axios from 'axios'
import { message } from 'ant-design-vue'

const DEFAULT_API_BASE_URL = '/api'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL

export const API_ORIGIN = (() => {
  if (/^https?:\/\//i.test(API_BASE_URL)) {
    return API_BASE_URL.replace(/\/api\/?$/, '')
  }
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  return ''
})()

const myAxios = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  withCredentials: true,
})

myAxios.interceptors.request.use(
  function (config) {
    return config
  },
  function (error) {
    return Promise.reject(error)
  },
)

myAxios.interceptors.response.use(
  function (response) {
    const { data } = response
    if (data.code === 40100) {
      if (
        !response.request.responseURL.includes('user/getCurrentUser') &&
        !window.location.pathname.includes('/user/login')
      ) {
        message.warning('请先登录')
        const redirect = encodeURIComponent(window.location.pathname + window.location.search)
        window.location.href = `/user/login?redirect=${redirect}`
      }
    }
    return response
  },
  function (error) {
    return Promise.reject(error)
  },
)

export default myAxios
