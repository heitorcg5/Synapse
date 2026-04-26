import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ChevronRight, Folder, FolderOpen, Network, SlidersHorizontal } from 'lucide-react'
import { useAuth } from '@/app/auth-context'
import { userApi } from '@/features/profile/api/user-api'
import { formatUserDateTime } from '@/shared/preferences/user-datetime'
import {
  getErrorMessage,
  parseContentDispositionFilename,
} from '@/shared/utils/api-client'
import type { KnowledgeExportFormat, KnowledgeFolderResponse, KnowledgeItemResponse } from '@/shared/types/knowledge.types'
import { normalizeKnowledgeExportFormat } from '@/shared/types/knowledge.types'
import { brainApi, type KnowledgeListParams } from '../api/brain-api'
import { contentApi } from '@/features/content/api/content-api'
import { KnowledgeDownloadDialog, type KnowledgeDownloadMode } from '../components/KnowledgeDownloadDialog'
import { SurfaceContainer } from '@/shared/components/ui/SurfaceContainer'
import { FolderItem } from '@/shared/components/ui/FolderItem'

export function KnowledgePage() {
  const { t, i18n } = useTranslation()
  const { token } = useAuth()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [tag, setTag] = useState('')
  const [type, setType] = useState('')
  const [sort, setSort] = useState<'desc' | 'asc'>('desc')
  const [folderFocus, setFolderFocus] = useState<string | 'all'>('all')
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [filtersOpen, setFiltersOpen] = useState(false)

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
    queryKey: ['content-folders', token ?? ''] as const,
    queryFn: () =>
      contentApi
        .contentFolders()
        .then((r) => r.data.map((f) => ({ id: f.id, parentId: null, name: f.name }))),
    enabled: !!token,
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
    if (folderFocus === 'all') return list
    return list.filter((k) => k.folderId === folderFocus)
  }, [list, folderFocus])

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

  const folderChildren = useMemo(() => {
    const map = new Map<string | null, KnowledgeFolderResponse[]>()
    for (const folder of folders ?? []) {
      const parentKey = folder.parentId ?? null
      const arr = map.get(parentKey) ?? []
      arr.push(folder)
      map.set(parentKey, arr)
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.name.localeCompare(b.name))
    }
    return map
  }, [folders])

  const folderById = useMemo(() => {
    const map = new Map<string, KnowledgeFolderResponse>()
    for (const folder of folders ?? []) {
      map.set(folder.id, folder)
    }
    return map
  }, [folders])

  const breadcrumbFolders = useMemo(() => {
    if (folderFocus === 'all') return []
    const chain: KnowledgeFolderResponse[] = []
    let cursor = folderById.get(folderFocus)
    while (cursor) {
      chain.unshift(cursor)
      cursor = cursor.parentId ? folderById.get(cursor.parentId) : undefined
    }
    return chain
  }, [folderById, folderFocus])

  const toggleExpanded = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) {
        next.delete(folderId)
      } else {
        next.add(folderId)
      }
      return next
    })
  }

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
            {k.inboxCapturedAt || k.createdAt
              ? formatUserDateTime(
                  (k.inboxCapturedAt || k.createdAt) as string,
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
          <span className="text-[0.8rem] text-app-muted">
            <strong>{t('knowledge.folderColumn')}:</strong> {k.folderName || t('knowledge.uncategorized')}
            {' · '}
            <strong>{t('tags')}:</strong> {k.tags?.length ? k.tags.join(', ') : '—'}
          </span>
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

  const renderFolderTree = (parentId: string | null, level: number) => {
    const rows = folderChildren.get(parentId) ?? []
    return rows.map((folder) => {
      const children = folderChildren.get(folder.id) ?? []
      const hasChildren = children.length > 0
      const expanded = expandedFolders.has(folder.id)
      const isActive = folderFocus === folder.id
      return (
        <div key={folder.id} className="space-y-2">
          <div
            className="flex items-center gap-2"
            style={{ paddingLeft: `${level * 16}px` }}
          >
            <button
              type="button"
              aria-label={expanded ? 'Collapse folder' : 'Expand folder'}
              onClick={() => hasChildren && toggleExpanded(folder.id)}
              className="inline-flex h-5 w-5 items-center justify-center rounded-md text-[#8A8FA0] transition-colors duration-150 hover:bg-white/5 hover:text-[#B7BDCC]"
            >
              {hasChildren ? (
                <ChevronRight
                  size={14}
                  className={`transition-transform duration-200 ease-in-out ${expanded ? 'rotate-90' : ''}`}
                />
              ) : (
                <span className="h-[14px] w-[14px]" />
              )}
            </button>
            <FolderItem
              icon={expanded ? <FolderOpen size={14} /> : <Folder size={14} />}
              name={folder.name}
              count={groupedByFolder.get(folder.id)?.length ?? 0}
              active={isActive}
              onClick={() => setFolderFocus(folder.id)}
              className="border border-transparent"
            />
          </div>
          <div
            className="grid transition-[grid-template-rows,opacity] duration-200 ease-in-out"
            style={{
              gridTemplateRows: hasChildren && expanded ? '1fr' : '0fr',
              opacity: hasChildren && expanded ? 1 : 0.65,
            }}
          >
            <div className="overflow-hidden">{hasChildren ? renderFolderTree(folder.id, level + 1) : null}</div>
          </div>
        </div>
      )
    })
  }

  const listToShow = filteredForFolder

  const showDownloadAll = list.length > 0

  return (
    <div className="w-full max-w-full">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 text-[28px] font-semibold leading-[1.3] tracking-[-0.02em] text-app-text">
          {t('nav.knowledge')}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/knowledge/graph"
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-[var(--border)] bg-[var(--surface)] px-[0.85rem] py-[0.45rem] text-[0.8125rem] font-semibold text-app-text no-underline transition-all duration-150 ease-in-out hover:-translate-y-px"
          >
            <Network size={14} />
            {t('knowledge.graphView')}
          </Link>
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
      </div>
      <p className="mb-4 text-[15px] text-[#9CA3AF]">{t('knowledgeSubtitle')}</p>

      {facetsError ? (
        <div className="mb-3 text-[0.875rem] text-app-error">
          <p className="m-0">{t('knowledge.facetsLoadError')}</p>
          <p className="m-0 mt-[0.35rem] text-[0.8rem] text-app-muted">
            {getErrorMessage(facetsError)}
          </p>
        </div>
      ) : null}

      <div className="mb-4 flex items-center justify-end">
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[0.82rem] font-medium text-app-text transition-all duration-150 ease-in-out hover:-translate-y-px hover:bg-white/5"
        >
          <SlidersHorizontal size={15} />
          {t('knowledge.filtersButton')}
        </button>
      </div>

      {filtersOpen && (
        <SurfaceContainer className="mb-5 grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] items-end gap-x-4 gap-y-3 p-4">
          <label className="flex min-w-0 flex-col gap-[0.35rem]">
            <span className="text-[13px] font-medium leading-[1.3] text-app-muted">{t('knowledge.sortByDate')}</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as 'desc' | 'asc')}
              className="h-11 w-full rounded-[10px] border border-[rgba(255,255,255,0.06)] bg-[#101018] px-3 text-[0.875rem] leading-[1.25] text-app-text"
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
              className="h-11 w-full rounded-[10px] border border-[rgba(255,255,255,0.06)] bg-[#101018] px-3 text-[0.875rem] leading-[1.25] text-app-text"
            />
          </label>
          <label className="flex min-w-0 flex-col gap-[0.35rem]">
            <span className="text-[13px] font-medium leading-[1.3] text-app-muted">{t('knowledge.filterTo')}</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-11 w-full rounded-[10px] border border-[rgba(255,255,255,0.06)] bg-[#101018] px-3 text-[0.875rem] leading-[1.25] text-app-text"
            />
          </label>
          <label className="flex min-w-0 flex-col gap-[0.35rem]">
            <span className="text-[13px] font-medium leading-[1.3] text-app-muted">{t('tags')}</span>
            <select
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              className="h-11 w-full rounded-[10px] border border-[rgba(255,255,255,0.06)] bg-[#101018] px-3 text-[0.875rem] leading-[1.25] text-app-text"
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
              className="h-11 w-full rounded-[10px] border border-[rgba(255,255,255,0.06)] bg-[#101018] px-3 text-[0.875rem] leading-[1.25] text-app-text"
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
                className="h-11 whitespace-nowrap rounded-[10px] border border-[var(--border)] bg-transparent px-[0.875rem] text-[0.8125rem] font-medium text-app-muted transition-all duration-150 ease-in-out hover:-translate-y-px"
              >
                {t('knowledge.clearFilters')}
              </button>
            </div>
          ) : null}
        </SurfaceContainer>
      )}

      {folders && (
        <SurfaceContainer className="grid grid-cols-[260px_minmax(0,1fr)] items-start gap-5">
          <aside className="rounded-[14px] border border-white/[0.06] bg-[#0f0f16] p-3">
            <p className="mb-2 px-2 text-[0.74rem] font-semibold uppercase tracking-wide text-[#8F95A6]">
              {t('knowledge.folderColumn')}
            </p>
            <div className="space-y-2">
              <FolderItem
                icon={<Folder size={14} />}
                name={t('knowledge.allFolder')}
                count={list.length}
                active={folderFocus === 'all'}
                onClick={() => setFolderFocus('all')}
                className="border border-transparent"
              />
              {renderFolderTree(null, 0)}
            </div>
            <p className="mb-0 mt-3 px-2 text-[0.75rem] text-[#8F95A6]">
              <Link to="/settings">{t('settingsPage.title')}</Link>
            </p>
          </aside>
          <div className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setFolderFocus('all')}
                className={folderFocus === 'all' ? 'text-sm text-white' : 'text-sm text-[#9CA3AF] transition-colors hover:text-white'}
              >
                {t('nav.knowledge')}
              </button>
              {breadcrumbFolders.map((crumb, idx) => {
                const isActive = idx === breadcrumbFolders.length - 1
                return (
                  <div key={crumb.id} className="flex items-center gap-2">
                    <ChevronRight size={14} className="text-[#9CA3AF]" />
                    <button
                      type="button"
                      onClick={() => setFolderFocus(crumb.id)}
                      className={isActive ? 'text-sm text-white' : 'text-sm text-[#9CA3AF] transition-colors hover:text-white'}
                    >
                      {crumb.name}
                    </button>
                  </div>
                )
              })}
            </div>
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
