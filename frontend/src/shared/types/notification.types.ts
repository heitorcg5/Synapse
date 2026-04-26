export type NotificationTypeName =
  | 'PROCESSING_FINISHED'
  | 'DUPLICATE_DETECTED'
  | 'NEW_CONNECTION'
  | 'CONTENT_REMINDER'

export interface NotificationItem {
  id: string
  type: NotificationTypeName
  inboxItemId?: string | null
  relatedInboxItemId?: string | null
  knowledgeItemId?: string | null
  connectionCount?: number | null
  read: boolean
  createdAt: string
}

export interface UnreadCountResponse {
  count: number
}
