import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/app/auth-context'
import { authApi } from '../api/auth-api'
import { getErrorMessage } from '@/shared/utils/api-client'

export function LoginPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setToken } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await authApi.login({ email, password })
      setToken(data.accessToken)
      navigate('/inbox', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>{t('auth.synapse')}</h1>
        <p style={styles.subtitle}>{t('auth.subtitle')}</p>
        <form onSubmit={handleSubmit} style={styles.form}>
          {error && (
            <div style={styles.error} role="alert">
              {error}
            </div>
          )}
          <label style={styles.label}>
            {t('auth.email')}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={styles.input}
            />
          </label>
          <label style={styles.label}>
            {t('auth.password')}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              style={styles.input}
            />
          </label>
          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? t('auth.signingIn') : t('auth.signIn')}
          </button>
        </form>
        <p style={styles.footer}>
          {t('auth.noAccount')} <Link to="/register">{t('auth.registerLink')}</Link>
        </p>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
  },
  card: {
    width: '100%',
    maxWidth: '380px',
    padding: '2rem',
    backgroundColor: 'var(--surface)',
    borderRadius: '12px',
    border: '1px solid var(--border)',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 700,
    marginBottom: '0.25rem',
  },
  subtitle: {
    color: 'var(--text-muted)',
    marginBottom: '1.5rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  error: {
    padding: '0.75rem',
    borderRadius: '6px',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: 'var(--error)',
    fontSize: '0.875rem',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    fontSize: '0.875rem',
    color: 'var(--text-muted)',
  },
  input: {
    padding: '0.75rem',
    borderRadius: '6px',
    border: '1px solid var(--border)',
    backgroundColor: 'var(--bg)',
    color: 'var(--text)',
  },
  button: {
    padding: '0.75rem',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: 'var(--accent)',
    color: 'white',
    fontWeight: 600,
    marginTop: '0.5rem',
  },
  footer: {
    marginTop: '1.5rem',
    fontSize: '0.875rem',
    color: 'var(--text-muted)',
    textAlign: 'center',
  },
}
