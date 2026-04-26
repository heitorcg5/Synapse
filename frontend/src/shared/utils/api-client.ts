import axios, { AxiosError, type AxiosResponseHeaders, type RawAxiosResponseHeaders } from 'axios'
import i18n from '@/i18n/config'
import type { ErrorResponse } from '../types/auth.types'

const defaultApiUrl = (() => {
  if (typeof window === 'undefined') {
    return 'http://localhost:8080/api'
  }
  return `${window.location.protocol}//${window.location.hostname}:8080/api`
})()

const baseURL = import.meta.env.VITE_API_URL ?? defaultApiUrl

export const apiClient = axios.create({
  baseURL,
  timeout: 60000, // 60s for AI-heavy endpoints
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('synapse_token')
  const rawUrl = String(config.url ?? '')
  const isAuthEndpoint =
    rawUrl.includes('/auth/login') ||
    rawUrl.includes('/auth/register') ||
    rawUrl.includes('/auth/refresh')
  if (token && !isAuthEndpoint) {
    config.headers.Authorization = `Bearer ${token}`
  }
  const lang = i18n.language || 'en'
  config.headers['Accept-Language'] = lang.startsWith('es') ? 'es' : 'en'
  if (config.data instanceof FormData) {
    config.headers.delete('Content-Type')
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ErrorResponse>) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('synapse_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error) && error.response?.data?.message) {
    return error.response.data.message
  }
  return error instanceof Error ? error.message : 'An error occurred'
}

/** Best-effort filename from {@code Content-Disposition} (RFC 5987 / quoted). */
export function parseContentDispositionFilename(
  headers: RawAxiosResponseHeaders | AxiosResponseHeaders,
): string | null {
  const cd = headers['content-disposition']
  if (typeof cd !== 'string') return null
  const star = /filename\*=UTF-8''([^;\s]+)/i.exec(cd)
  if (star?.[1]) {
    try {
      return decodeURIComponent(star[1].replace(/"/g, ''))
    } catch {
      return star[1]
    }
  }
  const plain = /filename="([^"]+)"/i.exec(cd)
  return plain?.[1]?.trim() ?? null
}
