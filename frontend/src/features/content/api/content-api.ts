import { apiClient } from '@/shared/utils/api-client'
import type { InboxItemResponse, InboxFolderResponse, SummaryResponse, TagResponse, CreateInboxItemRequest, AiPreviewResponse, ConfirmInboxItemRequest } from '@/shared/types/inbox.types'

export const contentApi = {
  list: () => apiClient.get<InboxItemResponse[]>('/content/user'),

  getById: (id: string) =>
    apiClient.get<InboxItemResponse>(`/content/${id}`),

  create: (data: CreateInboxItemRequest) =>
    apiClient.post<InboxItemResponse>('/content', data),

  delete: (id: string) =>
    apiClient.delete(`/content/${id}`),

  getSummary: (inboxItemId: string) =>
    apiClient.get<SummaryResponse>(`/content/${inboxItemId}/summary`),

  getTags: (inboxItemId: string) =>
    apiClient.get<TagResponse[]>(`/content/${inboxItemId}/tags`),

  aiPreview: (inboxItemId: string) =>
    apiClient.post<AiPreviewResponse>(`/content/${inboxItemId}/ai-preview`, {}),

  confirmContent: (inboxItemId: string, payload: ConfirmInboxItemRequest) =>
    apiClient.post<InboxItemResponse>(`/content/${inboxItemId}/confirm`, payload),

  /** Run full AI pipeline on a pending capture (202 Accepted). */
  runProcessingPipeline: (inboxItemId: string) =>
    apiClient.post<void>(`/content/${inboxItemId}/process`, {}),

  assignFolder: (inboxItemId: string, folderId: string | null) =>
    apiClient.patch<InboxItemResponse>(`/content/${inboxItemId}/folder`, { folderId }),

  contentFolders: () =>
    apiClient.get<InboxFolderResponse[]>('/content/folders'),

  contentFolderCreate: (body: { name: string }) =>
    apiClient.post<InboxFolderResponse>('/content/folders', body),
}
