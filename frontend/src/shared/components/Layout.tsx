import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/app/auth-context'

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/upload', label: 'Upload content' },
]

export function Layout() {
  const { logout } = useAuth()
  const location = useLocation()

  return (
    <div style={styles.wrapper}>
      <header style={styles.header}>
        <Link to="/dashboard" style={styles.logo}>
          Synapse
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
        <button type="button" onClick={logout} style={styles.logout}>
          Logout
        </button>
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
  logout: {
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    border: '1px solid var(--border)',
    background: 'transparent',
    color: 'var(--text-muted)',
  },
  main: {
    flex: 1,
    padding: '1.5rem',
    maxWidth: '960px',
    margin: '0 auto',
    width: '100%',
  },
}
