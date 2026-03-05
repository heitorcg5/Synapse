import { apiClient } from '@/shared/utils/api-client'
import type {
  ContentResponse,
  SummaryResponse,
  TagResponse,
  CreateContentRequest,
} from '@/shared/types/api'

export const contentApi = {
  list: () => apiClient.get<ContentResponse[]>('/content/user'),

  getById: (id: string) =>
    apiClient.get<ContentResponse>(`/content/${id}`),

  create: (data: CreateContentRequest) =>
    apiClient.post<ContentResponse>('/content', data),

  delete: (id: string) =>
    apiClient.delete(`/content/${id}`),

  getSummary: (contentId: string) =>
    apiClient.get<SummaryResponse>(`/content/${contentId}/summary`),

  getTags: (contentId: string) =>
    apiClient.get<TagResponse[]>(`/content/${contentId}/tags`),
}
