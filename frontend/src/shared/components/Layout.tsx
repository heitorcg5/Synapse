import { Link, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ProfileLanguageSync } from '@/features/profile/components/ProfileLanguageSync'
import { ThemeSync } from '@/features/profile/components/ThemeSync'
import { HeaderNotificationsBell } from '@/features/notifications/components/HeaderNotificationsBell'
import { HeaderProfileAvatar } from '@/features/profile/components/HeaderProfileAvatar'

export function Layout() {
  const { t } = useTranslation()
  const location = useLocation()

  const navItems = [
    { to: '/dashboard', label: t('dashboard') },
    { to: '/inbox', label: t('nav.inbox') },
    { to: '/knowledge', label: t('nav.knowledge') },
    { to: '/upload', label: t('capture') },
  ]

  return (
    <div style={styles.wrapper}>
      <header style={styles.header}>
        <Link to="/inbox" style={styles.logo}>
          {t('auth.synapse')}
        </Link>
        <nav style={styles.nav}>
          {navItems.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              style={{
                ...styles.navLink,
                ...(location.pathname === to ? styles.navLinkActive : {}),
              }}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div style={styles.rightActions}>
          <ProfileLanguageSync />
          <ThemeSync />
          <HeaderNotificationsBell />
          <HeaderProfileAvatar />
        </div>
      </header>
      <main style={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
    padding: '1rem 1.5rem',
    backgroundColor: 'var(--surface)',
    borderBottom: '1px solid var(--border)',
    overflow: 'visible',
  },
  logo: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: 'var(--text)',
  },
  nav: {
    display: 'flex',
    gap: '0.5rem',
    flex: 1,
    minWidth: 0,
  },
  navLink: {
    padding: '0.5rem 0.75rem',
    borderRadius: '6px',
    color: 'var(--text-muted)',
  },
  navLinkActive: {
    color: 'var(--accent)',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  rightActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    flexShrink: 0,
  },
  main: {
    flex: 1,
    padding: '1.5rem',
    maxWidth: '960px',
    margin: '0 auto',
    width: '100%',
  },
}
