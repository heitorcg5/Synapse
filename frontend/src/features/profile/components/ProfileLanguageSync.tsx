import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import i18n from '@/i18n/config'
import { useAuth } from '@/app/auth-context'
import { userApi } from '../api/user-api'

/**
 * Applies the user's saved interface language from the server (profile).
 * If they never saved a preference (null), keeps current i18n (browser / localStorage).
 */
export function ProfileLanguageSync() {
  const { token } = useAuth()
  const { data } = useQuery({
    queryKey: ['user-profile', token ?? ''],
    queryFn: () => userApi.getMe().then((r) => r.data),
    enabled: !!token,
    staleTime: 60_000,
  })

  useEffect(() => {
    const saved = data?.preferredLanguage
    if (saved !== 'en' && saved !== 'es') return
    const current = i18n.language || ''
    if (current.startsWith(saved)) return
    void i18n.changeLanguage(saved)
  }, [data?.preferredLanguage])

  return null
}
