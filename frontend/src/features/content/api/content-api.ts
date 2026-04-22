import { apiClient } from '@/shared/utils/api-client'
import type {
  ContentResponse,
  SummaryResponse,
  TagResponse,
  CreateContentRequest,
  AiPreviewResponse,
  ConfirmContentRequest,
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

  aiPreview: (contentId: string) =>
    apiClient.post<AiPreviewResponse>(`/content/${contentId}/ai-preview`, {}),

  confirmContent: (contentId: string, payload: ConfirmContentRequest) =>
    apiClient.post<ContentResponse>(`/content/${contentId}/confirm`, payload),

  /** Run full AI pipeline on a pending capture (202 Accepted). */
  runProcessingPipeline: (contentId: string) =>
    apiClient.post<void>(`/content/${contentId}/process`, {}),
}
