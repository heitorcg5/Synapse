import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Calendar, Folder, Tag, Video } from 'lucide-react'
import { useAuth } from '@/app/auth-context'
import { userApi } from '@/features/profile/api/user-api'
import { contentApi } from '@/features/content/api/content-api'
import { Badge } from '@/shared/components/ui/Badge'
import { MetadataSidePanel } from '@/shared/components/ui/MetadataSidePanel'
import { formatUserDateTime } from '@/shared/preferences/user-datetime'
import { brainApi } from '../api/brain-api'
import { ContentPreview } from '../components/ContentPreview'
import { KnowledgeDownloadDialog } from '../components/KnowledgeDownloadDialog'
import type { KnowledgeExportFormat, KnowledgeItemResponse } from '@/shared/types/knowledge.types'
import { normalizeKnowledgeExportFormat } from '@/shared/types/knowledge.types'
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
  const { data: legacyFolders } = useQuery({
    queryKey: ['content-folders', token ?? ''] as const,
    queryFn: () => contentApi.contentFolders().then((r) => r.data),
    enabled: !!token,
  })
  const allFolders = useMemo(() => {
    const byId = new Map<string, { id: string; name: string }>()
    for (const folder of folders ?? []) byId.set(folder.id, { id: folder.id, name: folder.name })
    for (const folder of legacyFolders ?? []) {
      if (!byId.has(folder.id)) byId.set(folder.id, { id: folder.id, name: folder.name })
    }
    return Array.from(byId.values())
  }, [folders, legacyFolders])

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
  const [isMobile, setIsMobile] = useState(false)

  const { data: k, isLoading, error } = useQuery({
    queryKey: ['knowledge-item', id],
    queryFn: () => brainApi.knowledgeGet(id!).then((r) => r.data),
    enabled: !!id,
    refetchInterval: 20_000,
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
  const { data: sourceContent } = useQuery({
    queryKey: ['content-item', k?.inboxItemId ?? ''],
    queryFn: () => contentApi.getById(k!.inboxItemId).then((r) => r.data),
    enabled: !!k?.inboxItemId,
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
  const captureIso = k.inboxCapturedAt ?? null
  const savedIso = k.createdAt ?? null
  const primaryIso = (captureIso || savedIso) ?? null
  const showSavedRow =
    !!captureIso &&
    !!savedIso &&
    String(captureIso) !== String(savedIso)
  const metadataItems = [
    {
      label: t('knowledge.capturedAt'),
      icon: <Calendar size={16} />,
      value: primaryIso
        ? formatUserDateTime(primaryIso, i18n.language, formatPrefs)
        : '—',
    },
    ...(k.sourceContentType
      ? [{ label: t('knowledge.sourceType'), icon: <Video size={16} />, value: typeLabel ?? k.sourceContentType }]
      : []),
    ...(showSavedRow
      ? [
          {
            label: t('knowledge.knowledgeRowCreated'),
            value: formatUserDateTime(savedIso!, i18n.language, formatPrefs),
          },
        ]
      : []),
    {
      label: t('knowledge.folderColumn'),
      icon: <Folder size={16} />,
      value: (
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
          {allFolders.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      ),
    },
    {
      label: t('tags'),
      icon: <Tag size={16} />,
      value:
        k.tags && k.tags.length > 0 ? (
          <div style={styles.tagsWrap}>
            {k.tags.map((tag) => (
              <Badge key={tag} className="inline-flex rounded-[999px] border border-[rgba(124,92,255,0.25)] bg-[rgba(124,92,255,0.12)] px-[10px] py-1 text-[12px] font-medium normal-case tracking-normal text-[#d7ceff]">
                {tag}
              </Badge>
            ))}
          </div>
        ) : (
          '—'
        ),
    },
  ]
  useEffect(() => {
    if (typeof window === 'undefined') return
    const query = window.matchMedia('(max-width: 900px)')
    const sync = () => setIsMobile(query.matches)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])

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
        </div>
        <div style={{ ...styles.layoutGrid, ...(isMobile ? styles.layoutGridMobile : {}) }}>
          <div style={styles.mainCol}>
            <ContentPreview
              contentType={k.sourceContentType}
              sourceUrl={sourceContent?.sourceUrl}
              title={k.title}
            />
            <h2 style={styles.h2}>{t('summary')}</h2>
            <div style={styles.summaryBlock}>{k.summary}</div>
            <h2 style={styles.h2}>{t('knowledgeBody')}</h2>
            <div style={styles.block}>{k.body}</div>
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

          </div>

          <MetadataSidePanel
            title={t('details')}
            items={metadataItems}
            footer={
              <div style={styles.actionsSection}>
                <button
                  type="button"
                  style={styles.actionBtn}
                  onClick={() => {
                    setDownloadErr(null)
                    setDownloadOpen(true)
                  }}
                >
                  Download
                </button>
                <Link to={`/inbox/${k.inboxItemId}`} style={styles.actionBtnLink}>
                  View original
                </Link>
                {sourceContent?.sourceUrl ? (
                  <a
                    href={sourceContent.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={styles.actionBtnLink}
                  >
                    Open source
                  </a>
                ) : null}
              </div>
            }
          />
        </div>
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
  layoutGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)',
    gap: '2rem',
  },
  layoutGridMobile: {
    gridTemplateColumns: 'minmax(0, 1fr)',
    gap: '1rem',
  },
  mainCol: {
    minWidth: 0,
  },
  titleRow: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '0.75rem',
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: 600,
    lineHeight: 1.3,
    margin: 0,
    marginBottom: 12,
    maxWidth: 800,
    flex: '1 1 12rem',
  },
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
  summaryBlock: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 20,
    lineHeight: 1.6,
    fontSize: 15,
    whiteSpace: 'pre-wrap',
    color: 'var(--text)',
    marginBottom: 24,
  },
  metaLine: { fontSize: '0.875rem', marginBottom: '0.75rem', color: 'var(--text-muted)' },
  metaLineSecondary: { fontSize: '0.8rem', marginBottom: '0.5rem', color: 'var(--text-muted)' },
  tags: { fontSize: '0.875rem', marginBottom: '0.5rem' },
  tagsWrap: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  folderSelect: {
    padding: '0.5rem',
    borderRadius: 8,
    border: '1px solid var(--border)',
    backgroundColor: 'var(--bg)',
    color: 'var(--text)',
  },
  actionsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  actionBtn: {
    height: 40,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    border: '1px solid var(--border)',
    backgroundColor: 'var(--bg)',
    color: 'var(--text)',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'none',
  },
  actionBtnLink: {
    height: 40,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    border: '1px solid var(--border)',
    backgroundColor: 'var(--bg)',
    color: 'var(--text)',
    fontSize: '0.85rem',
    fontWeight: 600,
    textDecoration: 'none',
  },
  linkList: { margin: '0.25rem 0 0', paddingLeft: '1.25rem', lineHeight: 1.6 },
  relMeta: { fontSize: '0.8rem', color: 'var(--text-muted)' },
  meta: { fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1rem' },
}
