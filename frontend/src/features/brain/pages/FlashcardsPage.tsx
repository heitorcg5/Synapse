import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Layers } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/app/auth-context'
import { userApi } from '@/features/profile/api/user-api'
import { contentApi } from '@/features/content/api/content-api'
import { brainApi } from '../api/brain-api'
import { SurfaceContainer } from '@/shared/components/ui/SurfaceContainer'
import { PageHeader } from '@/shared/components/ui/PageHeader'
import { FilterPanel, type ActiveFilterChip } from '@/shared/components/ui/FilterPanel'
import { FilterField } from '@/shared/components/ui/FilterField'
import { Select } from '@/shared/components/ui/Select'
import { Button } from '@/shared/components/ui/Button'
import { EmptyState } from '@/shared/components/ui/EmptyState'
import { fieldClassName } from '@/shared/components/ui/form-styles'
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
type SessionMode = 'main' | 'retry'

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
  sessionMode: SessionMode
  mainFailedIds: string[]
  retryFailedIds: string[]
}

const STORAGE_KEY = 'synapse.flashcards.v2'

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
  const [sessionMode, setSessionMode] = useState<SessionMode>('main')
  const [mainFailedIds, setMainFailedIds] = useState<string[]>([])
  const [retryFailedIds, setRetryFailedIds] = useState<string[]>([])
  const [hydrated, setHydrated] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const prevFilterKeyRef = useRef<string | null>(null)

  const filterKey = useMemo(
    () => [from, to, type, tag, folderId].join('|'),
    [folderId, from, tag, to, type],
  )

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
    setSessionMode('main')
    setMainFailedIds([])
    setRetryFailedIds([])
  }

  const reviewFailedCards = () => {
    const pool = (sessionMode === 'main' ? mainFailedIds : retryFailedIds).filter((id) => itemById.has(id))
    setSessionOrder(shuffleIds(pool))
    setCurrentIndex(0)
    setShowSummary(false)
    setPhase('retry')
    setSessionMode('retry')
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
        setSessionMode(parsed.sessionMode ?? (parsed.phase === 'retry' ? 'retry' : 'main'))
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

    if (prevFilterKeyRef.current === null) {
      prevFilterKeyRef.current = filterKey
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
      if (sessionOrder.length === 0 || hasInvalidSessionCard) {
        resetMainSession()
      }
      return
    }

    if (prevFilterKeyRef.current !== filterKey) {
      prevFilterKeyRef.current = filterKey
      if (filteredItems.length === 0) {
        setSessionOrder([])
        setCurrentIndex(0)
        setShowSummary(false)
        setPhase('main')
        setMainFailedIds([])
        setRetryFailedIds([])
      } else {
        resetMainSession()
      }
      return
    }

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
  }, [currentIndex, filterKey, filteredItems, hydrated, sessionOrder])

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
      sessionMode,
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
    sessionMode,
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

  const failedCount =
    sessionMode === 'main' ? mainFailedIds.length : retryFailedIds.length
  const canReviewFailed =
    phase === 'complete' &&
    sessionOrder.length > 0 &&
    currentIndex >= sessionOrder.length &&
    failedCount > 0

  const typeLabel = (raw?: string | null) =>
    raw ? t(`contentTypes.${raw}`, { defaultValue: raw }) : null

  const filterChips = useMemo((): ActiveFilterChip[] => {
    const chips: ActiveFilterChip[] = []
    if (from) {
      chips.push({
        id: 'from',
        label: `${t('knowledge.filterFrom')}: ${from}`,
        onRemove: () => setFrom(''),
      })
    }
    if (to) {
      chips.push({
        id: 'to',
        label: `${t('knowledge.filterTo')}: ${to}`,
        onRemove: () => setTo(''),
      })
    }
    if (type) {
      chips.push({
        id: 'type',
        label: `${t('type')}: ${typeLabel(type) ?? type}`,
        onRemove: () => setType(''),
      })
    }
    if (tag) {
      chips.push({
        id: 'tag',
        label: `${t('tags')}: ${tag}`,
        onRemove: () => setTag(''),
      })
    }
    if (folderId) {
      const folderName = allFolders.find((f) => f.id === folderId)?.name ?? folderId
      chips.push({
        id: 'folder',
        label: `${t('knowledge.folderColumn')}: ${folderName}`,
        onRemove: () => setFolderId(''),
      })
    }
    return chips
  }, [allFolders, folderId, from, tag, to, type, t])

  const progressPercent =
    sessionOrder.length > 0 ? Math.round(((currentIndex + 1) / sessionOrder.length) * 100) : 0

  useEffect(() => {
    if (currentCard && !isFinished) {
      setFiltersOpen(false)
    }
  }, [currentCard?.id, isFinished])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!currentCard || isFinished) return
      const target = event.target as HTMLElement | null
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.tagName === 'SELECT') {
        return
      }
      if (event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault()
        if (!showSummary) setShowSummary(true)
        return
      }
      if (!showSummary) return
      if (event.key === 'ArrowLeft' || event.key === '1') {
        event.preventDefault()
        markAnswer(false)
      }
      if (event.key === 'ArrowRight' || event.key === '2') {
        event.preventDefault()
        markAnswer(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [currentCard, isFinished, showSummary, currentIndex, sessionOrder.length])

  if (!token) return <p className="text-app-muted">{t('loading')}</p>
  if (isPending) return <p className="text-app-muted">{t('loading')}</p>

  return (
    <div className="w-full max-w-full space-y-5">
      <PageHeader title={t('flashcards.title')} subtitle={t('flashcards.subtitle')} />

      <FilterPanel
        open={filtersOpen}
        onToggle={() => setFiltersOpen((v) => !v)}
        chips={filterChips}
        onClearAll={hasActiveFilters ? clearFilters : undefined}
        resultCount={filteredItems.length}
      >
        <FilterField label={t('knowledge.filterFrom')}>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={fieldClassName} />
        </FilterField>
        <FilterField label={t('knowledge.filterTo')}>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={fieldClassName} />
        </FilterField>
        <FilterField label={t('type')}>
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">{t('knowledge.filterAllTypes')}</option>
            {(facets?.types ?? []).map((ty) => (
              <option key={ty} value={ty}>
                {typeLabel(ty) ?? ty}
              </option>
            ))}
          </Select>
        </FilterField>
        <FilterField label={t('tags')}>
          <Select value={tag} onChange={(e) => setTag(e.target.value)}>
            <option value="">{t('knowledge.filterAllTags')}</option>
            {(facets?.tags ?? []).map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>
        </FilterField>
        <FilterField label={t('knowledge.folderColumn')}>
          <Select value={folderId} onChange={(e) => setFolderId(e.target.value)}>
            <option value="">{t('knowledge.allFolder')}</option>
            {allFolders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </Select>
        </FilterField>
      </FilterPanel>

      {filteredItems.length === 0 ? (
        <EmptyState
          icon={<Layers size={22} />}
          title={t('flashcards.emptyFiltered')}
          description={hasActiveFilters ? t('knowledge.emptyFiltered') : t('knowledgeEmpty')}
          actionLabel={hasActiveFilters ? t('knowledge.clearFilters') : t('nav.knowledge')}
          actionTo={hasActiveFilters ? undefined : '/knowledge'}
          onAction={hasActiveFilters ? clearFilters : undefined}
        />
      ) : isFinished || !currentCard ? (
        <SurfaceContainer className="mx-auto max-w-xl space-y-5 p-8 text-center">
          <p className="m-0 text-lg font-semibold text-app-text">{t('flashcards.finishedTitle')}</p>
          <p className="m-0 text-app-muted">
            {sessionMode === 'main'
              ? t('flashcards.finishedMainSubtitle', { failed: mainFailedIds.length })
              : t('flashcards.finishedRetrySubtitle', { failed: retryFailedIds.length })}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {canReviewFailed ? (
              <Button type="button" onClick={reviewFailedCards}>
                {t('flashcards.reviewFailed')}
              </Button>
            ) : null}
            <Button type="button" variant="ghost" onClick={resetMainSession}>
              {t('flashcards.restart')}
            </Button>
          </div>
        </SurfaceContainer>
      ) : (
        <div className="mx-auto max-w-2xl space-y-5">
          <div className="space-y-2">
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
            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-purple to-brand-cyan transition-[width] duration-300 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div
            className="flashcard-scene w-full"
            role="presentation"
          >
            <div
              className={`flashcard ${showSummary ? 'flashcard--flipped' : ''} ${!showSummary ? 'cursor-pointer' : ''}`}
              onClick={() => !showSummary && setShowSummary(true)}
              onKeyDown={(e) => {
                if (!showSummary && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault()
                  setShowSummary(true)
                }
              }}
              role={!showSummary ? 'button' : undefined}
              tabIndex={!showSummary ? 0 : undefined}
              aria-label={showSummary ? t('flashcards.back') : t('flashcards.front')}
            >
              <SurfaceContainer className="flashcard-face flex flex-col justify-start p-8">
                <p className="mb-2 shrink-0 text-xs font-semibold uppercase tracking-wide text-app-muted">
                  {t('flashcards.front')}
                </p>
                <div className="app-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
                  <h2 className="m-0 text-2xl font-semibold leading-snug text-app-text">
                    {currentCard.title || t('untitledNote')}
                  </h2>
                  {!showSummary ? (
                    <p className="mb-0 mt-6 text-sm text-app-muted">{t('flashcards.tapToReveal')}</p>
                  ) : null}
                </div>
              </SurfaceContainer>
              <SurfaceContainer className="flashcard-face flashcard-back flex flex-col justify-start p-8">
                <p className="mb-2 shrink-0 text-xs font-semibold uppercase tracking-wide text-app-muted">
                  {t('flashcards.back')}
                </p>
                <div className="app-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
                  <p className="m-0 whitespace-pre-wrap break-words text-base leading-relaxed text-app-text">
                    {currentCard.summary?.trim() || t('noSummaryYet')}
                  </p>
                </div>
              </SurfaceContainer>
            </div>
          </div>

          <p className="m-0 text-center text-xs text-app-muted">{t('flashcards.keyboardHint')}</p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {!showSummary ? (
              <Button type="button" className="min-w-[10rem]" onClick={() => setShowSummary(true)}>
                {t('flashcards.reveal')}
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  className="min-w-[9rem] border-app-error/40 text-app-error hover:border-app-error/60 hover:bg-app-error/10"
                  onClick={() => markAnswer(false)}
                >
                  {t('flashcards.incorrect')}
                </Button>
                <Button type="button" className="min-w-[9rem]" onClick={() => markAnswer(true)}>
                  {t('flashcards.correct')}
                </Button>
              </>
            )}
            <Button type="button" variant="ghost" size="sm" onClick={resetMainSession}>
              {t('flashcards.restart')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
