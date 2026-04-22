import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/app/auth-context'
import { userApi } from '../api/user-api'

/**
 * Applies saved theme (dark / light / system) to `document.documentElement[data-theme]`.
 */
export function ThemeSync() {
  const { token } = useAuth()
  const { data: profile } = useQuery({
    queryKey: ['user-profile', token ?? ''],
    queryFn: () => userApi.getMe().then((r) => r.data),
    enabled: !!token,
    staleTime: 60_000,
  })

  useEffect(() => {
    const raw = profile?.preferredTheme?.trim().toLowerCase() ?? ''
    const theme =
      raw === 'dark' || raw === 'light' || raw === 'system' ? raw : 'system'

    const resolve = () =>
      theme === 'system'
        ? window.matchMedia('(prefers-color-scheme: light)').matches
          ? 'light'
          : 'dark'
        : theme

    const apply = () => {
      document.documentElement.setAttribute('data-theme', resolve())
    }
    apply()

    if (theme !== 'system') return

    const mql = window.matchMedia('(prefers-color-scheme: light)')
    const onChange = () => apply()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [profile?.preferredTheme])

  return null
}
