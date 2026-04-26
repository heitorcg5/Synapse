import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { KnowledgeExportFormat } from '@/shared/types/knowledge.types'

export type KnowledgeDownloadMode = { type: 'all' } | { type: 'single'; itemId: string; title?: string | null }

export type KnowledgeDownloadDialogProps = {
  open: boolean
  onClose: () => void
  mode: KnowledgeDownloadMode | null
  profileDefaultFormat: KnowledgeExportFormat
  busy: boolean
  errorText: string | null
  onConfirm: (format: KnowledgeExportFormat) => void | Promise<void>
}

function formatOptionLabel(format: KnowledgeExportFormat, t: (k: string) => string): string {
  switch (format) {
    case 'json':
      return t('knowledge.exportFormatJson')
    case 'pdf':
      return t('knowledge.exportFormatPdf')
    default:
      return t('knowledge.exportFormatMarkdown')
  }
}

export function KnowledgeDownloadDialog({
  open,
  onClose,
  mode,
  profileDefaultFormat,
  busy,
  errorText,
  onConfirm,
}: KnowledgeDownloadDialogProps) {
  const { t } = useTranslation()
  const [thisDownloadFormat, setThisDownloadFormat] = useState<KnowledgeExportFormat>(profileDefaultFormat)

  useEffect(() => {
    if (open) {
      setThisDownloadFormat(profileDefaultFormat)
    }
  }, [open, profileDefaultFormat])

  if (!open || !mode) return null

  const title =
    mode.type === 'all' ? t('knowledge.downloadTitleAll') : t('knowledge.downloadTitleSingle')

  return (
    <div style={styles.overlay} role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="knowledge-download-title"
        style={styles.dialog}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id="knowledge-download-title" style={styles.h2}>
          {title}
        </h2>
        {mode.type === 'single' && mode.title ? (
          <p style={styles.noteRef}>&ldquo;{mode.title}&rdquo;</p>
        ) : null}
        <p style={styles.body}>
          {t('knowledge.downloadDefaultInSettings', {
            format: formatOptionLabel(profileDefaultFormat, t),
          })}
        </p>
        <label style={styles.label}>
          {t('knowledge.downloadThisRunLabel')}
          <select
            value={thisDownloadFormat}
            onChange={(e) => setThisDownloadFormat(e.target.value as KnowledgeExportFormat)}
            style={styles.select}
            disabled={busy}
          >
            <option value="markdown">{t('knowledge.exportFormatMarkdown')}</option>
            <option value="json">{t('knowledge.exportFormatJson')}</option>
            <option value="pdf">{t('knowledge.exportFormatPdf')}</option>
          </select>
        </label>
        <p style={styles.hintMuted}>{t('knowledge.downloadThisRunHint')}</p>
        {errorText ? (
          <p style={styles.err} role="alert">
            {errorText}
          </p>
        ) : null}
        <div style={styles.actions}>
          <button type="button" style={styles.btnGhost} onClick={onClose} disabled={busy}>
            {t('knowledge.downloadCancel')}
          </button>
          <button
            type="button"
            style={styles.btnPrimary}
            disabled={busy}
            onClick={() => void onConfirm(thisDownloadFormat)}
          >
            {busy ? t('knowledge.downloadBusy') : t('knowledge.downloadConfirm')}
          </button>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem',
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 12,
    padding: '1.25rem',
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
  },
  h2: {
    margin: '0 0 0.75rem',
    fontSize: '1.1rem',
    fontWeight: 600,
  },
  noteRef: {
    margin: '0 0 0.75rem',
    fontSize: '0.9rem',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
  },
  body: {
    margin: '0 0 1rem',
    fontSize: '0.875rem',
    lineHeight: 1.45,
    color: 'var(--text)',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
    fontSize: '0.8125rem',
    color: 'var(--text-muted)',
    marginBottom: '0.5rem',
  },
  select: {
    padding: '0.6rem 0.5rem',
    borderRadius: 8,
    border: '1px solid var(--border)',
    backgroundColor: 'var(--bg)',
    color: 'var(--text)',
    fontSize: '0.875rem',
  },
  hintMuted: {
    margin: '0 0 1rem',
    fontSize: '0.78rem',
    color: 'var(--text-muted)',
    lineHeight: 1.4,
  },
  err: {
    color: 'var(--error)',
    fontSize: '0.85rem',
    marginBottom: '0.75rem',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.5rem',
    marginTop: '0.25rem',
  },
  btnGhost: {
    padding: '0.5rem 0.85rem',
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'transparent',
    color: 'var(--text)',
    cursor: 'pointer',
    fontWeight: 500,
  },
  btnPrimary: {
    padding: '0.5rem 0.85rem',
    borderRadius: 8,
    border: 'none',
    backgroundColor: 'var(--accent)',
    color: 'white',
    cursor: 'pointer',
    fontWeight: 600,
  },
}
