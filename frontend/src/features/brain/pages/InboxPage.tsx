import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import type { ContentResponse } from '@/shared/types/api'
import { AiReviewModal } from '@/features/content/components/AiReviewModal'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useInboxList } from '../hooks/useInboxList'
import { useAuth } from '@/app/auth-context'
import { userApi } from '@/features/profile/api/user-api'
import { contentApi } from '@/features/content/api/content-api'
import { getErrorMessage } from '@/shared/utils/api-client'

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
    return <p style={{ color: 'var(--text-muted)' }}>{t('loading')}</p>
  }
  if (error && !list.length) {
    return (
      <p style={{ color: 'var(--error)' }}>{t('failedToLoad')}</p>
    )
  }

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>{t('nav.inbox')}</h1>
        <Link to="/upload" style={styles.uploadLink}>
          {t('capture')}
        </Link>
      </div>
      <p style={styles.subtitle}>{t('inboxSubtitle')}</p>

      {isManualProcessing && (
        <p style={styles.manualHint} role="note">
          {t('inboxManualModeHint')}
        </p>
      )}

      {selectedPending.length > 0 && (
        <div style={styles.reviewBar}>
          <button type="button" style={styles.reviewBtn} onClick={openModal}>
            {t('reviewSelected')} ({selectedPending.length})
          </button>
          <button
            type="button"
            style={styles.clearBtn}
            onClick={() => setSelectedIds([])}
          >
            {t('clearSelection')}
          </button>
        </div>
      )}

      {list.length === 0 ? (
        <div style={styles.empty}>
          <p>{t('inboxEmpty')}</p>
          <Link to="/upload">{t('capture')}</Link>
          {' · '}
          <Link to="/knowledge">{t('nav.knowledge')}</Link>
        </div>
      ) : (
        <div style={styles.section}>
          <ul style={styles.list}>
            {list.map((c) => (
              <li
                key={c.id}
                style={{
                  ...styles.item,
                  ...(selectedIds.includes(c.id) ? styles.itemSelected : {}),
                }}
                onClick={() => toggleSelected(c.id)}
                role="checkbox"
                aria-checked={selectedIds.includes(c.id)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') toggleSelected(c.id)
                }}
              >
                <div style={styles.itemLink}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(c.id)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggleSelected(c.id)}
                  />
                  <span style={styles.type}>{c.type}</span>
                  <span style={styles.status}>{translateStatus(c.status)}</span>
                  {isManualProcessing && (
                    <button
                      type="button"
                      style={styles.processBtn}
                      disabled={runPipelineMutation.isPending}
                      onClick={(e) => {
                        e.stopPropagation()
                        runPipelineMutation.mutate(c.id)
                      }}
                    >
                      {t('inboxRunProcessing')}
                    </button>
                  )}
                  <button
                    type="button"
                    style={styles.detailBtn}
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/content/${c.id}`)
                    }}
                  >
                    {t('details')}
                  </button>
                  <span style={styles.date}>
                    {new Date(c.uploadedAt).toLocaleDateString()}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {runPipelineMutation.isError && (
        <p style={styles.inlineError} role="alert">
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

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 600,
  },
  subtitle: {
    color: 'var(--text-muted)',
    marginBottom: '1.25rem',
    fontSize: '0.9rem',
  },
  manualHint: {
    marginBottom: '1rem',
    padding: '0.75rem 1rem',
    borderRadius: 8,
    fontSize: '0.9rem',
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    border: '1px solid rgba(99, 102, 241, 0.25)',
    color: 'var(--text)',
  },
  inlineError: {
    marginTop: '0.75rem',
    color: 'var(--error)',
    fontSize: '0.9rem',
  },
  uploadLink: {
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    backgroundColor: 'var(--accent)',
    color: 'white',
    fontWeight: 500,
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
    borderRadius: '8px',
    overflow: 'hidden',
  },
  itemLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem',
    color: 'inherit',
  },
  reviewBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '1rem',
    padding: '0.75rem 1rem',
    borderRadius: 10,
    border: '1px solid var(--border)',
    backgroundColor: 'var(--surface)',
  },
  reviewBtn: {
    padding: '0.65rem 1rem',
    borderRadius: 10,
    border: 'none',
    backgroundColor: 'var(--accent)',
    color: 'white',
    fontWeight: 600,
    cursor: 'pointer',
  },
  clearBtn: {
    padding: '0.65rem 1rem',
    borderRadius: 10,
    border: '1px solid var(--border)',
    backgroundColor: 'transparent',
    color: 'var(--text-muted)',
    fontWeight: 600,
    cursor: 'pointer',
  },
  type: {
    fontWeight: 500,
    minWidth: '80px',
  },
  status: {
    fontSize: '0.875rem',
    color: 'var(--text-muted)',
  },
  date: {
    marginLeft: 'auto',
    fontSize: '0.875rem',
    color: 'var(--text-muted)',
  },
  section: {
    marginBottom: '1.25rem',
  },
  itemSelected: {
    backgroundColor: 'rgba(99, 102, 241, 0.10)',
    borderColor: 'rgba(99, 102, 241, 0.55)',
  },
  detailBtn: {
    padding: '0.25rem 0.5rem',
    fontSize: '0.8rem',
    borderRadius: 6,
    border: '1px solid var(--border)',
    background: 'var(--surface)',
    color: 'var(--accent)',
    cursor: 'pointer',
  },
  processBtn: {
    padding: '0.35rem 0.65rem',
    fontSize: '0.8rem',
    borderRadius: 6,
    border: 'none',
    backgroundColor: 'var(--accent)',
    color: 'white',
    fontWeight: 600,
    cursor: 'pointer',
  },
}
