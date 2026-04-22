import { useEffect, useMemo, useRef, useState } from 'react'
import type { ContentResponse } from '@/shared/types/api'
import type { ConfirmContentRequest } from '@/shared/types/api'
import { contentApi } from '../api/content-api'
import { useTranslation } from 'react-i18next'
import { getErrorMessage } from '@/shared/utils/api-client'

type PanelState = {
  loadingPreview: boolean
  previewError?: string
  previewGenerated: boolean
  title: string
  summaryText: string
  notificationsEnabled: boolean
  confirming: boolean
}

export function AiReviewModal({
  open,
  items,
  onClose,
  onCompleted,
}: {
  open: boolean
  items: ContentResponse[]
  onClose: () => void
  onCompleted: () => void
}) {
  const { t } = useTranslation()

  const contentIds = useMemo(() => items.map((i) => i.id), [items])
  const [index, setIndex] = useState(0)

  const [panelStates, setPanelStates] = useState<PanelState[]>([])
  const loadedPreviewsRef = useRef<Set<string>>(new Set())
  const fetchingRef = useRef<string | null>(null)

  useEffect(() => {
    if (!open) return
    setIndex(0)
    loadedPreviewsRef.current = new Set()
    fetchingRef.current = null
    setPanelStates(
      items.map(() => ({
        loadingPreview: false,
        previewError: undefined,
        previewGenerated: false,
        title: '',
        summaryText: '',
        notificationsEnabled: false,
        confirming: false,
      }))
    )
  }, [open, items])

  useEffect(() => {
    if (!open) return
    const currentId = contentIds[index]
    if (!currentId) return

    if (loadedPreviewsRef.current.has(currentId)) return
    if (fetchingRef.current === currentId) return

    const targetIndex = index
    fetchingRef.current = currentId
    setPanelStates((prev) => {
      const next = [...prev]
      const st = next[targetIndex]
      if (!st) return prev
      next[targetIndex] = {
        ...st,
        loadingPreview: true,
        previewError: undefined,
        previewGenerated: false,
      }
      return next
    })

    contentApi
      .aiPreview(currentId)
      .then((res) => {
        loadedPreviewsRef.current.add(currentId)
        fetchingRef.current = null
        setPanelStates((prev) => {
          const next = [...prev]
          const st = next[targetIndex]
          if (!st) return prev
          next[targetIndex] = {
            ...st,
            loadingPreview: false,
            previewGenerated: true,
            title: res.data.title ?? '',
            summaryText: res.data.summaryText ?? '',
          }
          return next
        })
      })
      .catch((e) => {
        fetchingRef.current = null
        const msg = getErrorMessage(e) || t('aiPreviewFailedGeneric')
        setPanelStates((prev) => {
          const next = [...prev]
          const st = next[targetIndex]
          if (!st) return prev
          next[targetIndex] = {
            ...st,
            loadingPreview: false,
            previewError: msg,
            previewGenerated: false,
          }
          return next
        })
      })
  }, [open, index, contentIds, t])

  const active = items[index]
  const activeState = panelStates[index]

  if (!open) return null

  const confirmPayload: ConfirmContentRequest = {
    title: activeState?.title ?? '',
    summaryText: activeState?.summaryText ?? '',
    notificationsEnabled: activeState?.notificationsEnabled ?? false,
  }

  const handleConfirmCurrent = async () => {
    if (!active || !activeState) return
    if (!activeState.summaryText.trim()) return

    setPanelStates((prev) => {
      const next = [...prev]
      const st = next[index]
      if (!st) return prev
      next[index] = { ...st, confirming: true, previewError: undefined }
      return next
    })

    try {
      await contentApi.confirmContent(active.id, confirmPayload)
      setIndex((i) => i + 1)
    } catch (e) {
      const msg = getErrorMessage(e) || t('confirmFailedGeneric')
      setPanelStates((prev) => {
        const next = [...prev]
        const st = next[index]
        if (!st) return prev
        next[index] = { ...st, confirming: false, previewError: msg }
        return next
      })
    }
  }

  const allDone = index >= items.length
  useEffect(() => {
    if (!open) return
    if (allDone) {
      onCompleted()
      onClose()
    }
  }, [allDone, open, onCompleted, onClose])

  const canConfirm =
    !!activeState && !activeState.loadingPreview && !activeState.confirming

  const buttonLabel = activeState?.confirming
    ? t('confirming')
    : index === items.length - 1
      ? t('confirm')
      : t('confirmAndNext')

  return (
    <div style={styles.backdrop} role="dialog" aria-modal="true">
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <div style={styles.modalTitle}>{t('aiReviewTitle')}</div>
          <button type="button" onClick={onClose} style={styles.closeBtn}>
            {t('close')}
          </button>
        </div>

        <div style={styles.carousel}>
          <div
            style={{
              display: 'flex',
              width: `${items.length * 100}%`,
              transform: `translateX(${-index * 100}%)`,
              transition: 'transform 280ms ease',
            }}
          >
            {items.map((it, i) => (
              <div key={it.id} style={styles.panel}>
                <div style={styles.panelHeader}>
                  <div style={styles.panelItemType}>{it.type}</div>
                  <div style={styles.panelItemStatus}>
                    {t('statusPending')}
                  </div>
                </div>

                {panelStates[i]?.loadingPreview ? (
                  <div style={styles.centerText}>
                    {t('aiPreviewLoading')}
                  </div>
                ) : (
                  <>
                    {panelStates[i]?.previewError && (
                      <div style={styles.errorBanner} role="alert">
                        {panelStates[i]?.previewError}
                      </div>
                    )}
                    <label style={styles.label}>
                      {t('title')}
                      <input
                        style={styles.input}
                        value={panelStates[i]?.title ?? ''}
                        disabled={panelStates[i]?.confirming}
                        onChange={(e) => {
                          const v = e.target.value
                          setPanelStates((prev) => {
                            const next = [...prev]
                            const st = next[i]
                            if (!st) return prev
                            next[i] = { ...st, title: v }
                            return next
                          })
                        }}
                      />
                    </label>

                    <label style={styles.label}>
                      {t('summary')}
                      <textarea
                        style={styles.textarea}
                        rows={10}
                        value={panelStates[i]?.summaryText ?? ''}
                        disabled={panelStates[i]?.confirming}
                        onChange={(e) => {
                          const v = e.target.value
                          setPanelStates((prev) => {
                            const next = [...prev]
                            const st = next[i]
                            if (!st) return prev
                            next[i] = { ...st, summaryText: v }
                            return next
                          })
                        }}
                      />
                    </label>

                    <label style={styles.checkboxRow}>
                      <input
                        type="checkbox"
                        checked={panelStates[i]?.notificationsEnabled ?? false}
                        disabled={panelStates[i]?.confirming}
                        onChange={(e) => {
                          const v = e.target.checked
                          setPanelStates((prev) => {
                            const next = [...prev]
                            const st = next[i]
                            if (!st) return prev
                            next[i] = { ...st, notificationsEnabled: v }
                            return next
                          })
                        }}
                      />
                      <span>{t('notificationsEnabled')}</span>
                    </label>
                  </>
                )}

                {i === index && (
                  <div style={styles.footerActions}>
                    <button
                      type="button"
                      disabled={!canConfirm}
                      onClick={handleConfirmCurrent}
                      style={styles.primaryBtn}
                    >
                      {buttonLabel}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
    zIndex: 50,
  },
  modal: {
    width: 'min(820px, 100%)',
    backgroundColor: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 14,
    boxShadow: '0 12px 30px rgba(0,0,0,0.35)',
    overflow: 'hidden',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.75rem 1rem',
    borderBottom: '1px solid var(--border)',
  },
  modalTitle: {
    fontWeight: 700,
    fontSize: '1rem',
  },
  closeBtn: {
    border: '1px solid var(--border)',
    backgroundColor: 'transparent',
    color: 'var(--text-muted)',
    borderRadius: 8,
    padding: '0.25rem 0.5rem',
    cursor: 'pointer',
  },
  carousel: {
    overflow: 'hidden',
  },
  panel: {
    flex: '0 0 100%',
    padding: '1rem',
    boxSizing: 'border-box',
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '0.75rem',
  },
  panelItemType: {
    fontWeight: 600,
    color: 'var(--text)',
  },
  panelItemStatus: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
    marginBottom: '1rem',
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
  },
  input: {
    padding: '0.75rem',
    borderRadius: 10,
    border: '1px solid var(--border)',
    backgroundColor: 'var(--bg)',
    color: 'var(--text)',
    outline: 'none',
  },
  textarea: {
    padding: '0.75rem',
    borderRadius: 10,
    border: '1px solid var(--border)',
    backgroundColor: 'var(--bg)',
    color: 'var(--text)',
    outline: 'none',
    resize: 'vertical',
    whiteSpace: 'pre-wrap',
  },
  checkboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    marginTop: '0.25rem',
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
  },
  footerActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    paddingTop: '0.5rem',
    borderTop: '1px solid var(--border)',
    marginTop: '1rem',
  },
  primaryBtn: {
    padding: '0.65rem 1rem',
    borderRadius: 10,
    border: 'none',
    backgroundColor: 'var(--accent)',
    color: 'white',
    fontWeight: 600,
    cursor: 'pointer',
    minWidth: 180,
  },
  centerText: {
    color: 'var(--text-muted)',
    padding: '1.25rem 0',
  },
  errorText: {
    color: 'var(--error)',
    padding: '1.25rem 0',
  },
  errorBanner: {
    color: 'var(--error)',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    padding: '0.75rem 1rem',
    borderRadius: 8,
    marginBottom: '1rem',
    fontSize: '0.9rem',
  },
}

