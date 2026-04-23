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
import { SurfaceContainer } from '@/shared/components/ui/SurfaceContainer'

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
    return <p className="text-app-muted">{t('loading')}</p>
  }

  if (isPending && !list.length) {
    return <p className="text-app-muted">{t('loading')}</p>
  }
  if (isError && !list.length) {
    return (
      <div>
        <p className="text-app-error">{t('failedToLoad')}</p>
        <p className="mt-2 text-[0.85rem] text-app-muted">
          {getErrorMessage(error)}
        </p>
      </div>
    )
  }

  const renderItemRow = (k: KnowledgeItemResponse) => (
    <li key={k.id} className="overflow-hidden rounded-lg border border-[var(--border)]">
      <div className="flex items-stretch">
        <Link
          to={`/knowledge/${k.id}`}
          className="flex min-w-0 flex-1 flex-col gap-1 p-4 text-inherit no-underline"
        >
          <span className="font-semibold">{k.title || t('untitledNote')}</span>
          <span className="text-[0.8rem] text-app-muted">
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
                <span className="font-medium text-brand-purple">{typeLabel(k.sourceContentType)}</span>
              </>
            ) : null}
          </span>
          {knowledgeStyle === 'folders' ? (
            <span className="text-[0.8rem] text-app-muted">
              <strong>{t('knowledge.folderColumn')}:</strong> {k.folderName || t('knowledge.uncategorized')}
              {' · '}
              <strong>{t('tags')}:</strong> {k.tags?.length ? k.tags.join(', ') : '—'}
            </span>
          ) : (
            <span className="text-[0.8rem] text-app-muted">{k.tags?.length ? k.tags.join(', ') : '—'}</span>
          )}
        </Link>
        <button
          type="button"
          className="shrink-0 self-stretch border-l border-[var(--border)] bg-[var(--surface)] px-[0.85rem] text-[0.8125rem] font-semibold text-brand-purple transition-all duration-150 ease-in-out hover:-translate-y-px"
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
        className={
          folderFocus === id
            ? 'rounded-md border border-[rgba(99,102,241,0.55)] bg-[rgba(99,102,241,0.10)] px-2 py-1 text-left text-[0.85rem] text-app-text'
            : 'rounded-md border border-transparent bg-transparent px-2 py-1 text-left text-[0.85rem] text-app-text transition-colors hover:bg-white/5'
        }
      >
        {label}
        {count != null ? ` (${count})` : ''}
      </button>
    )
    const noneCount = groupedByFolder.get(null)?.length ?? 0
    return (
      <div className="flex flex-col gap-[0.35rem] rounded-[10px] border border-[var(--border)] bg-[var(--surface)] p-3">
        <p className="m-0 mb-1 text-[0.75rem] font-semibold text-app-muted">{t('knowledge.folderColumn')}</p>
        {row('all', t('knowledge.allItems'), list.length)}
        {row('none', t('knowledge.uncategorized'), noneCount)}
        {flat.map((f) =>
          row(f.id, f.name, groupedByFolder.get(f.id)?.length ?? 0),
        )}
        <p className="mb-0 mt-2 text-[0.75rem]">
          <Link to="/settings">{t('settingsPage.title')}</Link>
        </p>
      </div>
    )
  }

  const graphBody =
    knowledgeStyle === 'graph' && graph ? (
      <ul className="flex list-none flex-col gap-2">
        {graph.nodes.map((n) => {
          const edges = graph.edges.filter((e) => e.sourceItemId === n.id)
          return (
            <li key={n.id} className="overflow-hidden rounded-lg border border-[var(--border)]">
              <div className="flex items-stretch">
                <div className="min-w-0 flex-1 p-4">
                  <Link to={`/knowledge/${n.id}`} className="font-semibold text-app-text no-underline">
                    {n.title || t('untitledNote')}
                  </Link>
                  {edges.length > 0 && (
                    <ul className="m-0 ml-4 mt-2 list-disc p-0">
                      {edges.map((e) => {
                        const target = graph.nodes.find((x) => x.id === e.targetItemId)
                        return (
                          <li key={`${e.sourceItemId}-${e.targetItemId}`} className="text-[0.85rem]">
                            <Link to={`/knowledge/${e.targetItemId}`}>
                              {target?.title || t('untitledNote')}
                            </Link>
                            <span className="text-app-muted">
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
                  className="shrink-0 self-stretch border-l border-[var(--border)] bg-[var(--surface)] px-[0.85rem] text-[0.8125rem] font-semibold text-brand-purple transition-all duration-150 ease-in-out hover:-translate-y-px"
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
    <div className="w-full max-w-full">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 text-[28px] font-semibold leading-[1.3] tracking-[-0.02em] text-app-text">
          {t('nav.knowledge')}
        </h1>
        {showDownloadAll ? (
          <button
            type="button"
            className="whitespace-nowrap rounded-lg border border-[var(--border)] bg-[var(--surface)] px-[0.85rem] py-[0.45rem] text-[0.8125rem] font-semibold text-app-text transition-all duration-150 ease-in-out hover:-translate-y-px"
            onClick={() => {
              setDownloadErr(null)
              setDownloadMode({ type: 'all' })
            }}
          >
            {t('knowledge.downloadAll')}
          </button>
        ) : null}
      </div>
      <p className="mb-4 text-[15px] text-[#9CA3AF]">{t('knowledgeSubtitle')}</p>
      {knowledgeStyle !== 'tags' && (
        <p className="mb-4 text-[0.85rem] text-[#9CA3AF]">{t('knowledge.layoutFromSettings')}</p>
      )}

      {facetsError ? (
        <div className="mb-3 text-[0.875rem] text-app-error">
          <p className="m-0">{t('knowledge.facetsLoadError')}</p>
          <p className="m-0 mt-[0.35rem] text-[0.8rem] text-app-muted">
            {getErrorMessage(facetsError)}
          </p>
        </div>
      ) : null}

      {knowledgeStyle !== 'graph' && (
        <SurfaceContainer className="mb-5 grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] items-end gap-x-4 gap-y-3 p-4">
          <label className="flex min-w-0 flex-col gap-[0.35rem]">
            <span className="text-[13px] font-medium leading-[1.3] text-app-muted">{t('knowledge.sortByDate')}</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as 'desc' | 'asc')}
              className="min-h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2 text-[0.875rem] leading-[1.25] text-app-text"
            >
              <option value="desc">{t('knowledge.sortNewestFirst')}</option>
              <option value="asc">{t('knowledge.sortOldestFirst')}</option>
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-[0.35rem]">
            <span className="text-[13px] font-medium leading-[1.3] text-app-muted">{t('knowledge.filterFrom')}</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="min-h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-[0.625rem] text-[0.875rem] leading-[1.25] text-app-text"
            />
          </label>
          <label className="flex min-w-0 flex-col gap-[0.35rem]">
            <span className="text-[13px] font-medium leading-[1.3] text-app-muted">{t('knowledge.filterTo')}</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="min-h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-[0.625rem] text-[0.875rem] leading-[1.25] text-app-text"
            />
          </label>
          <label className="flex min-w-0 flex-col gap-[0.35rem]">
            <span className="text-[13px] font-medium leading-[1.3] text-app-muted">{t('tags')}</span>
            <select
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              className="min-h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2 text-[0.875rem] leading-[1.25] text-app-text"
            >
              <option value="">{t('knowledge.filterAllTags')}</option>
              {(facets?.tags ?? []).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-[0.35rem]">
            <span className="text-[13px] font-medium leading-[1.3] text-app-muted">{t('type')}</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="min-h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2 text-[0.875rem] leading-[1.25] text-app-text"
            >
              <option value="">{t('knowledge.filterAllTypes')}</option>
              {(facets?.types ?? []).map((ty) => (
                <option key={ty} value={ty}>
                  {typeLabel(ty) ?? ty}
                </option>
              ))}
            </select>
          </label>
          {hasActiveFilters ? (
            <div className="flex min-w-0 items-end">
              <button
                type="button"
                onClick={clearFilters}
                className="min-h-10 whitespace-nowrap rounded-lg border border-[var(--border)] bg-transparent px-[0.875rem] text-[0.8125rem] font-medium text-app-muted transition-all duration-150 ease-in-out hover:-translate-y-px"
              >
                {t('knowledge.clearFilters')}
              </button>
            </div>
          ) : null}
        </SurfaceContainer>
      )}

      {knowledgeStyle === 'folders' && folders && (
        <SurfaceContainer className="grid grid-cols-[minmax(11rem,14rem)_1fr] items-start gap-4">
          {folderSidebar(folders)}
          <div className="min-w-0">
            {listToShow.length === 0 ? (
              <div className="p-8 text-center text-app-muted">
                <p>{hasActiveFilters ? t('knowledge.emptyFiltered') : t('knowledgeEmpty')}</p>
              </div>
            ) : (
              <ul className="flex list-none flex-col gap-2">{listToShow.map(renderItemRow)}</ul>
            )}
          </div>
        </SurfaceContainer>
      )}

      {knowledgeStyle === 'graph' && (
        <>
          {!graph ? (
            <p className="text-app-muted">{t('loading')}</p>
          ) : graph.nodes.length === 0 ? (
            <SurfaceContainer className="text-center text-app-muted">
              <p>{t('knowledgeEmpty')}</p>
            </SurfaceContainer>
          ) : (
            <SurfaceContainer>{graphBody}</SurfaceContainer>
          )}
        </>
      )}

      {knowledgeStyle === 'tags' && (
        <>
          {list.length === 0 ? (
            <SurfaceContainer className="text-center text-app-muted">
              <p>{hasActiveFilters ? t('knowledge.emptyFiltered') : t('knowledgeEmpty')}</p>
              {!hasActiveFilters && <Link to="/inbox">{t('nav.inbox')}</Link>}
            </SurfaceContainer>
          ) : (
            <SurfaceContainer>
              <ul className="flex list-none flex-col gap-2">{list.map(renderItemRow)}</ul>
            </SurfaceContainer>
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
