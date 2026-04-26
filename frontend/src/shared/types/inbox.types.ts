export interface InboxItemResponse {
  id: string
  userId: string
  type: string
  sourceUrl: string | null
  rawContent?: string | null
  language?: string | null
  title?: string
  notificationsEnabled?: boolean
  notificationReminderAt?: string | null
  folderId?: string | null
  folderName?: string | null
  status: string
  capturedAt: string
}

export interface SummaryResponse {
  id: string
  inboxItemId: string
  summaryText: string
  model: string
  language?: string
  createdAt: string
}

export interface TagResponse {
  id: string
  name: string
}

export interface CreateInboxItemRequest {
  type: 'VIDEO' | 'WEB' | 'AUDIO' | 'DOCUMENT' | 'TEXT'
  sourceUrl?: string
  rawContent?: string
  folderId?: string
}

export interface InboxFolderResponse {
  id: string
  name: string
}

export interface AiPreviewResponse {
  title: string
  summaryText: string
  language: string
}

export interface ConfirmInboxItemRequest {
  title?: string
  summaryText: string
  notificationsEnabled?: boolean
  reminderAt?: string
}
