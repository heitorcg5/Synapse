import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { SlidersHorizontal } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/app/auth-context'
import { userApi } from '@/features/profile/api/user-api'
import { contentApi } from '@/features/content/api/content-api'
import { brainApi } from '../api/brain-api'
import { SurfaceContainer } from '@/shared/components/ui/SurfaceContainer'
import type { KnowledgeFolderResponse, KnowledgeItemResponse } from '@/shared/types/knowledge.types'

function shuffleIds(ids: string[]): string[] {
  const arr = [...ids]
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
  }
  return arr
}

function toDateOnly(value?: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

type FlashcardsPhase = 'main' | 'retry' | 'complete'

type FlashcardsState = {
  from: string
  to: string
  type: string
  tag: string
  folderId: string
  sessionOrder: string[]
  currentIndex: number
  showSummary: boolean
  phase: FlashcardsPhase
  mainFailedIds: string[]
  retryFailedIds: string[]
}

const STORAGE_KEY = 'synapse.flashcards.v2'

const selectClassName =
  'h-11 w-full rounded-[10px] border border-[rgba(255,255,255,0.06)] bg-[#101018] px-3 text-[0.875rem] leading-[1.25] text-app-text'

export function FlashcardsPage() {
  const { t } = useTranslation()
  const { token } = useAuth()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [type, setType] = useState('')
  const [tag, setTag] = useState('')
  const [folderId, setFolderId] = useState('')
  const [sessionOrder, setSessionOrder] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showSummary, setShowSummary] = useState(false)
  const [phase, setPhase] = useState<FlashcardsPhase>('main')
  const [mainFailedIds, setMainFailedIds] = useState<string[]>([])
  const [retryFailedIds, setRetryFailedIds] = useState<string[]>([])
  const [hydrated, setHydrated] = useState(false)
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

  const { data: items, isPending } = useQuery({
    queryKey: ['flashcards-items', token ?? '', effectiveTimezone ?? ''] as const,
    queryFn: () => brainApi.knowledgeList(undefined, effectiveTimezone).then((r) => r.data),
    enabled: !!token,
  })

  const { data: facets } = useQuery({
    queryKey: ['flashcards-facets', token ?? ''] as const,
    queryFn: () => brainApi.knowledgeFacets().then((r) => r.data),
    enabled: !!token,
  })

  const { data: folders } = useQuery({
    queryKey: ['flashcards-folders', token ?? ''] as const,
    queryFn: () => brainApi.knowledgeFolders().then((r) => r.data),
    enabled: !!token,
  })

  const { data: legacyFolders } = useQuery({
    queryKey: ['flashcards-content-folders', token ?? ''] as const,
    queryFn: () =>
      contentApi
        .contentFolders()
        .then((r) => r.data.map((f) => ({ id: f.id, parentId: null, name: f.name }) as KnowledgeFolderResponse)),
    enabled: !!token,
  })

  const allFolders = useMemo(() => {
    const byId = new Map<string, KnowledgeFolderResponse>()
    for (const folder of folders ?? []) byId.set(folder.id, folder)
    for (const folder of legacyFolders ?? []) {
      if (!byId.has(folder.id)) byId.set(folder.id, folder)
    }
    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [folders, legacyFolders])

  const list = items ?? []

  const filteredItems = useMemo(() => {
    return list.filter((item) => {
      const dateValue = toDateOnly(item.inboxCapturedAt || item.createdAt)
      if (from && dateValue && dateValue < from) return false
      if (to && dateValue && dateValue > to) return false
      if (type && item.sourceContentType !== type) return false
      if (folderId && item.folderId !== folderId) return false
      if (tag) {
        const cardTags = item.tags ?? []
        if (!cardTags.includes(tag)) return false
      }
      return true
    })
  }, [folderId, from, list, tag, to, type])

  const itemById = useMemo(() => {
    const map = new Map<string, KnowledgeItemResponse>()
    for (const item of filteredItems) {
      map.set(item.id, item)
    }
    return map
  }, [filteredItems])

  const resetMainSession = () => {
    setSessionOrder(shuffleIds(filteredItems.map((item) => item.id)))
    setCurrentIndex(0)
    setShowSummary(false)
    setPhase('main')
    setMainFailedIds([])
    setRetryFailedIds([])
  }

  const startRetrySession = () => {
    const pool = mainFailedIds.filter((id) => itemById.has(id))
    setSessionOrder(shuffleIds(pool))
    setCurrentIndex(0)
    setShowSummary(false)
    setPhase('retry')
    setRetryFailedIds([])
  }

  const runRetryAgain = () => {
    const pool = retryFailedIds.filter((id) => itemById.has(id))
    setSessionOrder(shuffleIds(pool))
    setCurrentIndex(0)
    setShowSummary(false)
    setPhase('retry')
    setRetryFailedIds([])
  }

  useEffect(() => {
    if (hydrated) return
    try {
      const raw =
        window.localStorage.getItem(STORAGE_KEY) ??
        window.localStorage.getItem('synapse.flashcards.v1')
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<FlashcardsState> & {
          selectedTypes?: string[]
          selectedTags?: string[]
          selectedFolders?: string[]
        }
        setFrom(parsed.from ?? '')
        setTo(parsed.to ?? '')
        setType(parsed.type ?? parsed.selectedTypes?.[0] ?? '')
        setTag(parsed.tag ?? parsed.selectedTags?.[0] ?? '')
        setFolderId(parsed.folderId ?? parsed.selectedFolders?.[0] ?? '')
        setSessionOrder(parsed.sessionOrder ?? [])
        setCurrentIndex(parsed.currentIndex ?? 0)
        setShowSummary(Boolean(parsed.showSummary))
        setPhase(parsed.phase ?? 'main')
        setMainFailedIds(parsed.mainFailedIds ?? [])
        setRetryFailedIds(parsed.retryFailedIds ?? [])
      }
    } catch {
      // Ignore persisted state read failures and keep defaults.
    } finally {
      setHydrated(true)
    }
  }, [hydrated])

  useEffect(() => {
    if (!hydrated) return
    if (filteredItems.length === 0) {
      setSessionOrder([])
      setCurrentIndex(0)
      setShowSummary(false)
      setPhase('main')
      setMainFailedIds([])
      setRetryFailedIds([])
      return
    }
    const validIds = new Set(filteredItems.map((item) => item.id))
    const hasInvalidSessionCard = sessionOrder.some((id) => !validIds.has(id))
    const currentId = sessionOrder[currentIndex]
    const missingCurrent = currentId ? !validIds.has(currentId) : false
    if (sessionOrder.length === 0 || hasInvalidSessionCard || missingCurrent) {
      resetMainSession()
      return
    }
    setMainFailedIds((prev) => prev.filter((id) => validIds.has(id)))
    setRetryFailedIds((prev) => prev.filter((id) => validIds.has(id)))
  }, [currentIndex, filteredItems, hydrated, sessionOrder])

  useEffect(() => {
    if (!hydrated) return
    const payload: FlashcardsState = {
      from,
      to,
      type,
      tag,
      folderId,
      sessionOrder,
      currentIndex,
      showSummary,
      phase,
      mainFailedIds,
      retryFailedIds,
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }, [
    currentIndex,
    folderId,
    from,
    hydrated,
    mainFailedIds,
    phase,
    retryFailedIds,
    sessionOrder,
    showSummary,
    tag,
    to,
    type,
  ])

  const currentId = sessionOrder[currentIndex]
  const currentCard = currentId ? itemById.get(currentId) : undefined
  const isFinished = sessionOrder.length > 0 && currentIndex >= sessionOrder.length
  const remaining = Math.max(sessionOrder.length - currentIndex - 1, 0)

  const markAnswer = (isCorrect: boolean) => {
    if (!currentId) return
    if (phase === 'main' && !isCorrect) {
      setMainFailedIds((prev) => (prev.includes(currentId) ? prev : [...prev, currentId]))
    }
    if (phase === 'retry' && !isCorrect) {
      setRetryFailedIds((prev) => (prev.includes(currentId) ? prev : [...prev, currentId]))
    }
    const nextIndex = currentIndex + 1
    if (nextIndex >= sessionOrder.length) {
      setCurrentIndex(nextIndex)
      setShowSummary(false)
      setPhase('complete')
      return
    }
    setCurrentIndex(nextIndex)
    setShowSummary(false)
  }

  const hasActiveFilters = Boolean(from || to || type || tag || folderId)

  const clearFilters = () => {
    setFrom('')
    setTo('')
    setType('')
    setTag('')
    setFolderId('')
  }

  const typeLabel = (raw?: string | null) =>
    raw ? t(`contentTypes.${raw}`, { defaultValue: raw }) : null

  if (!token) return <p className="text-app-muted">{t('loading')}</p>
  if (isPending) return <p className="text-app-muted">{t('loading')}</p>

  return (
    <div className="w-full max-w-full space-y-5">
      <div>
        <h1 className="m-0 text-[28px] font-semibold leading-[1.3] tracking-[-0.02em] text-app-text">
          {t('flashcards.title')}
        </h1>
        <p className="mb-0 mt-2 text-[15px] text-[#9CA3AF]">{t('flashcards.subtitle')}</p>
      </div>

      <div className="flex items-center justify-end gap-2">
        {hasActiveFilters && !filtersOpen ? (
          <span className="text-[0.8rem] text-app-muted">{t('flashcards.filtersActive')}</span>
        ) : null}
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          className="inline-flex items-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[0.82rem] font-medium text-app-text transition-all duration-150 ease-in-out hover:-translate-y-px hover:bg-white/5"
        >
          <SlidersHorizontal size={15} />
          {t('knowledge.filtersButton')}
        </button>
      </div>

      {filtersOpen ? (
        <SurfaceContainer className="grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] items-end gap-x-4 gap-y-3 p-4">
          <label className="flex min-w-0 flex-col gap-[0.35rem]">
            <span className="text-[13px] font-medium leading-[1.3] text-app-muted">{t('knowledge.filterFrom')}</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className={selectClassName}
            />
          </label>
          <label className="flex min-w-0 flex-col gap-[0.35rem]">
            <span className="text-[13px] font-medium leading-[1.3] text-app-muted">{t('knowledge.filterTo')}</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className={selectClassName}
            />
          </label>
          <label className="flex min-w-0 flex-col gap-[0.35rem]">
            <span className="text-[13px] font-medium leading-[1.3] text-app-muted">{t('type')}</span>
            <select value={type} onChange={(e) => setType(e.target.value)} className={selectClassName}>
              <option value="">{t('knowledge.filterAllTypes')}</option>
              {(facets?.types ?? []).map((ty) => (
                <option key={ty} value={ty}>
                  {typeLabel(ty) ?? ty}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-[0.35rem]">
            <span className="text-[13px] font-medium leading-[1.3] text-app-muted">{t('tags')}</span>
            <select value={tag} onChange={(e) => setTag(e.target.value)} className={selectClassName}>
              <option value="">{t('knowledge.filterAllTags')}</option>
              {(facets?.tags ?? []).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-[0.35rem]">
            <span className="text-[13px] font-medium leading-[1.3] text-app-muted">{t('knowledge.folderColumn')}</span>
            <select value={folderId} onChange={(e) => setFolderId(e.target.value)} className={selectClassName}>
              <option value="">{t('knowledge.allFolder')}</option>
              {allFolders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
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
      ) : null}

      {filteredItems.length === 0 ? (
        <SurfaceContainer className="p-8 text-center text-app-muted">
          {t('flashcards.emptyFiltered')}
        </SurfaceContainer>
      ) : isFinished || !currentCard ? (
        <SurfaceContainer className="space-y-4 p-8 text-center">
          <p className="m-0 text-lg font-semibold text-app-text">{t('flashcards.finishedTitle')}</p>
          <p className="m-0 text-app-muted">
            {phase === 'main'
              ? t('flashcards.finishedMainSubtitle', { failed: mainFailedIds.length })
              : t('flashcards.finishedRetrySubtitle', { failed: retryFailedIds.length })}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {phase === 'complete' && mainFailedIds.length > 0 && sessionOrder.length > 0 && currentIndex >= sessionOrder.length ? (
              <button
                type="button"
                onClick={startRetrySession}
                className="rounded-lg bg-brand-purple px-4 py-2 text-sm font-semibold text-white"
              >
                {t('flashcards.reviewFailed')}
              </button>
            ) : null}
            {phase === 'complete' && retryFailedIds.length > 0 && sessionOrder.length > 0 && currentIndex >= sessionOrder.length ? (
              <button
                type="button"
                onClick={runRetryAgain}
                className="rounded-lg bg-brand-purple px-4 py-2 text-sm font-semibold text-white"
              >
                {t('flashcards.reviewFailedAgain')}
              </button>
            ) : null}
            <button
              type="button"
              onClick={resetMainSession}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-app-text"
            >
              {t('flashcards.restart')}
            </button>
          </div>
        </SurfaceContainer>
      ) : (
        <SurfaceContainer className="space-y-5 p-5">
          <div className="flex items-center justify-between text-sm text-app-muted">
            <span>
              {t('flashcards.progress', {
                current: currentIndex + 1,
                total: sessionOrder.length,
              })}
            </span>
            <span>
              {phase === 'retry' ? t('flashcards.retryMode') : t('flashcards.mainMode')} ·{' '}
              {t('flashcards.remaining', { count: remaining })}
            </span>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[#101018] p-5">
            <p className="mb-2 text-xs uppercase tracking-wide text-app-muted">{t('flashcards.front')}</p>
            <h2 className="m-0 text-xl font-semibold text-app-text">
              {currentCard.title || t('untitledNote')}
            </h2>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[#101018] p-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="m-0 text-xs uppercase tracking-wide text-app-muted">{t('flashcards.back')}</p>
              <button
                type="button"
                onClick={() => setShowSummary((v) => !v)}
                className="text-xs font-semibold text-brand-purple"
              >
                {showSummary ? t('flashcards.hideSummary') : t('flashcards.showSummary')}
              </button>
            </div>
            {showSummary ? (
              <p className="m-0 whitespace-pre-wrap text-app-text">
                {currentCard.summary?.trim() || t('noSummaryYet')}
              </p>
            ) : (
              <p className="m-0 text-app-muted">{t('flashcards.hiddenSummaryHint')}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {!showSummary ? (
              <button
                type="button"
                onClick={() => setShowSummary(true)}
                className="rounded-lg bg-brand-purple px-4 py-2 text-sm font-semibold text-white"
              >
                {t('flashcards.reveal')}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => markAnswer(false)}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-app-text"
                >
                  {t('flashcards.incorrect')}
                </button>
                <button
                  type="button"
                  onClick={() => markAnswer(true)}
                  className="rounded-lg bg-brand-purple px-4 py-2 text-sm font-semibold text-white"
                >
                  {t('flashcards.correct')}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={resetMainSession}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-app-text"
            >
              {t('flashcards.restart')}
            </button>
          </div>
        </SurfaceContainer>
      )}
    </div>
  )
}
