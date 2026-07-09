import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Brain, Inbox, Layers, Network, Settings, Upload } from 'lucide-react'
import { brainApi } from '@/features/brain/api/brain-api'
import { useInboxList } from '@/features/brain/hooks/useInboxList'
import { Card, CardDescription, CardHeader, CardIcon, CardTitle } from '@/shared/components/ui/Card'
import { PageHeader } from '@/shared/components/ui/PageHeader'
import { SurfaceContainer } from '@/shared/components/ui/SurfaceContainer'

type HubCard = {
  to: string
  title: string
  desc: string
  icon: typeof Inbox
}

export function DashboardPage() {
  const { t } = useTranslation()
  const { data: inbox = [], isPending: inboxPending } = useInboxList()
  const { data: knowledge = [], isPending: knowledgePending } = useQuery({
    queryKey: ['dashboard-knowledge'] as const,
    queryFn: () => brainApi.knowledgeList().then((r) => r.data),
  })

  const readyCount = inbox.filter((item) => item.status === 'READY').length
  const processingCount = inbox.filter((item) => item.status === 'PROCESSING').length

  const stat = (value: number | string) => (
    <span className="text-2xl font-semibold tabular-nums text-app-text">{value}</span>
  )

  const captureCards: HubCard[] = [
    {
      to: '/upload',
      title: t('capture'),
      desc: t('hubCaptureDesc'),
      icon: Upload,
    },
    {
      to: '/inbox',
      title: t('nav.inbox'),
      desc: t('hubInboxDesc'),
      icon: Inbox,
    },
  ]

  const knowledgeCards: HubCard[] = [
    {
      to: '/knowledge',
      title: t('nav.knowledge'),
      desc: t('hubKnowledgeDesc'),
      icon: Brain,
    },
    {
      to: '/knowledge/graph',
      title: t('knowledge.graphView'),
      desc: t('hubGraphDesc'),
      icon: Network,
    },
    {
      to: '/flashcards',
      title: t('nav.flashcards'),
      desc: t('hubFlashcardsDesc'),
      icon: Layers,
    },
  ]

  const configCards: HubCard[] = [
    {
      to: '/settings',
      title: t('nav.userMenu.settings'),
      desc: t('hubSettingsDesc'),
      icon: Settings,
    },
  ]

  const renderCard = ({ to, title, desc, icon: Icon }: HubCard) => (
    <Link key={to} to={to} className="text-inherit no-underline">
      <Card className="h-full transition-transform duration-150 hover:-translate-y-px">
        <CardHeader>
          <CardIcon>
            <Icon size={18} className="text-brand-purple" />
          </CardIcon>
          <CardTitle className="m-0 text-brand-purple">{title}</CardTitle>
        </CardHeader>
        <CardDescription className="m-0 text-[15px] leading-[1.45] text-app-muted">{desc}</CardDescription>
      </Card>
    </Link>
  )

  return (
    <div className="space-y-6">
      <PageHeader title={t('digitalBrainHub')} subtitle={t('digitalBrainHubSubtitle')} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SurfaceContainer className="p-4">
          <p className="m-0 text-xs font-semibold uppercase tracking-wide text-app-muted">
            {t('dashboardStatInbox')}
          </p>
          <div className="mt-2">{inboxPending ? '—' : stat(inbox.length)}</div>
        </SurfaceContainer>
        <SurfaceContainer className="p-4">
          <p className="m-0 text-xs font-semibold uppercase tracking-wide text-app-muted">
            {t('dashboardStatReady')}
          </p>
          <div className="mt-2">{inboxPending ? '—' : stat(readyCount)}</div>
        </SurfaceContainer>
        <SurfaceContainer className="p-4">
          <p className="m-0 text-xs font-semibold uppercase tracking-wide text-app-muted">
            {t('dashboardStatKnowledge')}
          </p>
          <div className="mt-2">{knowledgePending ? '—' : stat(knowledge.length)}</div>
        </SurfaceContainer>
        <SurfaceContainer className="p-4">
          <p className="m-0 text-xs font-semibold uppercase tracking-wide text-app-muted">
            {t('dashboardStatProcessing')}
          </p>
          <div className="mt-2">{inboxPending ? '—' : stat(processingCount)}</div>
        </SurfaceContainer>
      </div>

      <SurfaceContainer className="p-5">
        <p className="m-0 text-xs font-semibold uppercase tracking-wide text-brand-cyan">
          {t('dashboardWorkflowTitle')}
        </p>
        <p className="mb-0 mt-2 text-sm leading-relaxed text-app-muted">{t('dashboardWorkflowDesc')}</p>
      </SurfaceContainer>

      <section className="space-y-3">
        <h2 className="m-0 text-sm font-semibold uppercase tracking-wide text-app-muted">
          {t('dashboardSectionCapture')}
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{captureCards.map(renderCard)}</div>
      </section>

      <section className="space-y-3">
        <h2 className="m-0 text-sm font-semibold uppercase tracking-wide text-app-muted">
          {t('dashboardSectionStudy')}
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {knowledgeCards.map(renderCard)}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="m-0 text-sm font-semibold uppercase tracking-wide text-app-muted">
          {t('dashboardSectionConfig')}
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {configCards.map(renderCard)}
        </div>
      </section>
    </div>
  )
}
