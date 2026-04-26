import { apiClient } from '@/shared/utils/api-client'
import type { NotificationItem, UnreadCountResponse } from '@/shared/types/notification.types'

export const notificationsApi = {
  getUnreadCount: () => apiClient.get<UnreadCountResponse>('/notifications/unread-count'),
  list: () => apiClient.get<NotificationItem[]>('/notifications'),
  markRead: (id: string) => apiClient.patch<void>(`/notifications/${id}/read`),
  markAllRead: () => apiClient.patch<void>('/notifications/read-all'),
  clearAll: async () => {
    try {
      return await apiClient.post<void>('/notifications/clear')
    } catch (error: unknown) {
      const status = (error as { response?: { status?: number } })?.response?.status
      // Backward-compatible path for servers that only expose DELETE /notifications.
      if (status === 404 || status === 405) {
        return apiClient.delete<void>('/notifications')
      }
      throw error
    }
  },
}
