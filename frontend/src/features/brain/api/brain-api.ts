import { apiClient } from '@/shared/utils/api-client'
import type {
  ContentResponse,
  KnowledgeFacetsResponse,
  KnowledgeFolderResponse,
  KnowledgeGraphResponse,
  KnowledgeItemResponse,
} from '@/shared/types/api'

export type KnowledgeListParams = {
  from?: string
  to?: string
  type?: string
  tag?: string
  /** asc = oldest first; omit for newest first (server default). */
  sort?: 'asc' | 'desc'
}

export const brainApi = {
  inboxList: () => apiClient.get<ContentResponse[]>('/inbox'),

  /** IANA zone sent as header so values like `Europe/Madrid` never break the query string. */
  knowledgeList: (params?: KnowledgeListParams, timeZoneHeader?: string) =>
    apiClient.get<KnowledgeItemResponse[]>('/knowledge', {
      params,
      ...(timeZoneHeader?.trim()
        ? { headers: { 'X-Synapse-Timezone': timeZoneHeader.trim() } }
        : {}),
    }),

  knowledgeFacets: () =>
    apiClient.get<KnowledgeFacetsResponse>('/knowledge/facets'),

  knowledgeGet: (id: string) =>
    apiClient.get<KnowledgeItemResponse>(`/knowledge/${id}`),

  knowledgeGraph: () => apiClient.get<KnowledgeGraphResponse>('/knowledge/graph'),

  knowledgeFolders: () => apiClient.get<KnowledgeFolderResponse[]>('/knowledge/folders'),

  knowledgeFolderCreate: (body: { name: string; parentId?: string | null }) =>
    apiClient.post<KnowledgeFolderResponse>('/knowledge/folders', body),

  knowledgeAssignFolder: (knowledgeItemId: string, folderId: string | null) =>
    apiClient.patch<KnowledgeItemResponse>(`/knowledge/${knowledgeItemId}/folder`, { folderId }),
}
