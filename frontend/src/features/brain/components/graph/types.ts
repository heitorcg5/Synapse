export type GraphNode = {
  id: string
  title: string
  type: string
  tags: string[]
  createdAt: string
  summary: string
  folder: string
  connectionCount: number
  isRecent?: boolean
}

export type GraphEdge = {
  source: string
  target: string
  sharedTagCount?: number
}

export const TYPE_COLORS: Record<string, string> = {
  VIDEO: '#ef4444',
  ARTICLE: '#3b82f6',
  NOTE: '#22c55e',
  IMAGE: '#a855f7',
  WEB: '#06b6d4',
  TEXT: '#22c55e',
  DOCUMENT: '#3b82f6',
  AUDIO: '#06b6d4',
}

export const TYPE_LABELS: Record<string, string> = {
  VIDEO: 'Video',
  ARTICLE: 'Article',
  NOTE: 'Note',
  IMAGE: 'Image',
  WEB: 'Web',
  TEXT: 'Note',
  DOCUMENT: 'Article',
  AUDIO: 'Web',
}

export function normalizeNodeType(raw?: string | null): string {
  const t = (raw ?? '').trim().toUpperCase()
  if (t === 'TEXT') return 'NOTE'
  if (t === 'DOCUMENT') return 'ARTICLE'
  if (t === 'AUDIO') return 'WEB'
  return t || 'NOTE'
}

export function getColorByType(type: string): string {
  return TYPE_COLORS[type] ?? '#6b7280'
}

export function getNodeIcon(type: string): string {
  switch (type) {
    case 'VIDEO':
      return '▶'
    case 'ARTICLE':
      return '▦'
    case 'NOTE':
      return '✎'
    case 'IMAGE':
      return '◉'
    case 'WEB':
      return '⌁'
    default:
      return '•'
  }
}
