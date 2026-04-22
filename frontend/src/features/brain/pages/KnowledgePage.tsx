import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useAuth } from '@/app/auth-context'
import { userApi } from '@/features/profile/api/user-api'
import { formatUserDateTime } from '@/shared/preferences/user-datetime'
import {
  getErrorMessage,
  parseContentDispositionFilename,
} from '@/shared/utils/api-client'
import type {
  KnowledgeExportFormat,
  KnowledgeFolderResponse,
  KnowledgeItemResponse,
} from '@/shared/types/api'
import { normalizeKnowledgeExportFormat } from '@/shared/types/api'
import { brainApi, type KnowledgeListParams } from '../api/brain-api'
import { KnowledgeDownloadDialog, type KnowledgeDownloadMode } from '../components/KnowledgeDownloadDialog'

type KnowledgeStyle = 'tags' | 'folders' | 'graph'

export function KnowledgePage() {
  const { t, i18n } = useTranslation()
  const { token } = useAuth()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [tag, setTag] = useState('')
  const [type, setType] = useState('')
  const [sort, setSort] = useState<'desc' | 'asc'>('desc')
  const [folderFocus, setFolderFocus] = useState<string | 'all' | 'none'>('all')

  const { data: profile } = useQuery({
    queryKey: ['user-profile', token ?? ''] as const,
    queryFn: () => userApi.getMe().then((r) => r.data),
    enabled: !!token,
  })

  const knowledgeStyle = useMemo((): KnowledgeStyle => {
    const s = profile?.knowledgeStyle?.toLowerCase()
    if (s === 'folders' || s === 'graph') return s
    return 'tags'
  }, [profile?.knowledgeStyle])

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

  const listParams = useMemo((): KnowledgeListParams => {
    const p: KnowledgeListParams = {}
    if (sort !== 'desc') p.sort = sort
    if (from.trim()) p.from = from.trim()
    if (to.trim()) p.to = to.trim()
    if (tag.trim()) p.tag = tag.trim()
    if (type.trim()) p.type = type.trim()
    return p
  }, [from, to, tag, type, sort])

  const { data: facets, error: facetsError } = useQuery({
    queryKey: ['knowledge-facets', token ?? ''],
    queryFn: () => brainApi.knowledgeFacets().then((r) => r.data),
    refetchInterval: 30_000,
    enabled: !!token,
  })

  const { data: folders } = useQuery({
    queryKey: ['knowledge-folders', token ?? ''] as const,
    queryFn: () => brainApi.knowledgeFolders().then((r) => r.data),
    enabled: !!token && knowledgeStyle === 'folders',
  })

  const { data: graph } = useQuery({
    queryKey: ['knowledge-graph', token ?? ''] as const,
    queryFn: () => brainApi.knowledgeGraph().then((r) => r.data),
    enabled: !!token && knowledgeStyle === 'graph',
    refetchInterval: 15_000,
  })

  const { data: items, isPending, isError, error } = useQuery({
    queryKey: [
      'knowledge-list',
      listParams,
      from.trim() || to.trim() ? (effectiveTimezone ?? '') : '',
    ],
    queryFn: () =>
      brainApi.knowledgeList(listParams, effectiveTimezone).then((r) => r.data),
    refetchInterval: 6_000,
    enabled: !!token,
  })

  const list = items ?? []
  const hasActiveFilters = Boolean(from || to || tag || type)

  const defaultExportFmt = normalizeKnowledgeExportFormat(profile?.knowledgeExportFormat)
  const [downloadMode, setDownloadMode] = useState<KnowledgeDownloadMode | null>(null)
  const [downloadBusy, setDownloadBusy] = useState(false)
  const [downloadErr, setDownloadErr] = useState<string | null>(null)

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

  const runKnowledgeDownload = async (format: KnowledgeExportFormat) => {
    setDownloadErr(null)
    setDownloadBusy(true)
    try {
      if (downloadMode?.type === 'all') {
        const res = await userApi.exportKnowledge({ format })
        const name =
          parseContentDispositionFilename(res.headers) ?? `synapse-knowledge.${extFor(format)}`
        triggerBlobDownload(res.data, name)
      } else if (downloadMode?.type === 'single') {
        const res = await userApi.exportKnowledgeItem(downloadMode.itemId, { format })
        const name =
          parseContentDispositionFilename(res.headers) ??
          `synapse-note-${downloadMode.itemId.slice(0, 8)}.${extFor(format)}`
        triggerBlobDownload(res.data, name)
      }
      setDownloadMode(null)
    } catch (e) {
      setDownloadErr(getErrorMessage(e))
    } finally {
      setDownloadBusy(false)
    }
  }

  const filteredForFolder = useMemo(() => {
    if (knowledgeStyle !== 'folders') return list
    if (folderFocus === 'all') return list
    if (folderFocus === 'none') return list.filter((k) => !k.folderId)
    return list.filter((k) => k.folderId === folderFocus)
  }, [knowledgeStyle, list, folderFocus])

  const groupedByFolder = useMemo(() => {
    const m = new Map<string | null, KnowledgeItemResponse[]>()
    for (const k of list) {
      const key = k.folderId ?? null
      const arr = m.get(key) ?? []
      arr.push(k)
      m.set(key, arr)
    }
    return m
  }, [list])

  const clearFilters = () => {
    setFrom('')
    setTo('')
    setTag('')
    setType('')
  }

  const typeLabel = (raw?: string | null) =>
    raw ? t(`contentTypes.${raw}`, { defaultValue: raw }) : null

  if (!token) {
    return <p style={{ color: 'var(--text-muted)' }}>{t('loading')}</p>
  }

  if (isPending && !list.length) {
    return <p style={{ color: 'var(--text-muted)' }}>{t('loading')}</p>
  }
  if (isError && !list.length) {
    return (
      <div>
        <p style={{ color: 'var(--error)' }}>{t('failedToLoad')}</p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
          {getErrorMessage(error)}
        </p>
      </div>
    )
  }

  const renderItemRow = (k: KnowledgeItemResponse) => (
    <li key={k.id} style={styles.item}>
      <div style={styles.itemRow}>
        <Link to={`/knowledge/${k.id}`} style={{ ...styles.itemLink, flex: 1, minWidth: 0 }}>
          <span style={styles.itemTitle}>{k.title || t('untitledNote')}</span>
          <span style={styles.meta}>
            {k.inboxUploadedAt || k.createdAt
              ? formatUserDateTime(
                  (k.inboxUploadedAt || k.createdAt) as string,
                  i18n.language,
                  formatPrefs,
                )
              : '—'}
            {k.sourceContentType ? (
              <>
                {' · '}
                <span style={styles.typeChip}>{typeLabel(k.sourceContentType)}</span>
              </>
            ) : null}
          </span>
          {knowledgeStyle === 'folders' ? (
            <span style={styles.tagsLine}>
              <strong>{t('knowledge.folderColumn')}:</strong> {k.folderName || t('knowledge.uncategorized')}
              {' · '}
              <strong>{t('tags')}:</strong> {k.tags?.length ? k.tags.join(', ') : '—'}
            </span>
          ) : (
            <span style={styles.tagsLine}>{k.tags?.length ? k.tags.join(', ') : '—'}</span>
          )}
        </Link>
        <button
          type="button"
          style={styles.downloadBtn}
          onClick={() => {
            setDownloadErr(null)
            setDownloadMode({ type: 'single', itemId: k.id, title: k.title })
          }}
        >
          {t('knowledge.download')}
        </button>
      </div>
    </li>
  )

  const folderSidebar = (flat: KnowledgeFolderResponse[]) => {
    const row = (id: string | 'all' | 'none', label: string, count?: number) => (
      <button
        key={String(id)}
        type="button"
        onClick={() => setFolderFocus(id)}
        style={{
          ...styles.folderChip,
          ...(folderFocus === id ? styles.folderChipActive : {}),
        }}
      >
        {label}
        {count != null ? ` (${count})` : ''}
      </button>
    )
    const noneCount = groupedByFolder.get(null)?.length ?? 0
    return (
      <div style={styles.folderSidebar}>
        <p style={styles.folderSidebarTitle}>{t('knowledge.folderColumn')}</p>
        {row('all', t('knowledge.allItems'), list.length)}
        {row('none', t('knowledge.uncategorized'), noneCount)}
        {flat.map((f) =>
          row(f.id, f.name, groupedByFolder.get(f.id)?.length ?? 0),
        )}
        <p style={styles.folderHint}>
          <Link to="/settings">{t('settingsPage.title')}</Link>
        </p>
      </div>
    )
  }

  const graphBody =
    knowledgeStyle === 'graph' && graph ? (
      <ul style={styles.list}>
        {graph.nodes.map((n) => {
          const edges = graph.edges.filter((e) => e.sourceItemId === n.id)
          return (
            <li key={n.id} style={styles.item}>
              <div style={styles.itemRow}>
                <div style={{ flex: 1, minWidth: 0, padding: '1rem' }}>
                  <Link to={`/knowledge/${n.id}`} style={styles.itemTitle}>
                    {n.title || t('untitledNote')}
                  </Link>
                  {edges.length > 0 && (
                    <ul style={{ margin: '0.5rem 0 0 1rem', padding: 0, listStyle: 'disc inside' }}>
                      {edges.map((e) => {
                        const target = graph.nodes.find((x) => x.id === e.targetItemId)
                        return (
                          <li key={`${e.sourceItemId}-${e.targetItemId}`} style={{ fontSize: '0.85rem' }}>
                            <Link to={`/knowledge/${e.targetItemId}`}>
                              {target?.title || t('untitledNote')}
                            </Link>
                            <span style={{ color: 'var(--text-muted)' }}>
                              {' '}
                              ({e.relationType})
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
                <button
                  type="button"
                  style={styles.downloadBtn}
                  onClick={() => {
                    setDownloadErr(null)
                    setDownloadMode({ type: 'single', itemId: n.id, title: n.title })
                  }}
                >
                  {t('knowledge.download')}
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    ) : null

  const listToShow =
    knowledgeStyle === 'folders'
      ? filteredForFolder
      : knowledgeStyle === 'graph'
        ? []
        : list

  const showDownloadAll =
    list.length > 0 || (knowledgeStyle === 'graph' && (graph?.nodes.length ?? 0) > 0)

  return (
    <div style={styles.page}>
      <div style={styles.titleRow}>
        <h1 style={styles.title}>{t('nav.knowledge')}</h1>
        {showDownloadAll ? (
          <button
            type="button"
            style={styles.downloadAllBtn}
            onClick={() => {
              setDownloadErr(null)
              setDownloadMode({ type: 'all' })
            }}
          >
            {t('knowledge.downloadAll')}
          </button>
        ) : null}
      </div>
      <p style={styles.subtitle}>{t('knowledgeSubtitle')}</p>
      {knowledgeStyle !== 'tags' && (
        <p style={{ ...styles.subtitle, fontSize: '0.85rem' }}>{t('knowledge.layoutFromSettings')}</p>
      )}

      {facetsError ? (
        <div style={{ color: 'var(--error)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
          <p style={{ margin: 0 }}>{t('knowledge.facetsLoadError')}</p>
          <p style={{ color: 'var(--text-muted)', margin: '0.35rem 0 0', fontSize: '0.8rem' }}>
            {getErrorMessage(facetsError)}
          </p>
        </div>
      ) : null}

      {knowledgeStyle !== 'graph' && (
        <div style={styles.filters}>
          <label style={styles.filterField}>
            <span style={styles.filterLabel}>{t('knowledge.sortByDate')}</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as 'desc' | 'asc')}
              style={styles.select}
            >
              <option value="desc">{t('knowledge.sortNewestFirst')}</option>
              <option value="asc">{t('knowledge.sortOldestFirst')}</option>
            </select>
          </label>
          <label style={styles.filterField}>
            <span style={styles.filterLabel}>{t('knowledge.filterFrom')}</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              style={styles.input}
            />
          </label>
          <label style={styles.filterField}>
            <span style={styles.filterLabel}>{t('knowledge.filterTo')}</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              style={styles.input}
            />
          </label>
          <label style={styles.filterField}>
            <span style={styles.filterLabel}>{t('tags')}</span>
            <select value={tag} onChange={(e) => setTag(e.target.value)} style={styles.select}>
              <option value="">{t('knowledge.filterAllTags')}</option>
              {(facets?.tags ?? []).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label style={styles.filterField}>
            <span style={styles.filterLabel}>{t('type')}</span>
            <select value={type} onChange={(e) => setType(e.target.value)} style={styles.select}>
              <option value="">{t('knowledge.filterAllTypes')}</option>
              {(facets?.types ?? []).map((ty) => (
                <option key={ty} value={ty}>
                  {typeLabel(ty) ?? ty}
                </option>
              ))}
            </select>
          </label>
          {hasActiveFilters ? (
            <div style={styles.clearCell}>
              <button type="button" onClick={clearFilters} style={styles.clearBtn}>
                {t('knowledge.clearFilters')}
              </button>
            </div>
          ) : null}
        </div>
      )}

      {knowledgeStyle === 'folders' && folders && (
        <div style={styles.folderLayout}>
          {folderSidebar(folders)}
          <div style={{ minWidth: 0 }}>
            {listToShow.length === 0 ? (
              <div style={styles.empty}>
                <p>{hasActiveFilters ? t('knowledge.emptyFiltered') : t('knowledgeEmpty')}</p>
              </div>
            ) : (
              <ul style={styles.list}>{listToShow.map(renderItemRow)}</ul>
            )}
          </div>
        </div>
      )}

      {knowledgeStyle === 'graph' && (
        <>
          {!graph ? (
            <p style={{ color: 'var(--text-muted)' }}>{t('loading')}</p>
          ) : graph.nodes.length === 0 ? (
            <div style={styles.empty}>
              <p>{t('knowledgeEmpty')}</p>
            </div>
          ) : (
            graphBody
          )}
        </>
      )}

      {knowledgeStyle === 'tags' && (
        <>
          {list.length === 0 ? (
            <div style={styles.empty}>
              <p>{hasActiveFilters ? t('knowledge.emptyFiltered') : t('knowledgeEmpty')}</p>
              {!hasActiveFilters && <Link to="/inbox">{t('nav.inbox')}</Link>}
            </div>
          ) : (
            <ul style={styles.list}>{list.map(renderItemRow)}</ul>
          )}
        </>
      )}

      <KnowledgeDownloadDialog
        open={downloadMode != null}
        onClose={() => {
          if (!downloadBusy) {
            setDownloadMode(null)
            setDownloadErr(null)
          }
        }}
        mode={downloadMode}
        profileDefaultFormat={defaultExportFmt}
        busy={downloadBusy}
        errorText={downloadErr}
        onConfirm={(format) => void runKnowledgeDownload(format)}
      />
    </div>
  )
}

const CONTROL_HEIGHT = '2.5rem'

const styles: Record<string, React.CSSProperties> = {
  page: {
    width: '100%',
    maxWidth: '100%',
  },
  titleRow: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.75rem',
    marginBottom: '0.5rem',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 600,
    margin: 0,
  },
  downloadAllBtn: {
    padding: '0.45rem 0.85rem',
    borderRadius: 8,
    border: '1px solid var(--border)',
    backgroundColor: 'var(--surface)',
    color: 'var(--text)',
    fontSize: '0.8125rem',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  subtitle: {
    color: 'var(--text-muted)',
    marginBottom: '1rem',
    fontSize: '0.9rem',
  },
  filters: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(12rem, 1fr))',
    gap: '0.75rem 1rem',
    alignItems: 'end',
    marginBottom: '1.25rem',
    padding: '1rem 1.125rem',
    borderRadius: 10,
    border: '1px solid var(--border)',
    backgroundColor: 'var(--surface)',
  },
  folderLayout: {
    display: 'grid',
    gridTemplateColumns: 'minmax(11rem, 14rem) 1fr',
    gap: '1rem',
    alignItems: 'start',
  },
  folderSidebar: {
    padding: '0.75rem',
    borderRadius: 10,
    border: '1px solid var(--border)',
    backgroundColor: 'var(--surface)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
  },
  folderSidebarTitle: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    fontWeight: 600,
    margin: '0 0 0.25rem',
  },
  folderChip: {
    textAlign: 'left',
    padding: '0.4rem 0.5rem',
    borderRadius: 6,
    border: '1px solid transparent',
    background: 'transparent',
    color: 'var(--text)',
    cursor: 'pointer',
    fontSize: '0.85rem',
  },
  folderChipActive: {
    borderColor: 'rgba(99, 102, 241, 0.55)',
    backgroundColor: 'rgba(99, 102, 241, 0.10)',
  },
  folderHint: { fontSize: '0.75rem', marginTop: '0.5rem', marginBottom: 0 },
  filterField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
    minWidth: 0,
  },
  filterLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    fontWeight: 500,
    lineHeight: 1.3,
  },
  input: {
    width: '100%',
    minHeight: CONTROL_HEIGHT,
    boxSizing: 'border-box',
    padding: '0 0.625rem',
    borderRadius: 8,
    border: '1px solid var(--border)',
    backgroundColor: 'var(--bg)',
    color: 'var(--text)',
    fontSize: '0.875rem',
    lineHeight: 1.25,
  },
  select: {
    width: '100%',
    minHeight: CONTROL_HEIGHT,
    boxSizing: 'border-box',
    padding: '0 0.5rem',
    borderRadius: 8,
    border: '1px solid var(--border)',
    backgroundColor: 'var(--bg)',
    color: 'var(--text)',
    fontSize: '0.875rem',
    lineHeight: 1.25,
  },
  clearCell: {
    display: 'flex',
    alignItems: 'flex-end',
    minWidth: 0,
  },
  clearBtn: {
    minHeight: CONTROL_HEIGHT,
    boxSizing: 'border-box',
    padding: '0 0.875rem',
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'transparent',
    color: 'var(--text-muted)',
    fontSize: '0.8125rem',
    fontWeight: 500,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  empty: {
    padding: '2rem',
    textAlign: 'center',
    color: 'var(--text-muted)',
  },
  list: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  item: {
    border: '1px solid var(--border)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  itemRow: {
    display: 'flex',
    alignItems: 'stretch',
    gap: 0,
  },
  itemLink: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    padding: '1rem',
    color: 'inherit',
    textDecoration: 'none',
  },
  downloadBtn: {
    flexShrink: 0,
    alignSelf: 'stretch',
    padding: '0 0.85rem',
    border: 'none',
    borderLeft: '1px solid var(--border)',
    backgroundColor: 'var(--surface)',
    color: 'var(--accent)',
    fontSize: '0.8125rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  itemTitle: { fontWeight: 600 },
  meta: { fontSize: '0.8rem', color: 'var(--text-muted)' },
  typeChip: {
    fontWeight: 500,
    color: 'var(--accent)',
  },
  tagsLine: { fontSize: '0.8rem', color: 'var(--text-muted)' },
}
