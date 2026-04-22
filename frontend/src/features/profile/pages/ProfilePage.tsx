import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/app/auth-context'
import { userApi } from '../api/user-api'
import { ProfileAvatarSection } from '../components/ProfileAvatarSection'
import { getErrorMessage } from '@/shared/utils/api-client'

export function ProfilePage() {
  const { t } = useTranslation()
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const profileQueryKey = ['user-profile', token ?? ''] as const
  const { data: profile, isLoading, error } = useQuery({
    queryKey: profileQueryKey,
    queryFn: () => userApi.getMe().then((r) => r.data),
    enabled: !!token,
  })

  const [displayName, setDisplayName] = useState('')

  useEffect(() => {
    if (!profile) return
    setDisplayName(profile.displayName ?? '')
  }, [profile])

  const [showSaved, setShowSaved] = useState(false)

  const updateMutation = useMutation({
    mutationFn: () =>
      userApi.updateMe({
        displayName: displayName.trim() || null,
      }),
    onSuccess: (res) => {
      queryClient.setQueryData(profileQueryKey, res.data)
      setShowSaved(true)
      window.setTimeout(() => setShowSaved(false), 4000)
    },
  })

  if (isLoading) {
    return <p style={{ color: 'var(--text-muted)' }}>{t('loading')}</p>
  }
  if (error || !profile) {
    return (
      <p style={{ color: 'var(--error)' }}>{t('profileLoadError')}</p>
    )
  }

  return (
    <div>
      <h1 style={styles.title}>{t('profile.title')}</h1>
      <p style={styles.subtitle}>{t('profile.subtitle')}</p>

      <ProfileAvatarSection
        hasAvatar={!!profile.hasAvatar}
        profileQueryKey={profileQueryKey}
      />

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>{t('profile.sectionAccount')}</h2>
        <label style={styles.label}>
          {t('profile.email')}
          <input
            type="email"
            readOnly
            value={profile.email}
            style={{ ...styles.input, ...styles.inputReadonly }}
          />
        </label>
        <p style={styles.hint}>{t('profile.emailHint')}</p>
      </section>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>{t('profile.sectionProfile')}</h2>
        <label style={styles.label}>
          {t('profile.displayName')}
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={120}
            placeholder={t('profile.displayNamePlaceholder')}
            style={styles.input}
          />
        </label>
      </section>

      {updateMutation.isError && (
        <div style={styles.error} role="alert">
          {getErrorMessage(updateMutation.error)}
        </div>
      )}
      {showSaved && (
        <div style={styles.success} role="status">
          {t('profile.saved')}
        </div>
      )}

      <button
        type="button"
        style={styles.button}
        disabled={updateMutation.isPending}
        onClick={() => updateMutation.mutate()}
      >
        {updateMutation.isPending ? t('profile.saving') : t('profile.save')}
      </button>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  title: {
    fontSize: '1.5rem',
    fontWeight: 600,
    marginBottom: '0.5rem',
  },
  subtitle: {
    color: 'var(--text-muted)',
    marginBottom: '1.5rem',
    maxWidth: 520,
    lineHeight: 1.5,
  },
  card: {
    marginBottom: '1.25rem',
    padding: '1.25rem',
    borderRadius: 12,
    border: '1px solid var(--border)',
    backgroundColor: 'var(--surface)',
  },
  sectionTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    marginBottom: '1rem',
    marginTop: 0,
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
    fontSize: '0.875rem',
    color: 'var(--text-muted)',
    marginBottom: '0.75rem',
  },
  input: {
    padding: '0.75rem',
    borderRadius: 8,
    border: '1px solid var(--border)',
    backgroundColor: 'var(--bg)',
    color: 'var(--text)',
  },
  inputReadonly: {
    opacity: 0.85,
    cursor: 'not-allowed',
  },
  hint: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    marginTop: '-0.25rem',
    marginBottom: 0,
    lineHeight: 1.4,
  },
  error: {
    padding: '0.75rem',
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: 'var(--error)',
    marginBottom: '1rem',
    fontSize: '0.875rem',
  },
  success: {
    padding: '0.75rem',
    borderRadius: 8,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    color: 'var(--text)',
    marginBottom: '1rem',
    fontSize: '0.875rem',
  },
  button: {
    padding: '0.65rem 1.25rem',
    borderRadius: 8,
    border: 'none',
    backgroundColor: 'var(--accent)',
    color: 'white',
    fontWeight: 600,
    cursor: 'pointer',
  },
}
