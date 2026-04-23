import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Bell } from 'lucide-react'
import { useAuth } from '@/app/auth-context'
import { userApi } from '@/features/profile/api/user-api'
import { notificationsApi } from '../api/notifications-api'
import type { NotificationItem } from '@/shared/types/api'
import { formatUserDateTime } from '@/shared/preferences/user-datetime'

const ICON = 22

function notificationTargetPath(n: NotificationItem): string | null {
  switch (n.type) {
    case 'PROCESSING_FINISHED':
    case 'DUPLICATE_DETECTED':
    case 'CONTENT_REMINDER':
      return n.contentId ? `/content/${n.contentId}` : null
    case 'NEW_CONNECTION':
      return n.knowledgeItemId ? `/knowledge/${n.knowledgeItemId}` : null
    default:
      return null
  }
}

export function HeaderNotificationsBell() {
  const { t, i18n } = useTranslation()
  const { token } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  const unreadKey = ['notifications-unread', token ?? ''] as const
  const listKey = ['notifications-list', token ?? ''] as const

  const { data: profile } = useQuery({
    queryKey: ['user-profile', token ?? ''],
    queryFn: () => userApi.getMe().then((r) => r.data),
    enabled: !!token,
  })

  const formatPrefs = useMemo(
    () => ({
      dateFormat: profile?.dateFormat,
      timeFormat: profile?.timeFormat,
      timeZone: profile?.preferredTimezone ?? undefined,
    }),
    [profile?.dateFormat, profile?.timeFormat, profile?.preferredTimezone],
  )

  const { data: unreadData } = useQuery({
    queryKey: unreadKey,
    queryFn: () => notificationsApi.getUnreadCount().then((r) => r.data),
    enabled: !!token,
    refetchInterval: 20_000,
    refetchOnWindowFocus: true,
  })

  const { data: items = [], isFetching: listLoading } = useQuery({
    queryKey: listKey,
    queryFn: () => notificationsApi.list().then((r) => r.data),
    enabled: !!token && open,
  })

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: unreadKey })
      void queryClient.invalidateQueries({ queryKey: listKey })
    },
  })

  const markAllMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: unreadKey })
      void queryClient.invalidateQueries({ queryKey: listKey })
    },
  })

  const unread = unreadData?.count ?? 0
  const badgeText = unread > 99 ? '99+' : String(unread)

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!open) return
    const onDocDown = (e: MouseEvent) => {
      const el = rootRef.current
      if (!el || el.contains(e.target as Node)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const labelFor = (n: NotificationItem): string => {
    switch (n.type) {
      case 'PROCESSING_FINISHED':
        return t('notifications.typeProcessingFinished')
      case 'DUPLICATE_DETECTED':
        return t('notifications.typeDuplicate')
      case 'NEW_CONNECTION': {
        const c = n.connectionCount ?? 0
        return t('notifications.typeNewConnection', { count: c })
      }
      case 'CONTENT_REMINDER':
        return t('notifications.typeContentReminder')
      default:
        return n.type
    }
  }

  const onItemActivate = (n: NotificationItem) => {
    const path = notificationTargetPath(n)
    const run = async () => {
      if (!n.read) {
        await markReadMutation.mutateAsync(n.id)
      }
      if (path) {
        navigate(path)
        setOpen(false)
      }
    }
    void run()
  }

  if (!token) return null

  return (
    <div ref={rootRef} style={styles.root}>
      <button
        type="button"
        style={{
          ...styles.bellBtn,
          ...(open ? styles.bellBtnActive : {}),
        }}
        aria-label={t('notifications.openPanel')}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Bell size={ICON} strokeWidth={2} aria-hidden />
        {unread > 0 ? (
          <span style={styles.badge} aria-hidden>
            {badgeText}
          </span>
        ) : null}
      </button>
      {open && (
        <div style={styles.panel} role="dialog" aria-label={t('notifications.title')}>
          <div style={styles.panelHead}>
            <span style={styles.panelTitle}>{t('notifications.title')}</span>
            {items.some((n) => !n.read) ? (
              <button
                type="button"
                style={styles.linkish}
                disabled={markAllMutation.isPending}
                onClick={() => markAllMutation.mutate()}
              >
                {t('notifications.markAllRead')}
              </button>
            ) : null}
          </div>
          {listLoading ? (
            <p style={styles.muted}>{t('loading')}</p>
          ) : items.length === 0 ? (
            <p style={styles.muted}>{t('notifications.empty')}</p>
          ) : (
            <ul style={styles.ul}>
              {items.map((n) => {
                const path = notificationTargetPath(n)
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      style={{
                        ...styles.row,
                        ...(!n.read ? styles.rowUnread : {}),
                      }}
                      onClick={() => onItemActivate(n)}
                    >
                      <span style={styles.rowText}>{labelFor(n)}</span>
                      <span style={styles.rowTime}>
                        {formatUserDateTime(n.createdAt, i18n.language, formatPrefs)}
                      </span>
                      {path ? (
                        <span style={styles.rowHint}>{t('notifications.openHint')}</span>
                      ) : null}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  root: {
    position: 'relative',
    flexShrink: 0,
  },
  bellBtn: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    padding: 0,
    border: '1px solid transparent',
    borderRadius: 10,
    background: 'transparent',
    color: 'var(--text-muted)',
    cursor: 'pointer',
  },
  bellBtnActive: {
    borderColor: 'var(--border)',
    backgroundColor: 'var(--surface)',
    color: 'var(--text)',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    padding: '0 5px',
    borderRadius: 999,
    backgroundColor: '#dc2626',
    color: '#fff',
    fontSize: 10,
    fontWeight: 700,
    lineHeight: '18px',
    textAlign: 'center',
    boxSizing: 'border-box',
  },
  panel: {
    position: 'absolute',
    right: 0,
    top: 'calc(100% + 6px)',
    width: 'min(360px, calc(100vw - 2rem))',
    maxHeight: 'min(70vh, 420px)',
    overflow: 'auto',
    zIndex: 1001,
    borderRadius: 12,
    border: '1px solid var(--border)',
    backgroundColor: 'var(--surface)',
    boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
  },
  panelHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.5rem',
    padding: '0.65rem 0.85rem',
    borderBottom: '1px solid var(--border)',
    position: 'sticky',
    top: 0,
    backgroundColor: 'var(--surface)',
  },
  panelTitle: {
    fontWeight: 600,
    fontSize: '0.9rem',
  },
  linkish: {
    border: 'none',
    background: 'none',
    padding: 0,
    color: 'var(--accent)',
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  muted: {
    padding: '1rem',
    margin: 0,
    color: 'var(--text-muted)',
    fontSize: '0.875rem',
  },
  ul: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  row: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '0.2rem',
    width: '100%',
    textAlign: 'left',
    padding: '0.65rem 0.85rem',
    border: 'none',
    borderBottom: '1px solid var(--border)',
    background: 'transparent',
    color: 'var(--text)',
    cursor: 'pointer',
    fontSize: '0.8125rem',
  },
  rowUnread: {
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
  },
  rowText: {
    fontWeight: 500,
    lineHeight: 1.35,
  },
  rowTime: {
    fontSize: '0.72rem',
    color: 'var(--text-muted)',
  },
  rowHint: {
    fontSize: '0.72rem',
    color: 'var(--accent)',
  },
}
