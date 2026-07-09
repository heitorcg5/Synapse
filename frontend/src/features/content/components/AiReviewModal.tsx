import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CreateInboxItemRequest, InboxItemResponse } from '@/shared/types/inbox.types'
import type { ConfirmInboxItemRequest } from '@/shared/types/inbox.types'
import { contentApi } from '../api/content-api'
import { useTranslation } from 'react-i18next'
import { getErrorMessage } from '@/shared/utils/api-client'
import DatePicker from 'react-datepicker'
import { Textarea } from '@/shared/components/ui/Textarea'
import { Input } from '@/shared/components/ui/Input'
import { CalendarDays, Clock3 } from 'lucide-react'
import 'react-datepicker/dist/react-datepicker.css'
import './ai-review-datepicker.css'

const TYPES: CreateInboxItemRequest['type'][] = ['TEXT', 'VIDEO', 'WEB', 'AUDIO', 'DOCUMENT']
const CREATE_FOLDER_OPTION = '__create-new-folder__'

const selectClassName =
  'w-full rounded-[10px] border border-[rgba(255,255,255,0.06)] bg-[#101018] p-3 text-sm text-app-text outline-none transition-[border-color,box-shadow] duration-150 ease-in-out focus:border-[#7C5CFF] focus:shadow-[0_0_0_2px_rgba(124,92,255,0.18)]'

type PanelState = {
  loadingPreview: boolean
  previewError?: string
  previewGenerated: boolean
  title: string
  summaryText: string
  contentType: CreateInboxItemRequest['type']
  folderId: string
  creatingFolderInline: boolean
  newFolderName: string
  folderError?: string
  notificationsEnabled: boolean
  reminderDate: string
  reminderTime: string
  confirming: boolean
}

function toLocalDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function toLocalTimeInputValue(date: Date): string {
  return date.toTimeString().slice(0, 5)
}

function defaultReminderParts() {
  const when = new Date(Date.now() + 60 * 60 * 1000)
  return {
    reminderDate: toLocalDateInputValue(when),
    reminderTime: toLocalTimeInputValue(when),
  }
}

function parseReminderDateTime(reminderDate: string, reminderTime: string): Date | null {
  if (!reminderDate || !reminderTime) return null
  const parsed = new Date(`${reminderDate}T${reminderTime}`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function AiReviewModal({
  open,
  items,
  onClose,
  onCompleted,
}: {
  open: boolean
  items: InboxItemResponse[]
  onClose: () => void
  onCompleted: () => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const contentIds = useMemo(() => items.map((i) => i.id), [items])
  const [index, setIndex] = useState(0)

  const [panelStates, setPanelStates] = useState<PanelState[]>([])
  const loadedPreviewsRef = useRef<Set<string>>(new Set())
  const fetchingRef = useRef<string | null>(null)

  const foldersQuery = useQuery({
    queryKey: ['content-folders'],
    queryFn: () => contentApi.contentFolders().then((res) => res.data),
    enabled: open,
  })

  const createFolderMutation = useMutation({
    mutationFn: ({ name }: { name: string; panelIndex: number }) =>
      contentApi.contentFolderCreate({ name }).then((res) => res.data),
    onSuccess: (folder, variables) => {
      queryClient.invalidateQueries({ queryKey: ['content-folders'] })
      setPanelStates((prev) => {
        const next = [...prev]
        const st = next[variables.panelIndex]
        if (!st) return prev
        next[variables.panelIndex] = {
          ...st,
          folderId: folder.id,
          creatingFolderInline: false,
          newFolderName: '',
          folderError: undefined,
        }
        return next
      })
    },
  })

  const resolveContentType = (item: InboxItemResponse): CreateInboxItemRequest['type'] => {
    const raw = item.type?.toUpperCase()
    if (raw && TYPES.includes(raw as CreateInboxItemRequest['type'])) {
      return raw as CreateInboxItemRequest['type']
    }
    return 'TEXT'
  }

  const createPanelState = (item: InboxItemResponse): PanelState => ({
    loadingPreview: false,
    previewError: undefined,
    previewGenerated: false,
    title: '',
    summaryText: '',
    contentType: resolveContentType(item),
    folderId: item.folderId ?? '',
    creatingFolderInline: false,
    newFolderName: '',
    folderError: undefined,
    notificationsEnabled: false,
    reminderDate: '',
    reminderTime: '',
    confirming: false,
  })

  useEffect(() => {
    if (!open) return
    setIndex(0)
    loadedPreviewsRef.current = new Set()
    fetchingRef.current = null
    setPanelStates(items.map((item) => createPanelState(item)))
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

  const handleConfirmCurrent = async () => {
    if (!active) return

    let currentState = panelStates[index]
    if (!currentState) return

    if (currentState.creatingFolderInline && currentState.newFolderName.trim()) {
      try {
        const folder = await createFolderMutation.mutateAsync({
          name: currentState.newFolderName.trim(),
          panelIndex: index,
        })
        currentState = {
          ...currentState,
          folderId: folder.id,
          creatingFolderInline: false,
          newFolderName: '',
          folderError: undefined,
        }
        setPanelStates((prev) => {
          const next = [...prev]
          next[index] = currentState
          return next
        })
      } catch (e) {
        const msg = getErrorMessage(e)
        setPanelStates((prev) => {
          const next = [...prev]
          const st = next[index]
          if (!st) return prev
          next[index] = { ...st, folderError: msg }
          return next
        })
        return
      }
    }

    if (!currentState.summaryText.trim()) return
    if (currentState.notificationsEnabled && (!currentState.reminderDate || !currentState.reminderTime)) {
      setPanelStates((prev) => {
        const next = [...prev]
        const st = next[index]
        if (!st) return prev
        next[index] = {
          ...st,
          previewError: t('notificationsReminderRequired'),
        }
        return next
      })
      return
    }

    let reminderAt: string | undefined
    if (currentState.notificationsEnabled) {
      const parsed = new Date(`${currentState.reminderDate}T${currentState.reminderTime}`)
      if (Number.isNaN(parsed.getTime()) || parsed.getTime() <= Date.now()) {
        setPanelStates((prev) => {
          const next = [...prev]
          const st = next[index]
          if (!st) return prev
          next[index] = {
            ...st,
            previewError: t('notificationsReminderFuture'),
          }
          return next
        })
        return
      }
      reminderAt = parsed.toISOString()
    }

    const confirmPayload: ConfirmInboxItemRequest = {
      title: currentState.title ?? '',
      summaryText: currentState.summaryText ?? '',
      type: currentState.contentType,
      folderId: currentState.folderId || null,
      notificationsEnabled: currentState.notificationsEnabled ?? false,
      ...(reminderAt ? { reminderAt } : {}),
    }

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

  const typeLabel = (raw: string) => t(`contentTypes.${raw}`, { defaultValue: raw })

  const handleCreateFolder = async (panelIndex: number) => {
    const st = panelStates[panelIndex]
    if (!st) return
    const name = st.newFolderName.trim()
    if (!name) return
    setPanelStates((prev) => {
      const next = [...prev]
      const current = next[panelIndex]
      if (!current) return prev
      next[panelIndex] = { ...current, folderError: undefined }
      return next
    })
    try {
      await createFolderMutation.mutateAsync({ name, panelIndex })
    } catch (e) {
      const msg = getErrorMessage(e)
      setPanelStates((prev) => {
        const next = [...prev]
        const current = next[panelIndex]
        if (!current) return prev
        next[panelIndex] = { ...current, folderError: msg }
        return next
      })
    }
  }

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
                  <div style={styles.panelItemStatus}>{t('statusPending')}</div>
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
                    <div style={styles.metaGrid}>
                      <label style={styles.labelTight}>
                        {t('type')}
                        <select
                          value={panelStates[i]?.contentType ?? 'TEXT'}
                          disabled={panelStates[i]?.confirming}
                          onChange={(e) => {
                            const v = e.target.value as CreateInboxItemRequest['type']
                            setPanelStates((prev) => {
                              const next = [...prev]
                              const st = next[i]
                              if (!st) return prev
                              next[i] = { ...st, contentType: v }
                              return next
                            })
                          }}
                          className={selectClassName}
                        >
                          {TYPES.map((typeOpt) => (
                            <option key={typeOpt} value={typeOpt}>
                              {typeLabel(typeOpt)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label style={styles.labelTight}>
                        {t('captureFolder')}
                        <select
                          value={
                            panelStates[i]?.creatingFolderInline
                              ? CREATE_FOLDER_OPTION
                              : (panelStates[i]?.folderId ?? '')
                          }
                          disabled={panelStates[i]?.confirming}
                          onChange={(e) => {
                            const nextValue = e.target.value
                            setPanelStates((prev) => {
                              const next = [...prev]
                              const st = next[i]
                              if (!st) return prev
                              if (nextValue === CREATE_FOLDER_OPTION) {
                                next[i] = {
                                  ...st,
                                  creatingFolderInline: true,
                                  folderId: '',
                                  folderError: undefined,
                                }
                                return next
                              }
                              next[i] = {
                                ...st,
                                creatingFolderInline: false,
                                folderId: nextValue,
                                folderError: undefined,
                              }
                              return next
                            })
                          }}
                          className={selectClassName}
                        >
                          <option value="">{t('captureFolderNone')}</option>
                          {(foldersQuery.data ?? []).map((folder) => (
                            <option key={folder.id} value={folder.id}>
                              {folder.name}
                            </option>
                          ))}
                          <option value={CREATE_FOLDER_OPTION}>{t('captureFolderCreateOption')}</option>
                        </select>
                      </label>
                    </div>
                    {panelStates[i]?.creatingFolderInline ? (
                      <div style={styles.inlineFolderBox}>
                        <label style={styles.labelTight}>
                          {t('captureNewFolderLabel')}
                          <Input
                            value={panelStates[i]?.newFolderName ?? ''}
                            disabled={panelStates[i]?.confirming || createFolderMutation.isPending}
                            onChange={(e) => {
                              const v = e.target.value
                              setPanelStates((prev) => {
                                const next = [...prev]
                                const st = next[i]
                                if (!st) return prev
                                next[i] = { ...st, newFolderName: v, folderError: undefined }
                                return next
                              })
                            }}
                            placeholder={t('captureNewFolderPlaceholder')}
                          />
                        </label>
                        {panelStates[i]?.folderError ? (
                          <p style={styles.inlineFolderError}>{panelStates[i]?.folderError}</p>
                        ) : null}
                        <button
                          type="button"
                          disabled={
                            panelStates[i]?.confirming ||
                            createFolderMutation.isPending ||
                            !panelStates[i]?.newFolderName.trim()
                          }
                          onClick={() => void handleCreateFolder(i)}
                          style={styles.secondaryBtn}
                        >
                          {t('captureCreateFolder')}
                        </button>
                      </div>
                    ) : null}
                    <label style={styles.label}>
                      {t('title')}
                      <Textarea
                        className="resize-none whitespace-pre-wrap leading-relaxed"
                        rows={2}
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
                      <Textarea
                        className="h-48 resize-none overflow-x-hidden overflow-y-auto break-words whitespace-pre-wrap leading-relaxed"
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
                            if (!v) {
                              next[i] = { ...st, notificationsEnabled: false, reminderDate: '', reminderTime: '' }
                              return next
                            }
                            const defaults = defaultReminderParts()
                            next[i] = {
                              ...st,
                              notificationsEnabled: true,
                              reminderDate: st.reminderDate || defaults.reminderDate,
                              reminderTime: st.reminderTime || defaults.reminderTime,
                            }
                            return next
                          })
                        }}
                      />
                      <span>{t('notificationsEnabled')}</span>
                    </label>
                    {panelStates[i]?.notificationsEnabled && (
                      <div style={styles.dateTimeGrid}>
                        <label style={styles.labelTight}>
                          {t('notificationsReminderDate')}
                          <div style={styles.pickerWrap}>
                            <CalendarDays size={16} style={styles.pickerIcon} />
                            <DatePicker
                              selected={parseReminderDateTime(
                                panelStates[i]?.reminderDate ?? '',
                                panelStates[i]?.reminderTime ?? '12:00',
                              )}
                              onChange={(date: Date | null) => {
                                if (!date) return
                                const v = toLocalDateInputValue(date)
                                setPanelStates((prev) => {
                                  const next = [...prev]
                                  const st = next[i]
                                  if (!st) return prev
                                  next[i] = { ...st, reminderDate: v }
                                  return next
                                })
                              }}
                              dateFormat="dd/MM/yyyy"
                              minDate={new Date()}
                              disabled={panelStates[i]?.confirming}
                              className="ai-review-picker-input"
                              calendarClassName="ai-review-calendar"
                              popperClassName="ai-review-popper ai-review-time-popper"
                              popperPlacement="bottom-start"
                            />
                          </div>
                        </label>
                        <label style={styles.labelTight}>
                          {t('notificationsReminderTime')}
                          <div style={styles.pickerWrap}>
                            <Clock3 size={16} style={styles.pickerIcon} />
                            <DatePicker
                              selected={parseReminderDateTime(
                                panelStates[i]?.reminderDate ?? toLocalDateInputValue(new Date()),
                                panelStates[i]?.reminderTime ?? '',
                              )}
                              onChange={(date: Date | null) => {
                                if (!date) return
                                const v = toLocalTimeInputValue(date)
                                setPanelStates((prev) => {
                                  const next = [...prev]
                                  const st = next[i]
                                  if (!st) return prev
                                  next[i] = { ...st, reminderTime: v }
                                  return next
                                })
                              }}
                              showTimeSelect
                              showTimeSelectOnly
                              timeIntervals={15}
                              timeCaption={t('notificationsReminderTime')}
                              dateFormat="HH:mm"
                              disabled={panelStates[i]?.confirming}
                              className="ai-review-picker-input"
                              calendarClassName="ai-review-calendar"
                              popperClassName="ai-review-popper"
                              popperPlacement="bottom-start"
                            />
                          </div>
                        </label>
                      </div>
                    )}
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
    zIndex: 60,
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
    justifyContent: 'flex-end',
    marginBottom: '0.75rem',
  },
  panelItemType: {
    fontWeight: 600,
    color: 'var(--text)',
  },
  metaGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.75rem',
    marginBottom: '1rem',
  },
  inlineFolderBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    marginBottom: '1rem',
    padding: '0.75rem',
    borderRadius: 12,
    border: '1px solid var(--border)',
    backgroundColor: '#0E0E15',
  },
  inlineFolderError: {
    margin: 0,
    fontSize: '0.8rem',
    color: 'var(--error)',
  },
  secondaryBtn: {
    alignSelf: 'flex-start',
    padding: '0.45rem 0.75rem',
    borderRadius: 8,
    border: '1px solid var(--border)',
    backgroundColor: 'transparent',
    color: 'var(--text)',
    fontWeight: 600,
    fontSize: '0.85rem',
    cursor: 'pointer',
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
  checkboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    marginTop: '0.25rem',
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
  },
  dateTimeGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.75rem',
    marginTop: '0.6rem',
  },
  labelTight: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
    color: 'var(--text-muted)',
    fontSize: '0.84rem',
  },
  pickerWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  pickerIcon: {
    position: 'absolute',
    left: 10,
    zIndex: 1,
    color: '#8f96ad',
    pointerEvents: 'none',
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

