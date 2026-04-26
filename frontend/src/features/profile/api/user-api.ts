import { apiClient } from '@/shared/utils/api-client'
import type { KnowledgeExportFormat } from '@/shared/types/knowledge.types'
import type { UserProfileResponse, UpdateProfileRequest } from '@/shared/types/auth.types'

export const userApi = {
  getMe: () => apiClient.get<UserProfileResponse>('/user/me'),
  updateMe: (payload: UpdateProfileRequest) =>
    apiClient.patch<UserProfileResponse>('/user/me', payload),
  uploadAvatar: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return apiClient.post<UserProfileResponse>('/user/me/avatar', fd)
  },
  deleteAvatar: () =>
    apiClient.delete<UserProfileResponse>('/user/me/avatar'),
  getAvatarBlob: () =>
    apiClient.get<Blob>('/user/me/avatar', { responseType: 'blob' }),
  exportKnowledge: (opts?: { format?: KnowledgeExportFormat }) =>
    apiClient.get<Blob>('/user/me/export', {
      ...(opts?.format ? { params: { format: opts.format } } : {}),
      responseType: 'blob',
    }),
  exportKnowledgeItem: (knowledgeItemId: string, opts?: { format?: KnowledgeExportFormat }) =>
    apiClient.get<Blob>(`/user/me/export/knowledge/${knowledgeItemId}`, {
      ...(opts?.format ? { params: { format: opts.format } } : {}),
      responseType: 'blob',
    }),
}
