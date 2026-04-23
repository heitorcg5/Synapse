import { Link, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ProfileLanguageSync } from '@/features/profile/components/ProfileLanguageSync'
import { ThemeSync } from '@/features/profile/components/ThemeSync'
import { HeaderNotificationsBell } from '@/features/notifications/components/HeaderNotificationsBell'
import { HeaderProfileAvatar } from '@/features/profile/components/HeaderProfileAvatar'
import { NavigationItem } from '@/shared/components/ui/NavigationItem'
import { SectionContainer } from '@/shared/components/ui/SectionContainer'

export function Layout() {
  const { t } = useTranslation()
  const navItems = [
    { to: '/dashboard', label: t('dashboard') },
    { to: '/inbox', label: t('nav.inbox') },
    { to: '/knowledge', label: t('nav.knowledge') },
    { to: '/upload', label: t('capture') },
  ]

  return (
    <div className="min-h-screen bg-app-gradient">
      <header className="sticky top-0 z-20 h-16 border-b border-[rgba(255,255,255,0.06)] bg-app-bg2/85 backdrop-blur">
        <div className="mx-auto flex h-full w-full max-w-[1200px] items-center gap-4 px-6">
          <Link to="/inbox" className="font-heading text-lg font-semibold tracking-wider text-app-text">
            {t('auth.synapse')}
          </Link>
          <nav className="flex min-w-0 flex-1 items-center gap-2">
            {navItems.map((item) => (
              <NavigationItem key={item.to} to={item.to} label={item.label} />
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <ProfileLanguageSync />
            <ThemeSync />
            <HeaderNotificationsBell />
            <HeaderProfileAvatar />
          </div>
        </div>
      </header>
      <main className="min-h-screen">
        <SectionContainer className="pb-16 pt-12">
          <Outlet />
        </SectionContainer>
      </main>
    </div>
  )
}
