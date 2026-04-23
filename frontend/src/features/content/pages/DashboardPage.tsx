import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Brain, Inbox, Upload } from 'lucide-react'
import { Card, CardDescription, CardHeader, CardIcon, CardTitle } from '@/shared/components/ui/Card'
import { SurfaceContainer } from '@/shared/components/ui/SurfaceContainer'

/**
 * Digital Brain hub: quick navigation between inbox, knowledge, and capture.
 */
export function DashboardPage() {
  const { t } = useTranslation()

  const cards = [
    {
      to: '/inbox',
      title: t('nav.inbox'),
      desc: t('hubInboxDesc'),
      icon: Inbox,
    },
    {
      to: '/knowledge',
      title: t('nav.knowledge'),
      desc: t('hubKnowledgeDesc'),
      icon: Brain,
    },
    {
      to: '/upload',
      title: t('capture'),
      desc: t('hubCaptureDesc'),
      icon: Upload,
    },
  ]

  return (
    <SurfaceContainer>
      <h1 className="mb-3 text-center text-[28px] font-semibold leading-[1.3] tracking-[-0.02em] text-app-text">
        {t('digitalBrainHub')}
      </h1>
      <p className="mx-auto mb-8 max-w-[760px] text-center text-[15px] leading-[1.5] text-[#9CA3AF]">
        {t('digitalBrainHubSubtitle')}
      </p>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {cards.map(({ to, title, desc, icon: Icon }) => (
          <Link key={to} to={to} className="text-inherit no-underline">
            <Card className="h-full">
              <CardHeader>
                <CardIcon>
                  <Icon size={18} className="text-brand-purple" />
                </CardIcon>
                <CardTitle className="m-0 text-brand-purple">{title}</CardTitle>
              </CardHeader>
              <CardDescription className="m-0 text-[15px] leading-[1.4] text-[#9CA3AF]">
                {desc}
              </CardDescription>
            </Card>
          </Link>
        ))}
      </div>
    </SurfaceContainer>
  )
}
