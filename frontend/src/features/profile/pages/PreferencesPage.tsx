import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import i18n from '@/i18n/config'
import { useAuth } from '@/app/auth-context'
import { userApi } from '../api/user-api'
import { getGroupedTimeZones } from '@/shared/utils/timezones'
import { formatUserDate, formatUserTime } from '@/shared/preferences/user-datetime'
import { getErrorMessage } from '@/shared/utils/api-client'

/** Fixed sample for preview (avoids hydration surprises). */
const SAMPLE_ISO = '2024-06-15T14:30:00.000Z'

export function PreferencesPage() {
  const { t } = useTranslation()
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const profileQueryKey = ['user-profile', token ?? ''] as const

  const { data: profile, isLoading, error } = useQuery({
    queryKey: profileQueryKey,
    queryFn: () => userApi.getMe().then((r) => r.data),
    enabled: !!token,
  })

  const defaultTz = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    } catch {
      return 'UTC'
    }
  }, [])

  const [language, setLanguage] = useState<'en' | 'es'>('en')
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('system')
  const [timezone, setTimezone] = useState(defaultTz)
  const [dateFormat, setDateFormat] = useState<'iso' | 'dmy' | 'mdy'>('iso')
  const [timeFormat, setTimeFormat] = useState<'h24' | 'h12'>('h24')

  useEffect(() => {
    if (!profile) return
    if (profile.preferredLanguage === 'es' || profile.preferredLanguage === 'en') {
      setLanguage(profile.preferredLanguage)
    } else {
      setLanguage(i18n.language.startsWith('es') ? 'es' : 'en')
    }
    const th = profile.preferredTheme?.toLowerCase()
    if (th === 'dark' || th === 'light' || th === 'system') setTheme(th)
    else setTheme('system')
    setTimezone(profile.preferredTimezone?.trim() || defaultTz)
    const df = profile.dateFormat?.toLowerCase()
    if (df === 'dmy' || df === 'mdy' || df === 'iso') setDateFormat(df)
    else setDateFormat('iso')
    const tf = profile.timeFormat?.toLowerCase()
    if (tf === 'h12' || tf === 'h24') setTimeFormat(tf)
    else setTimeFormat('h24')
  }, [profile, defaultTz])

  const [showSaved, setShowSaved] = useState(false)

  const updateMutation = useMutation({
    mutationFn: () =>
      userApi.updateMe({
        preferredLanguage: language,
        preferredTheme: theme,
        preferredTimezone: timezone,
        dateFormat,
        timeFormat,
      }),
    onSuccess: (res) => {
      queryClient.setQueryData(profileQueryKey, res.data)
      void i18n.changeLanguage(res.data.preferredLanguage === 'es' ? 'es' : 'en')
      setShowSaved(true)
      window.setTimeout(() => setShowSaved(false), 4000)
    },
  })

  const groupedZones = useMemo(() => getGroupedTimeZones(), [])

  const previewPrefs = useMemo(
    () => ({
      dateFormat,
      timeFormat,
      timeZone: timezone,
    }),
    [dateFormat, timeFormat, timezone],
  )

  const previewDate = formatUserDate(SAMPLE_ISO, language, previewPrefs)
  const previewTime = formatUserTime(SAMPLE_ISO, language, previewPrefs)

  if (isLoading) {
    return <p style={{ color: 'var(--text-muted)' }}>{t('loading')}</p>
  }
  if (error || !profile) {
    return <p style={{ color: 'var(--error)' }}>{t('profileLoadError')}</p>
  }

  return (
    <div>
      <h1 style={styles.title}>{t('preferences.title')}</h1>
      <p style={styles.subtitle}>{t('preferences.subtitle')}</p>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>{t('preferences.sectionLanguage')}</h2>
        <p style={styles.sectionHint}>{t('preferences.languageHint')}</p>
        <label style={styles.label}>
          {t('preferences.language')}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'en' | 'es')}
            style={styles.selectWide}
          >
            <option value="en">{t('preferences.langEnglish')}</option>
            <option value="es">{t('preferences.langSpanish')}</option>
          </select>
        </label>
      </section>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>{t('preferences.sectionTheme')}</h2>
        <p style={styles.sectionHint}>{t('preferences.themeHint')}</p>
        <label style={styles.label}>
          {t('preferences.theme')}
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as 'dark' | 'light' | 'system')}
            style={styles.selectWide}
          >
            <option value="dark">{t('preferences.themeDark')}</option>
            <option value="light">{t('preferences.themeLight')}</option>
            <option value="system">{t('preferences.themeSystem')}</option>
          </select>
        </label>
      </section>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>{t('preferences.sectionTimezone')}</h2>
        <p style={styles.sectionHint}>{t('preferences.timezoneHint')}</p>
        <label style={styles.label}>
          {t('preferences.timezone')}
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            style={styles.selectTz}
          >
            {groupedZones.map(({ region, zones }) => (
              <optgroup key={region} label={region}>
                {zones.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
      </section>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>{t('preferences.sectionDateFormat')}</h2>
        <p style={styles.sectionHint}>{t('preferences.dateFormatHint')}</p>
        <label style={styles.label}>
          {t('preferences.dateFormat')}
          <select
            value={dateFormat}
            onChange={(e) => setDateFormat(e.target.value as 'iso' | 'dmy' | 'mdy')}
            style={styles.selectWide}
          >
            <option value="iso">{t('preferences.dateIso')}</option>
            <option value="dmy">{t('preferences.dateDmy')}</option>
            <option value="mdy">{t('preferences.dateMdy')}</option>
          </select>
        </label>
      </section>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>{t('preferences.sectionTimeFormat')}</h2>
        <p style={styles.sectionHint}>{t('preferences.timeFormatHint')}</p>
        <label style={styles.label}>
          {t('preferences.timeFormat')}
          <select
            value={timeFormat}
            onChange={(e) => setTimeFormat(e.target.value as 'h24' | 'h12')}
            style={styles.selectWide}
          >
            <option value="h24">{t('preferences.time24')}</option>
            <option value="h12">{t('preferences.time12')}</option>
          </select>
        </label>
      </section>

      <section style={styles.previewCard}>
        <h2 style={styles.sectionTitle}>{t('preferences.previewTitle')}</h2>
        <p style={styles.previewNote}>{t('preferences.previewNote')}</p>
        <div style={styles.previewGrid}>
          <div>
            <span style={styles.previewKey}>{t('preferences.previewDate')}</span>
            <span style={styles.previewVal}>{previewDate}</span>
          </div>
          <div>
            <span style={styles.previewKey}>{t('preferences.previewTime')}</span>
            <span style={styles.previewVal}>{previewTime}</span>
          </div>
        </div>
      </section>

      {updateMutation.isError && (
        <div style={styles.error} role="alert">
          {getErrorMessage(updateMutation.error)}
        </div>
      )}
      {showSaved && (
        <div style={styles.success} role="status">
          {t('preferences.saved')}
        </div>
      )}

      <button
        type="button"
        style={styles.button}
        disabled={updateMutation.isPending}
        onClick={() => updateMutation.mutate()}
      >
        {updateMutation.isPending ? t('preferences.saving') : t('preferences.save')}
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
    maxWidth: 560,
    lineHeight: 1.5,
  },
  card: {
    marginBottom: '1.25rem',
    padding: '1.25rem',
    borderRadius: 12,
    border: '1px solid var(--border)',
    backgroundColor: 'var(--surface)',
  },
  previewCard: {
    marginBottom: '1.25rem',
    padding: '1.25rem',
    borderRadius: 12,
    border: '1px solid rgba(99, 102, 241, 0.35)',
    backgroundColor: 'rgba(99, 102, 241, 0.06)',
  },
  sectionTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    marginBottom: '0.35rem',
    marginTop: 0,
  },
  sectionHint: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    marginBottom: '1rem',
    lineHeight: 1.45,
    marginTop: 0,
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
    fontSize: '0.875rem',
    color: 'var(--text-muted)',
    marginBottom: 0,
  },
  selectWide: {
    padding: '0.75rem',
    borderRadius: 8,
    border: '1px solid var(--border)',
    backgroundColor: 'var(--bg)',
    color: 'var(--text)',
    maxWidth: 360,
  },
  selectTz: {
    padding: '0.75rem',
    borderRadius: 8,
    border: '1px solid var(--border)',
    backgroundColor: 'var(--bg)',
    color: 'var(--text)',
    maxWidth: '100%',
    width: 'min(100%, 420px)',
  },
  previewNote: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    marginBottom: '0.85rem',
    marginTop: 0,
  },
  previewGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: '1rem',
  },
  previewKey: {
    display: 'block',
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    marginBottom: '0.25rem',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  previewVal: {
    fontSize: '1rem',
    fontWeight: 600,
    color: 'var(--text)',
    fontVariantNumeric: 'tabular-nums',
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
