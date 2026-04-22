import { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/app/auth-context'
import { userApi } from '@/features/profile/api/user-api'
import { formatUserDateTime } from '@/shared/preferences/user-datetime'
import { brainApi } from '../api/brain-api'
import { KnowledgeDownloadDialog } from '../components/KnowledgeDownloadDialog'
import type { KnowledgeExportFormat, KnowledgeItemResponse } from '@/shared/types/api'
import { normalizeKnowledgeExportFormat } from '@/shared/types/api'
import { getErrorMessage, parseContentDispositionFilename } from '@/shared/utils/api-client'

export function KnowledgeDetailPage() {
  const { t, i18n } = useTranslation()
  const { token } = useAuth()
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const { data: profile } = useQuery({
    queryKey: ['user-profile', token ?? ''] as const,
    queryFn: () => userApi.getMe().then((r) => r.data),
    enabled: !!token,
  })
  const effectiveTimezone = useMemo(() => {
    const z = profile?.preferredTimezone?.trim()
    if (z) return z
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone
    } catch {
      return undefined
    }
  }, [profile?.preferredTimezone])

  const formatPrefs = useMemo(
    () => ({
      dateFormat: profile?.dateFormat,
      timeFormat: profile?.timeFormat,
      timeZone: effectiveTimezone,
    }),
    [profile?.dateFormat, profile?.timeFormat, effectiveTimezone],
  )
  const { data: folders } = useQuery({
    queryKey: ['knowledge-folders', token ?? ''] as const,
    queryFn: () => brainApi.knowledgeFolders().then((r) => r.data),
    enabled: !!token,
  })

  const assignFolderMutation = useMutation({
    mutationFn: (folderId: string | null) =>
      brainApi.knowledgeAssignFolder(id!, folderId),
    onSuccess: (res) => {
      queryClient.setQueryData(['knowledge-item', id], res.data)
      void queryClient.invalidateQueries({ queryKey: ['knowledge-list'] })
    },
  })

  const defaultExportFmt = normalizeKnowledgeExportFormat(profile?.knowledgeExportFormat)
  const [downloadOpen, setDownloadOpen] = useState(false)
  const [downloadBusy, setDownloadBusy] = useState(false)
  const [downloadErr, setDownloadErr] = useState<string | null>(null)

  const { data: k, isLoading, error } = useQuery({
    queryKey: ['knowledge-item', id],
    queryFn: () => brainApi.knowledgeGet(id!).then((r) => r.data),
    enabled: !!id,
    refetchInterval: 5_000,
    placeholderData: () => {
      if (!id) return undefined
      const buckets = queryClient.getQueriesData<KnowledgeItemResponse[]>({
        queryKey: ['knowledge-list'],
      })
      for (const [, rows] of buckets) {
        const hit = rows?.find((x) => String(x.id) === String(id))
        if (hit) return hit
      }
      return undefined
    },
  })

  if (!id) return null
  if (isLoading) {
    return <p style={{ color: 'var(--text-muted)' }}>{t('loading')}</p>
  }
  if (error || !k) {
    return <p style={{ color: 'var(--error)' }}>{t('contentNotFound')}</p>
  }

  const extFor = (f: KnowledgeExportFormat) => (f === 'markdown' ? 'md' : f)

  const triggerBlobDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const runDownload = async (format: KnowledgeExportFormat) => {
    setDownloadErr(null)
    setDownloadBusy(true)
    try {
      const res = await userApi.exportKnowledgeItem(k.id, { format })
      const name =
        parseContentDispositionFilename(res.headers) ??
        `synapse-note-${k.id.slice(0, 8)}.${extFor(format)}`
      triggerBlobDownload(res.data, name)
      setDownloadOpen(false)
    } catch (e) {
      setDownloadErr(getErrorMessage(e))
    } finally {
      setDownloadBusy(false)
    }
  }

  const typeLabel = k.sourceContentType
    ? t(`contentTypes.${k.sourceContentType}`, { defaultValue: k.sourceContentType })
    : null

  /** Must match list card: capture time first, then row creation (see KnowledgePage). */
  const captureIso = k.inboxUploadedAt ?? null
  const savedIso = k.createdAt ?? null
  const primaryIso = (captureIso || savedIso) ?? null
  const showSavedRow =
    !!captureIso &&
    !!savedIso &&
    String(captureIso) !== String(savedIso)

  return (
    <div>
      <div style={styles.header}>
        <Link to="/knowledge" style={styles.back}>
          ← {t('backToKnowledge')}
        </Link>
      </div>
      <div style={styles.card}>
        <div style={styles.titleRow}>
          <h1 style={styles.title}>{k.title || t('untitledNote')}</h1>
          <button
            type="button"
            style={styles.downloadBtn}
            onClick={() => {
              setDownloadErr(null)
              setDownloadOpen(true)
            }}
          >
            {t('knowledge.download')}
          </button>
        </div>
        <p style={styles.metaLine}>
          <strong>{t('knowledge.capturedAt')}:</strong>{' '}
          {primaryIso
            ? formatUserDateTime(primaryIso, i18n.language, formatPrefs)
            : '—'}
          {k.sourceContentType ? (
            <>
              {' · '}
              <strong>{t('knowledge.sourceType')}:</strong> {typeLabel}
            </>
          ) : null}
        </p>
        {showSavedRow ? (
          <p style={styles.metaLineSecondary}>
            <strong>{t('knowledge.knowledgeRowCreated')}:</strong>{' '}
            {formatUserDateTime(savedIso!, i18n.language, formatPrefs)}
          </p>
        ) : null}
        {k.tags && k.tags.length > 0 && (
          <p style={styles.tags}>
            <strong>{t('tags')}:</strong> {k.tags.join(', ')}
          </p>
        )}
        <label style={styles.folderRow}>
          <span style={styles.folderLabel}>{t('knowledge.folderColumn')}</span>
          <select
            value={k.folderId ?? ''}
            disabled={assignFolderMutation.isPending}
            onChange={(e) => {
              const v = e.target.value
              assignFolderMutation.mutate(v === '' ? null : v)
            }}
            style={styles.folderSelect}
          >
            <option value="">{t('knowledge.uncategorized')}</option>
            {(folders ?? []).map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
        <p style={styles.folderManage}>
          <Link to="/settings">{t('settingsPage.title')}</Link>
        </p>
        {(k.relatedNotes?.length ?? 0) > 0 && (
          <>
            <h2 style={styles.h2}>{t('knowledge.relatedNotes')}</h2>
            <ul style={styles.linkList}>
              {(k.relatedNotes ?? []).map((n) => (
                <li key={n.knowledgeItemId}>
                  <Link to={`/knowledge/${n.knowledgeItemId}`}>
                    {n.title || t('untitledNote')}
                  </Link>
                  <span style={styles.relMeta}>
                    {' '}
                    ({n.relationType}, {n.confidence.toFixed(2)})
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
        {(k.backlinks?.length ?? 0) > 0 && (
          <>
            <h2 style={styles.h2}>{t('knowledge.backlinks')}</h2>
            <ul style={styles.linkList}>
              {(k.backlinks ?? []).map((n) => (
                <li key={n.knowledgeItemId}>
                  <Link to={`/knowledge/${n.knowledgeItemId}`}>
                    {n.title || t('untitledNote')}
                  </Link>
                  <span style={styles.relMeta}>
                    {' '}
                    ({n.relationType}, {n.confidence.toFixed(2)})
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
        <h2 style={styles.h2}>{t('summary')}</h2>
        <div style={styles.block}>{k.summary}</div>
        <h2 style={styles.h2}>{t('knowledgeBody')}</h2>
        <div style={styles.block}>{k.body}</div>
        {k.linkedItemIds && k.linkedItemIds.length > 0 && (
          <p style={styles.meta}>
            {t('linkedItems')}: {k.linkedItemIds.join(', ')}
          </p>
        )}
        <p style={styles.meta}>
          <Link to={`/content/${k.inboxItemId}`}>{t('sourceCapture')}</Link>
        </p>
      </div>

      <KnowledgeDownloadDialog
        open={downloadOpen}
        onClose={() => {
          if (!downloadBusy) {
            setDownloadOpen(false)
            setDownloadErr(null)
          }
        }}
        mode={downloadOpen ? { type: 'single', itemId: k.id, title: k.title } : null}
        profileDefaultFormat={defaultExportFmt}
        busy={downloadBusy}
        errorText={downloadErr}
        onConfirm={(format) => void runDownload(format)}
      />
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  header: { marginBottom: '1rem' },
  back: { color: 'var(--text-muted)', fontSize: '0.875rem' },
  card: {
    padding: '1.5rem',
    backgroundColor: 'var(--surface)',
    borderRadius: 12,
    border: '1px solid var(--border)',
  },
  titleRow: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '0.75rem',
    marginBottom: '1rem',
  },
  title: { fontSize: '1.25rem', fontWeight: 600, margin: 0, flex: '1 1 12rem' },
  downloadBtn: {
    flexShrink: 0,
    padding: '0.45rem 0.85rem',
    borderRadius: 8,
    border: '1px solid var(--border)',
    backgroundColor: 'var(--bg)',
    color: 'var(--accent)',
    fontSize: '0.8125rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  h2: {
    fontSize: '1rem',
    fontWeight: 600,
    marginTop: '1.25rem',
    marginBottom: '0.5rem',
  },
  block: {
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap',
    color: 'var(--text)',
  },
  metaLine: { fontSize: '0.875rem', marginBottom: '0.75rem', color: 'var(--text-muted)' },
  metaLineSecondary: { fontSize: '0.8rem', marginBottom: '0.5rem', color: 'var(--text-muted)' },
  tags: { fontSize: '0.875rem', marginBottom: '0.5rem' },
  folderRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
    marginBottom: '0.5rem',
    maxWidth: '22rem',
  },
  folderLabel: { fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 },
  folderSelect: {
    padding: '0.5rem',
    borderRadius: 8,
    border: '1px solid var(--border)',
    backgroundColor: 'var(--bg)',
    color: 'var(--text)',
  },
  folderManage: { fontSize: '0.75rem', marginTop: '0.25rem', marginBottom: '0.75rem' },
  linkList: { margin: '0.25rem 0 0', paddingLeft: '1.25rem', lineHeight: 1.6 },
  relMeta: { fontSize: '0.8rem', color: 'var(--text-muted)' },
  meta: { fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1rem' },
}
