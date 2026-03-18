import { Link, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/app/auth-context'
import { LanguageToggle } from './LanguageToggle'

export function Layout() {
  const { t } = useTranslation()
  const { logout } = useAuth()
  const location = useLocation()

  const navItems = [
    { to: '/dashboard', label: t('dashboard') },
    { to: '/upload', label: t('upload') },
  ]

  return (
    <div style={styles.wrapper}>
      <header style={styles.header}>
        <Link to="/dashboard" style={styles.logo}>
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
          <LanguageToggle />
          <button type="button" onClick={logout} className="header-logout">
            {t('nav.logout')}
          </button>
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
