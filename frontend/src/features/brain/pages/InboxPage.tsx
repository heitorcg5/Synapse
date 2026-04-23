import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { Inbox } from 'lucide-react'
import type { ContentResponse } from '@/shared/types/api'
import { AiReviewModal } from '@/features/content/components/AiReviewModal'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useInboxList } from '../hooks/useInboxList'
import { useAuth } from '@/app/auth-context'
import { userApi } from '@/features/profile/api/user-api'
import { contentApi } from '@/features/content/api/content-api'
import { getErrorMessage } from '@/shared/utils/api-client'
import { SurfaceContainer } from '@/shared/components/ui/SurfaceContainer'
import { EmptyState } from '@/shared/components/ui/EmptyState'

const STATUS_KEYS: Record<string, string> = {
  READY: 'statusReady',
  PENDING: 'statusPending',
  PROCESSING: 'statusProcessing',
  FAILED: 'statusFailed',
}

export function InboxPage() {
  const { t } = useTranslation()
  const { token } = useAuth()
  const profileQueryKey = ['user-profile', token ?? ''] as const
  const { data: profile } = useQuery({
    queryKey: profileQueryKey,
    queryFn: () => userApi.getMe().then((r) => r.data),
    enabled: !!token,
  })
  const { data: pendingContents, isLoading, error } = useInboxList()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isManualProcessing = profile?.processingMode === 'manual'

  const runPipelineMutation = useMutation({
    mutationFn: (contentId: string) => contentApi.runProcessingPipeline(contentId),
    onMutate: async (contentId: string) => {
      await queryClient.cancelQueries({ queryKey: ['inbox-list'] })
      const previousInbox = queryClient.getQueryData<ContentResponse[]>(['inbox-list']) ?? []
      // Optimistic UX: remove from pending inbox immediately while pipeline starts.
      queryClient.setQueryData<ContentResponse[]>(['inbox-list'], (old) =>
        (old ?? []).filter((item) => item.id !== contentId),
      )
      setSelectedIds((prev) => prev.filter((id) => id !== contentId))
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

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [modalItems, setModalItems] = useState<ContentResponse[]>([])

  const list = pendingContents ?? []

  const selectedPending = useMemo(() => {
    const set = new Set(selectedIds)
    return list.filter((c) => set.has(c.id))
  }, [list, selectedIds])

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      return [...prev, id]
    })
  }

  const openModal = () => {
    setModalItems(selectedPending)
    setModalOpen(true)
  }

  const handleModalCompleted = async () => {
    setModalOpen(false)
    setSelectedIds([])
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

      {isManualProcessing && (
        <p
          className="mb-4 rounded-lg border border-[rgba(99,102,241,0.25)] bg-[rgba(99,102,241,0.08)] px-4 py-3 text-[0.9rem] text-app-text"
          role="note"
        >
          {t('inboxManualModeHint')}
        </p>
      )}

      {selectedPending.length > 0 && (
        <SurfaceContainer className="mb-4 flex items-center gap-3 p-4">
          <button
            type="button"
            className="rounded-[10px] bg-brand-purple px-4 py-[0.65rem] font-semibold text-white transition-all duration-150 ease-in-out hover:-translate-y-px"
            onClick={openModal}
          >
            {t('reviewSelected')} ({selectedPending.length})
          </button>
          <button
            type="button"
            className="rounded-[10px] border border-[var(--border)] bg-transparent px-4 py-[0.65rem] font-semibold text-app-muted transition-all duration-150 ease-in-out hover:-translate-y-px"
            onClick={() => setSelectedIds([])}
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
        <SurfaceContainer className="mb-5">
          <ul className="flex list-none flex-col gap-2">
            {list.map((c) => (
              <li
                key={c.id}
                className={
                  selectedIds.includes(c.id)
                    ? 'overflow-hidden rounded-lg border border-[rgba(99,102,241,0.55)] bg-[rgba(99,102,241,0.10)]'
                    : 'overflow-hidden rounded-lg border border-[var(--border)]'
                }
              >
                <div className="flex items-center gap-4 p-4">
                  <input
                    id={`select-${c.id}`}
                    type="checkbox"
                    checked={selectedIds.includes(c.id)}
                    onChange={() => toggleSelected(c.id)}
                  />
                  <label
                    htmlFor={`select-${c.id}`}
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-4"
                  >
                    <span className="min-w-[80px] font-medium text-app-text">{c.type}</span>
                    <span className="text-sm text-app-muted">{translateStatus(c.status)}</span>
                  </label>
                  {isManualProcessing && (
                    <button
                      type="button"
                      className="rounded-md bg-brand-purple px-[0.65rem] py-[0.35rem] text-[0.8rem] font-semibold text-white transition-all duration-150 ease-in-out hover:-translate-y-px"
                      disabled={runPipelineMutation.isPending}
                      onClick={() => runPipelineMutation.mutate(c.id)}
                    >
                      {t('inboxRunProcessing')}
                    </button>
                  )}
                  <button
                    type="button"
                    className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[0.8rem] text-brand-purple transition-all duration-150 ease-in-out hover:-translate-y-px"
                    onClick={() => navigate(`/content/${c.id}`)}
                  >
                    {t('details')}
                  </button>
                  <span className="ml-auto text-sm text-app-muted">{new Date(c.uploadedAt).toLocaleDateString()}</span>
                </div>
              </li>
            ))}
          </ul>
        </SurfaceContainer>
      )}

      {runPipelineMutation.isError && (
        <p className="mt-3 text-[0.9rem] text-app-error" role="alert">
          {getErrorMessage(runPipelineMutation.error)}
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
