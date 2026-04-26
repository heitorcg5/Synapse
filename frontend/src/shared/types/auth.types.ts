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
  preferredLanguage?: string | null
  preferredTheme?: string | null
  preferredTimezone?: string | null
  dateFormat?: string | null
  timeFormat?: string | null
  aiSummaryDetail?: string | null
  aiResponseLanguageMode?: string | null
  aiCustomResponseLanguage?: string | null
  aiAutoProcessCapture?: boolean | null
  processingMode?: string | null
  pipelineSummarize?: boolean | null
  pipelineClassify?: boolean | null
  pipelineGenerateTags?: boolean | null
  pipelineDetectDuplicates?: boolean | null
  pipelineSuggestConnections?: boolean | null
  aiChunkSizeTokens?: string | null
  knowledgeStyle?: string | null
  autoTaggingEnabled?: boolean | null
  autoLinkEnabled?: boolean | null
  dataRetentionPolicy?: string | null
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
  dataRetentionPolicy?: string
  knowledgeExportFormat?: string
  notifyProcessingFinished?: boolean
  notifyNewConnection?: boolean
  notifyDuplicateDetected?: boolean
}
