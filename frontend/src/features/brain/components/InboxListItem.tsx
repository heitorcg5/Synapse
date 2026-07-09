import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ExternalLink,
  File,
  FileText,
  Link2,
  Mic,
  Video,
} from 'lucide-react'
import type { InboxItemResponse } from '@/shared/types/inbox.types'
import { Badge } from '@/shared/components/ui/Badge'
import {
  getInboxCaptureExcerpt,
  getInboxHeadline,
  getInboxTypeLabel,
  shouldShowAiSuggestion,
} from '../lib/inbox-display'

type Props = {
  item: InboxItemResponse
  formattedDate: string
  statusLabel: string
  checkboxId?: string
  checked?: boolean
  selected?: boolean
  onToggleSelect?: () => void
  actions?: ReactNode
  processingHint?: string
}

function typeIcon(type: string) {
  switch (type.toUpperCase()) {
    case 'WEB':
      return Link2
    case 'VIDEO':
      return Video
    case 'AUDIO':
      return Mic
    case 'DOCUMENT':
      return File
    default:
      return FileText
  }
}

function statusTone(status: string): 'default' | 'success' | 'warning' | 'error' {
  if (status === 'READY') return 'success'
  if (status === 'FAILED') return 'error'
  if (status === 'PENDING') return 'warning'
  return 'default'
}

export function InboxListItem({
  item,
  formattedDate,
  statusLabel,
  checkboxId,
  checked,
  selected,
  onToggleSelect,
  actions,
  processingHint,
}: Props) {
  const { t } = useTranslation()
  const Icon = typeIcon(item.type)
  const headline = getInboxHeadline(item, t)
  const captureExcerpt = getInboxCaptureExcerpt(item, headline)
  const showAiSuggestion = shouldShowAiSuggestion(item)
  const typeLabel = getInboxTypeLabel(item.type, t)
  const sourceUrl = item.sourceUrl?.trim()

  return (
    <li
      className={`overflow-hidden rounded-xl border transition-colors ${
        selected ? 'border-brand-purple/45 bg-brand-purple/[0.06]' : 'border-[var(--border)] bg-[#0f0f16]'
      }`}
    >
      <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-1 gap-3">
          {onToggleSelect && checkboxId ? (
            <div className="pt-0.5">
              <input
                id={checkboxId}
                type="checkbox"
                checked={checked}
                onChange={onToggleSelect}
                className="h-4 w-4 accent-brand-purple"
              />
            </div>
          ) : null}

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-start gap-2">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-brand-purple">
                <Icon size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <h4 className="m-0 text-base font-semibold leading-snug text-app-text">{headline}</h4>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <Badge tone="default" className="normal-case tracking-normal">
                    {typeLabel}
                  </Badge>
                  <Badge tone={statusTone(item.status)} className="normal-case tracking-normal">
                    {statusLabel}
                  </Badge>
                  {item.folderName ? (
                    <span className="text-xs text-app-muted">
                      {t('captureFolder')}: {item.folderName}
                    </span>
                  ) : null}
                  <span className="text-xs text-app-muted">{formattedDate}</span>
                </div>
              </div>
            </div>

            {sourceUrl ? (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex max-w-full items-center gap-1.5 text-sm text-brand-cyan no-underline hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink size={13} className="shrink-0" />
                <span className="truncate">{sourceUrl}</span>
              </a>
            ) : null}

            {captureExcerpt ? (
              <p className="m-0 text-sm leading-relaxed text-app-muted">
                <span className="mr-1 text-[0.7rem] font-semibold uppercase tracking-wide text-app-muted/80">
                  {t('inboxCapturedContent')}
                </span>
                {captureExcerpt}
              </p>
            ) : null}

            {showAiSuggestion ? (
              <div className="rounded-lg border border-brand-purple/25 bg-brand-purple/[0.06] px-3 py-2">
                <p className="m-0 mb-1 text-[0.7rem] font-semibold uppercase tracking-wide text-brand-cyan">
                  {t('inboxAiSuggestion')}
                </p>
                <p className="m-0 text-sm leading-relaxed text-app-text">{item.summaryPreview}</p>
                <p className="mb-0 mt-1.5 text-xs text-app-muted">{t('inboxAiSuggestionHint')}</p>
              </div>
            ) : null}

            {item.tags && item.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[0.7rem] text-app-muted"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}

            {processingHint ? (
              <p className="m-0 text-sm italic text-app-muted">{processingHint}</p>
            ) : null}
          </div>
        </div>

        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 lg:max-w-[22rem]">
            {actions}
          </div>
        ) : null}
      </div>
    </li>
  )
}
