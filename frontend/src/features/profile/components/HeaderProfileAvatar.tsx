import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, LogOut, Settings, SlidersHorizontal, User } from 'lucide-react'
import { useAuth } from '@/app/auth-context'
import { userApi } from '../api/user-api'

const ICON = 18

export function HeaderProfileAvatar() {
  const { t } = useTranslation()
  const { token, logout } = useAuth()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [avatarImgFailed, setAvatarImgFailed] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const { data: profile, isLoading } = useQuery({
    queryKey: ['user-profile', token ?? ''],
    queryFn: () => userApi.getMe().then((r) => r.data),
    enabled: !!token,
  })

  const hasAvatar = !!profile?.hasAvatar
  const headerBlobKey = ['user-avatar-blob', token ?? '', hasAvatar, 'header'] as const

  const { data: avatarObjectUrl, isFetching } = useQuery({
    queryKey: headerBlobKey,
    queryFn: async () => {
      const { data } = await userApi.getAvatarBlob()
      return URL.createObjectURL(data)
    },
    enabled: !!token && hasAvatar,
    staleTime: Infinity,
    gcTime: 0,
  })

  useEffect(() => {
    return () => {
      if (avatarObjectUrl) URL.revokeObjectURL(avatarObjectUrl)
    }
  }, [avatarObjectUrl])

  useEffect(() => {
    return () => {
      void queryClient.removeQueries({ queryKey: headerBlobKey })
    }
  }, [queryClient, token, hasAvatar])

  useEffect(() => {
    setAvatarImgFailed(false)
  }, [avatarObjectUrl])

  useEffect(() => {
    if (!menuOpen) return
    const onDocDown = (e: MouseEvent) => {
      const el = rootRef.current
      if (!el || el.contains(e.target as Node)) return
      setMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDocDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  const onAccountRoute =
    location.pathname === '/profile' ||
    location.pathname === '/preferences' ||
    location.pathname.startsWith('/settings')
  const triggerActive = menuOpen || onAccountRoute
  const initial =
    (profile?.displayName?.trim()?.[0] ?? profile?.email?.[0] ?? '?').toUpperCase()

  const closeMenu = () => setMenuOpen(false)

  return (
    <div ref={rootRef} style={styles.root}>
      <button
        type="button"
        className={`header-profile-trigger${triggerActive ? ' header-profile-trigger--active' : ''}${menuOpen ? ' header-profile-trigger--open' : ''}`}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label={t('nav.userMenu.openMenu')}
        onClick={() => setMenuOpen((v) => !v)}
      >
        <span className="header-profile-avatar-ring">
          {hasAvatar && avatarObjectUrl && !avatarImgFailed ? (
            <img
              src={avatarObjectUrl}
              alt=""
              style={styles.img}
              onError={() => {
                setAvatarImgFailed(true)
                void queryClient.invalidateQueries({
                  queryKey: ['user-avatar-blob', token ?? ''],
                })
              }}
            />
          ) : hasAvatar && isFetching ? (
            <span style={styles.placeholderMuted}>…</span>
          ) : isLoading && !profile ? (
            <span style={styles.placeholderMuted}>…</span>
          ) : (
            <span style={styles.initial}>{initial}</span>
          )}
        </span>
        <ChevronDown
          className="header-profile-chevron"
          size={16}
          strokeWidth={2.25}
          aria-hidden
        />
      </button>
      {menuOpen && (
        <div
          className="header-user-menu"
          role="menu"
          aria-label={t('nav.userMenu.openMenu')}
        >
          <Link
            role="menuitem"
            to="/profile"
            onClick={closeMenu}
            className="header-user-menu__row header-user-menu__row--interactive"
          >
            <span className="header-user-menu__icon" aria-hidden>
              <User size={ICON} strokeWidth={2} />
            </span>
            <span className="header-user-menu__label">{t('nav.userMenu.myProfile')}</span>
          </Link>
          <Link
            role="menuitem"
            to="/settings"
            onClick={closeMenu}
            className="header-user-menu__row header-user-menu__row--interactive"
          >
            <span className="header-user-menu__icon" aria-hidden>
              <Settings size={ICON} strokeWidth={2} />
            </span>
            <span className="header-user-menu__label">{t('nav.userMenu.settings')}</span>
          </Link>
          <Link
            role="menuitem"
            to="/preferences"
            onClick={closeMenu}
            className="header-user-menu__row header-user-menu__row--interactive"
          >
            <span className="header-user-menu__icon" aria-hidden>
              <SlidersHorizontal size={ICON} strokeWidth={2} />
            </span>
            <span className="header-user-menu__label">{t('nav.userMenu.preferences')}</span>
          </Link>
          <button
            type="button"
            role="menuitem"
            className="header-user-menu__row header-user-menu__row--interactive header-user-menu__row--logout"
            onClick={() => {
              closeMenu()
              logout()
            }}
          >
            <span className="header-user-menu__icon header-user-menu__icon--logout" aria-hidden>
              <LogOut size={ICON} strokeWidth={2} />
            </span>
            <span className="header-user-menu__label header-user-menu__label--logout">
              {t('nav.logout')}
            </span>
          </button>
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
  img: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  initial: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
    lineHeight: 1,
  },
  placeholderMuted: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    lineHeight: 1,
  },
}
