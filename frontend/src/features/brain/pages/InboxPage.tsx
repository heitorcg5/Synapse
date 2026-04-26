import { useMemo, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { Inbox } from 'lucide-react'
import type { InboxItemResponse } from '@/shared/types/inbox.types'
import { AiReviewModal } from '@/features/content/components/AiReviewModal'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useInboxList } from '../hooks/useInboxList'
import { contentApi } from '@/features/content/api/content-api'
import { getErrorMessage } from '@/shared/utils/api-client'
import { SurfaceContainer } from '@/shared/components/ui/SurfaceContainer'
import { EmptyState } from '@/shared/components/ui/EmptyState'
import { useSSE } from '@/shared/hooks/useSSE'
import { useAuth } from '@/app/auth-context'

const STATUS_KEYS: Record<string, string> = {
  READY: 'statusReady',
  PENDING: 'statusPending',
  PROCESSING: 'statusProcessing',
  FAILED: 'statusFailed',
  CONFIRMED: 'statusReady',
}

export function InboxPage() {
  const { t } = useTranslation()
  const { data: pendingContents, isLoading, error } = useInboxList()
  const { data: contentFolders = [] } = useQuery({
    queryKey: ['content-folders'],
    queryFn: () => contentApi.contentFolders().then((r) => r.data),
  })
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { token } = useAuth()
  const sseEvents = useSSE(token)

  useEffect(() => {
    if (sseEvents.length > 0) {
      // Refresh inbox list whenever an SSE event occurs
      queryClient.invalidateQueries({ queryKey: ['inbox-list'] })
    }
  }, [sseEvents, queryClient])

  const runPipelineMutation = useMutation({
    mutationFn: (inboxItemId: string) => contentApi.runProcessingPipeline(inboxItemId),
    onMutate: async (inboxItemId: string) => {
      await queryClient.cancelQueries({ queryKey: ['inbox-list'] })
      const previousInbox = queryClient.getQueryData<InboxItemResponse[]>(['inbox-list']) ?? []
      queryClient.setQueryData<InboxItemResponse[]>(['inbox-list'], (old) =>
        (old ?? []).map((item) =>
          item.id === inboxItemId ? { ...item, status: 'PROCESSING' } : item,
        ),
      )
      setSelectedProcessIds((prev) => prev.filter((id) => id !== inboxItemId))
      return { previousInbox }
    },
    onError: (_error, _contentId, context) => {
      if (context?.previousInbox) {
        queryClient.setQueryData(['inbox-list'], context.previousInbox)
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['inbox-list'] }),
        queryClient.invalidateQueries({ queryKey: ['content-list'] }),
      ])
    },
  })

  const assignFolderMutation = useMutation({
    mutationFn: ({ inboxItemId, folderId }: { inboxItemId: string; folderId: string | null }) =>
      contentApi.assignFolder(inboxItemId, folderId).then((r) => r.data),
    onMutate: async ({ inboxItemId, folderId }) => {
      await queryClient.cancelQueries({ queryKey: ['inbox-list'] })
      const previousInbox = queryClient.getQueryData<InboxItemResponse[]>(['inbox-list']) ?? []
      const folderName = folderId
        ? (contentFolders.find((folder) => folder.id === folderId)?.name ?? null)
        : null
      queryClient.setQueryData<InboxItemResponse[]>(['inbox-list'], (old) =>
        (old ?? []).map((item) =>
          item.id === inboxItemId
            ? { ...item, folderId, folderName: folderName ?? undefined }
            : item,
        ),
      )
      return { previousInbox }
    },
    onError: (_error, _vars, context) => {
      if (context?.previousInbox) {
        queryClient.setQueryData(['inbox-list'], context.previousInbox)
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['inbox-list'] }),
        queryClient.invalidateQueries({ queryKey: ['content-list'] }),
      ])
    },
  })

  const [selectedProcessIds, setSelectedProcessIds] = useState<string[]>([])
  const [selectedReviewIds, setSelectedReviewIds] = useState<string[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [modalItems, setModalItems] = useState<InboxItemResponse[]>([])

  const list = pendingContents ?? []

  const pendingOrFailed = useMemo(
    () => list.filter((c) => c.status === 'PENDING' || c.status === 'FAILED'),
    [list],
  )
  const processing = useMemo(() => list.filter((c) => c.status === 'PROCESSING'), [list])
  const ready = useMemo(() => list.filter((c) => c.status === 'READY'), [list])

  const selectedForProcessing = useMemo(() => {
    const set = new Set(selectedProcessIds)
    return pendingOrFailed.filter((c) => set.has(c.id))
  }, [pendingOrFailed, selectedProcessIds])

  const selectedReady = useMemo(() => {
    const set = new Set(selectedReviewIds)
    // keep exactly the same queue order as inbox list order
    return ready.filter((c) => set.has(c.id))
  }, [ready, selectedReviewIds])

  const toggleSelectedForProcessing = (id: string) => {
    setSelectedProcessIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      return [...prev, id]
    })
  }

  const toggleSelectedForReview = (id: string) => {
    setSelectedReviewIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      return [...prev, id]
    })
  }

  const processSelected = async () => {
    if (!selectedForProcessing.length) return
    for (const item of selectedForProcessing) {
      // run sequentially to avoid race conditions and preserve deterministic UX
      // eslint-disable-next-line no-await-in-loop
      await runPipelineMutation.mutateAsync(item.id)
    }
  }

  const openReviewSelectedModal = () => {
    setModalItems(selectedReady)
    setModalOpen(true)
  }

  const openSingleReviewModal = (content: InboxItemResponse) => {
    setModalItems([content])
    setModalOpen(true)
  }

  const selectedPending = useMemo(() => {
    const set = new Set(selectedProcessIds)
    return list.filter((c) => set.has(c.id))
  }, [list, selectedProcessIds])

  const selectedReview = useMemo(() => {
    const set = new Set(selectedReviewIds)
    return list.filter((c) => set.has(c.id))
  }, [list, selectedReviewIds])

  const handleModalCompleted = async () => {
    setModalOpen(false)
    setSelectedReviewIds([])
    await Promise.all([
      queryClient.refetchQueries({ queryKey: ['inbox-list'] }),
      queryClient.refetchQueries({ queryKey: ['content-list'] }),
      queryClient.refetchQueries({ queryKey: ['knowledge-list'] }),
    ])
  }

  const translateStatus = (status: string) => t(STATUS_KEYS[status] || status)

  if (isLoading && list.length === 0) {
    return <p className="text-app-muted">{t('loading')}</p>
  }
  if (error && !list.length) {
    return <p className="text-app-error">{t('failedToLoad')}</p>
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-[28px] font-semibold leading-[1.3] tracking-[-0.02em] text-app-text">{t('nav.inbox')}</h1>
        <Link
          to="/upload"
          className="rounded-md bg-brand-purple px-4 py-2 text-white transition-all duration-150 ease-in-out hover:-translate-y-px"
        >
          {t('capture')}
        </Link>
      </div>
      <p className="mb-5 text-[15px] text-[#9CA3AF]">{t('inboxSubtitle')}</p>

      {(selectedPending.length > 0 || selectedReview.length > 0) && (
        <SurfaceContainer className="mb-4 flex items-center gap-3 p-4">
          {selectedPending.length > 0 && (
            <button
              type="button"
              className="rounded-[10px] bg-brand-purple px-4 py-[0.65rem] font-semibold text-white transition-all duration-150 ease-in-out hover:-translate-y-px"
              onClick={() => void processSelected()}
              disabled={runPipelineMutation.isPending}
            >
              {t('inboxProcessSelected')} ({selectedPending.length})
            </button>
          )}
          {selectedReview.length > 0 && (
            <button
              type="button"
              className="rounded-[10px] bg-brand-purple px-4 py-[0.65rem] font-semibold text-white transition-all duration-150 ease-in-out hover:-translate-y-px"
              onClick={openReviewSelectedModal}
            >
              {t('reviewSelected')} ({selectedReview.length})
            </button>
          )}
          <button
            type="button"
            className="rounded-[10px] border border-[var(--border)] bg-transparent px-4 py-[0.65rem] font-semibold text-app-muted transition-all duration-150 ease-in-out hover:-translate-y-px"
            onClick={() => {
              setSelectedProcessIds([])
              setSelectedReviewIds([])
            }}
          >
            {t('clearSelection')}
          </button>
        </SurfaceContainer>
      )}

      {list.length === 0 ? (
        <SurfaceContainer>
          <EmptyState
            icon={<Inbox size={20} />}
            title={t('nav.inbox')}
            description={t('inboxEmpty')}
            actionLabel={t('capture')}
            actionTo="/upload"
          />
        </SurfaceContainer>
      ) : (
        <div className="space-y-5">
          <SurfaceContainer className="mb-0">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-app-muted">{t('pendingSection')}</h3>
            <ul className="flex list-none flex-col gap-2">
              {pendingOrFailed.map((c) => (
                <li
                  key={c.id}
                  className={
                    selectedProcessIds.includes(c.id)
                      ? 'overflow-hidden rounded-lg border border-[rgba(99,102,241,0.55)] bg-[rgba(99,102,241,0.10)]'
                      : 'overflow-hidden rounded-lg border border-[var(--border)]'
                  }
                >
                  <div className="flex items-center gap-4 p-4">
                    <input
                      id={`process-${c.id}`}
                      type="checkbox"
                      checked={selectedProcessIds.includes(c.id)}
                      onChange={() => toggleSelectedForProcessing(c.id)}
                    />
                    <label htmlFor={`process-${c.id}`} className="flex min-w-0 flex-1 cursor-pointer items-center gap-4">
                      <span className="min-w-[80px] font-medium text-app-text">{c.type}</span>
                      <span className="text-sm text-app-muted">{translateStatus(c.status)}</span>
                    </label>
                    <button
                      type="button"
                      className="rounded-md bg-brand-purple px-[0.65rem] py-[0.35rem] text-[0.8rem] font-semibold text-white transition-all duration-150 ease-in-out hover:-translate-y-px"
                      disabled={runPipelineMutation.isPending}
                      onClick={() => runPipelineMutation.mutate(c.id)}
                    >
                      {t('inboxRunProcessing')}
                    </button>
                    <span className="ml-auto text-sm text-app-muted">{new Date(c.capturedAt).toLocaleDateString()}</span>
                  </div>
                </li>
              ))}
            </ul>
          </SurfaceContainer>

          <SurfaceContainer className="mb-0">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-app-muted">{t('processingSection')}</h3>
            <ul className="flex list-none flex-col gap-2">
              {processing.map((c) => (
                <li key={c.id} className="overflow-hidden rounded-lg border border-[var(--border)]">
                  <div className="flex items-center gap-4 p-4">
                    <span className="min-w-[80px] font-medium text-app-text">{c.type}</span>
                    <span className="text-sm text-app-muted">{translateStatus(c.status)}</span>
                    <span className="text-xs text-brand-cyan">{t('aiPreviewLoading')}</span>
                    <span className="ml-auto text-sm text-app-muted">{new Date(c.capturedAt).toLocaleDateString()}</span>
                  </div>
                </li>
              ))}
            </ul>
          </SurfaceContainer>

          <SurfaceContainer className="mb-0">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-app-muted">{t('analyzedSection')}</h3>
            <ul className="flex list-none flex-col gap-2">
              {ready.map((c) => (
                <li
                  key={c.id}
                  className={
                    selectedReviewIds.includes(c.id)
                      ? 'overflow-hidden rounded-lg border border-[rgba(99,102,241,0.55)] bg-[rgba(99,102,241,0.10)]'
                      : 'overflow-hidden rounded-lg border border-[var(--border)]'
                  }
                >
                  <div className="flex items-center gap-4 p-4">
                    <input
                      id={`review-${c.id}`}
                      type="checkbox"
                      checked={selectedReviewIds.includes(c.id)}
                      onChange={() => toggleSelectedForReview(c.id)}
                    />
                    <label htmlFor={`review-${c.id}`} className="flex min-w-0 flex-1 cursor-pointer items-center gap-4">
                      <span className="min-w-[80px] font-medium text-app-text">{c.type}</span>
                      <span className="text-sm text-app-muted">{translateStatus(c.status)}</span>
                    </label>
                    <label className="sr-only" htmlFor={`folder-${c.id}`}>
                      {t('captureFolder')}
                    </label>
                    <select
                      id={`folder-${c.id}`}
                      value={c.folderId ?? ''}
                      onChange={(e) =>
                        assignFolderMutation.mutate({
                          inboxItemId: c.id,
                          folderId: e.target.value || null,
                        })
                      }
                      className="h-10 min-w-[160px] rounded-[10px] border border-[rgba(255,255,255,0.06)] bg-[#101018] px-3 text-xs text-app-text outline-none transition-[border-color,box-shadow,background-color] duration-150 ease-in-out focus:border-[#7C5CFF] focus:shadow-[0_0_0_2px_rgba(124,92,255,0.18)]"
                    >
                      <option value="">{t('captureFolderNone')}</option>
                      {contentFolders.map((folder) => (
                        <option key={folder.id} value={folder.id}>
                          {folder.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[0.8rem] text-brand-purple transition-all duration-150 ease-in-out hover:-translate-y-px"
                      onClick={() => openSingleReviewModal(c)}
                    >
                      {t('reviewOne')}
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[0.8rem] text-brand-purple transition-all duration-150 ease-in-out hover:-translate-y-px"
                      onClick={() => navigate(`/content/${c.id}`)}
                    >
                      {t('details')}
                    </button>
                    <span className="ml-auto text-sm text-app-muted">{new Date(c.capturedAt).toLocaleDateString()}</span>
                  </div>
                </li>
              ))}
            </ul>
          </SurfaceContainer>
        </div>
      )}

      {runPipelineMutation.isError && (
        <p className="mt-3 text-[0.9rem] text-app-error" role="alert">
          {getErrorMessage(runPipelineMutation.error)}
        </p>
      )}
      {assignFolderMutation.isError && (
        <p className="mt-3 text-[0.9rem] text-app-error" role="alert">
          {getErrorMessage(assignFolderMutation.error)}
        </p>
      )}

      {modalOpen && (
        <AiReviewModal
          open={modalOpen}
          items={modalItems}
          onClose={() => setModalOpen(false)}
          onCompleted={handleModalCompleted}
        />
      )}
    </div>
  )
}
