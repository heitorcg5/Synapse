export interface ErrorResponse {
  error: string
  message: string
}

export interface AuthResponse {
  accessToken: string
  tokenType: string
  expiresIn: number
}

export interface ContentResponse {
  id: string
  userId: string
  type: string
  sourceUrl: string | null
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
}
