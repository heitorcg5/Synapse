import { apiClient } from '@/shared/utils/api-client'
import type { NotificationItem, UnreadCountResponse } from '@/shared/types/api'

export const notificationsApi = {
  getUnreadCount: () => apiClient.get<UnreadCountResponse>('/notifications/unread-count'),
  list: () => apiClient.get<NotificationItem[]>('/notifications'),
  markRead: (id: string) => apiClient.patch<void>(`/notifications/${id}/read`),
  markAllRead: () => apiClient.patch<void>('/notifications/read-all'),
}
