import type { TFunction } from 'i18next'
import type { InboxItemResponse } from '@/shared/types/inbox.types'

const PREVIEW_LEN = 180

export function truncateText(text: string, max = PREVIEW_LEN): string {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (normalized.length <= max) return normalized
  return `${normalized.slice(0, max)}…`
}

export function formatSourceUrlLabel(url: string): string {
  try {
    const parsed = new URL(url)
    const path = parsed.pathname === '/' ? '' : parsed.pathname
    const label = `${parsed.hostname}${path}`
    return label.length > 72 ? `${label.slice(0, 72)}…` : label
  } catch {
    return truncateText(url, 72)
  }
}

export function getInboxTypeLabel(type: string, t: TFunction): string {
  return t(`contentTypes.${type}`, { defaultValue: type })
}

export function getInboxHeadline(item: InboxItemResponse, t: TFunction): string {
  const title = item.title?.trim()
  if (title) return title

  const url = item.sourceUrl?.trim()
  if (url) return formatSourceUrlLabel(url)

  const capture = item.contentPreview ?? item.rawContent?.trim()
  if (capture) return truncateText(capture, 100)

  return t('inboxUntitledCapture', { type: getInboxTypeLabel(item.type, t) })
}

export function getInboxCaptureExcerpt(item: InboxItemResponse, headline: string): string | null {
  const capture = item.contentPreview ?? item.rawContent?.trim()
  if (!capture) return null

  const normalized = capture.replace(/\s+/g, ' ').trim()
  const headlineNorm = headline.replace(/\s+/g, ' ').trim()
  if (headlineNorm && (normalized.startsWith(headlineNorm) || headlineNorm.startsWith(normalized.slice(0, 60)))) {
    return null
  }
  return truncateText(normalized)
}

export function shouldShowAiSuggestion(item: InboxItemResponse): boolean {
  return item.status === 'READY' && Boolean(item.summaryPreview?.trim())
}
