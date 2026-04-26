export type KnowledgeExportFormat = 'markdown' | 'json' | 'pdf'

export function normalizeKnowledgeExportFormat(v: string | null | undefined): KnowledgeExportFormat {
  const x = (v || '').toLowerCase()
  if (x === 'json' || x === 'pdf') return x
  return 'markdown'
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
  sourceContentType?: string | null
  tags?: string[]
  folderId?: string | null
  folderName?: string | null
  relatedNotes?: KnowledgeLinkedNoteResponse[]
  backlinks?: KnowledgeLinkedNoteResponse[]
  createdAt: string
  inboxCapturedAt?: string | null
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
