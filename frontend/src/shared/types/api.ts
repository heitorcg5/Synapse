export interface ErrorResponse {
  error: string
  message: string
}

export interface AuthResponse {
  accessToken: string
  tokenType: string
  expiresIn: number
}

export interface UserProfileResponse {
  id: string
  email: string
  displayName?: string | null
  /** Set after user saves preferences in profile; null until then. */
  preferredLanguage?: string | null
  /** dark | light | system */
  preferredTheme?: string | null
  /** IANA zone, e.g. Europe/Madrid */
  preferredTimezone?: string | null
  /** iso | dmy | mdy */
  dateFormat?: string | null
  /** h24 | h12 */
  timeFormat?: string | null
  /** short | medium | detailed */
  aiSummaryDetail?: string | null
  /** input | ui | custom */
  aiResponseLanguageMode?: string | null
  aiCustomResponseLanguage?: string | null
  aiAutoProcessCapture?: boolean | null
  /** immediate | background | manual */
  processingMode?: string | null
  pipelineSummarize?: boolean | null
  pipelineClassify?: boolean | null
  pipelineGenerateTags?: boolean | null
  pipelineDetectDuplicates?: boolean | null
  pipelineSuggestConnections?: boolean | null
  /** 500 | 1000 | 2000 */
  aiChunkSizeTokens?: string | null
  /** tags | folders | graph — default knowledge navigation (UI only). */
  knowledgeStyle?: string | null
  autoTaggingEnabled?: boolean | null
  autoLinkEnabled?: boolean | null
  /** forever | 30d | 90d */
  dataRetentionPolicy?: string | null
  /** markdown | json | pdf — default for knowledge downloads */
  knowledgeExportFormat?: string | null
  notifyProcessingFinished?: boolean | null
  notifyNewConnection?: boolean | null
  notifyDuplicateDetected?: boolean | null
  hasAvatar?: boolean
  createdAt: string
}

export interface UpdateProfileRequest {
  displayName?: string | null
  preferredLanguage?: string
  preferredTheme?: string
  preferredTimezone?: string
  dateFormat?: string
  timeFormat?: string
  aiSummaryDetail?: string
  aiResponseLanguageMode?: string
  aiCustomResponseLanguage?: string
  aiAutoProcessCapture?: boolean
  processingMode?: string
  pipelineSummarize?: boolean
  pipelineClassify?: boolean
  pipelineGenerateTags?: boolean
  pipelineDetectDuplicates?: boolean
  pipelineSuggestConnections?: boolean
  aiChunkSizeTokens?: string
  knowledgeStyle?: string
  autoTaggingEnabled?: boolean
  autoLinkEnabled?: boolean
  /** forever | 30d | 90d */
  dataRetentionPolicy?: string
  /** markdown | json | pdf */
  knowledgeExportFormat?: string
  notifyProcessingFinished?: boolean
  notifyNewConnection?: boolean
  notifyDuplicateDetected?: boolean
}

export type NotificationTypeName =
  | 'PROCESSING_FINISHED'
  | 'DUPLICATE_DETECTED'
  | 'NEW_CONNECTION'
  | 'CONTENT_REMINDER'

export interface NotificationItem {
  id: string
  type: NotificationTypeName
  contentId?: string | null
  relatedContentId?: string | null
  knowledgeItemId?: string | null
  connectionCount?: number | null
  read: boolean
  createdAt: string
}

export interface UnreadCountResponse {
  count: number
}

export type KnowledgeExportFormat = 'markdown' | 'json' | 'pdf'

export function normalizeKnowledgeExportFormat(v: string | null | undefined): KnowledgeExportFormat {
  const x = (v || '').toLowerCase()
  if (x === 'json' || x === 'pdf') return x
  return 'markdown'
}

export interface ContentResponse {
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
  uploadedAt: string
}

export interface SummaryResponse {
  id: string
  contentId: string
  summaryText: string
  model: string
  language?: string
  createdAt: string
}

export interface TagResponse {
  id: string
  name: string
}

export interface CreateContentRequest {
  type: 'VIDEO' | 'WEB' | 'AUDIO' | 'DOCUMENT' | 'TEXT'
  sourceUrl?: string
  /** Optional text pasted at capture time (Digital Brain inbox). */
  rawContent?: string
  /** Optional folder chosen by the user at capture time. */
  folderId?: string
}

export interface ContentFolderResponse {
  id: string
  name: string
}

export interface KnowledgeLinkedNoteResponse {
  knowledgeItemId: string
  title?: string
  relationType: string
  confidence: number
}

export interface KnowledgeItemResponse {
  id: string
  inboxItemId: string
  title?: string
  body?: string
  summary?: string
  language?: string
  /** Capture type from source content (TEXT, VIDEO, …). */
  sourceContentType?: string | null
  tags?: string[]
  linkedItemIds?: string[]
  folderId?: string | null
  folderName?: string | null
  relatedNotes?: KnowledgeLinkedNoteResponse[]
  backlinks?: KnowledgeLinkedNoteResponse[]
  createdAt: string
  /** Linked inbox row's `uploadedAt` — usually the capture date users care about. */
  inboxUploadedAt?: string | null
}

export interface KnowledgeFolderResponse {
  id: string
  parentId?: string | null
  name: string
}

export interface KnowledgeGraphNodeResponse {
  id: string
  title?: string
}

export interface KnowledgeGraphEdgeResponse {
  sourceItemId: string
  targetItemId: string
  relationType: string
  confidence: number
}

export interface KnowledgeGraphResponse {
  nodes: KnowledgeGraphNodeResponse[]
  edges: KnowledgeGraphEdgeResponse[]
}

export interface KnowledgeFacetsResponse {
  tags: string[]
  types: string[]
}

export interface ProcessingJobResponse {
  id: string
  inboxItemId: string
  status: string
  step?: string
  createdAt: string
  updatedAt: string
}

export interface AiPreviewResponse {
  title: string
  summaryText: string
  language: string
}

export interface ConfirmContentRequest {
  title?: string
  summaryText: string
  notificationsEnabled?: boolean
  reminderAt?: string
}
