import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/app/auth-context'
import { authApi } from '../api/auth-api'
import { getErrorMessage } from '@/shared/utils/api-client'
import { Card } from '@/shared/components/ui/Card'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'

export function RegisterPage() {
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
      const normalizedEmail = email.trim().toLowerCase()
      const { data } = await authApi.register({ email: normalizedEmail, password })
      setToken(data.accessToken)
      navigate('/inbox', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-app-gradient px-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="font-heading text-3xl font-semibold text-app-text">{t('auth.createAccount')}</h1>
        <p className="mt-3 text-sm text-app-muted">
          {t('auth.synapse')} · {t('auth.subtitle')}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
          {error ? (
            <div className="rounded-xl border border-app-error/40 bg-app-error/10 px-3 py-2 text-sm text-app-error" role="alert">
              {error}
            </div>
          ) : null}

          <label className="flex flex-col gap-1 text-[13px] font-medium text-app-muted">
            {t('auth.email')}
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>

          <label className="flex flex-col gap-1 text-[13px] font-medium text-app-muted">
            {t('auth.passwordMin')}
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>

          <Button type="submit" disabled={loading} className="mt-2 w-full">
            {loading ? t('auth.creatingAccount') : t('auth.register')}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-app-muted">
          {t('auth.hasAccount')} <Link to="/login" className="text-brand-cyan">{t('auth.signInLink')}</Link>
        </p>
      </Card>
    </div>
  )
}
