import axios, { AxiosError } from 'axios'
import i18n from '@/i18n/config'
import type { ErrorResponse } from '../types/api'

const baseURL = import.meta.env.VITE_API_URL ?? '/api'

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('synapse_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  const lang = i18n.language || 'en'
  config.headers['Accept-Language'] = lang.startsWith('es') ? 'es' : 'en'
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
