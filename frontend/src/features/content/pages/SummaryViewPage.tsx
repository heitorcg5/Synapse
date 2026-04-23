import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useContent } from '../hooks/useContent'
import { useContentSummary } from '../hooks/useContentSummary'
import { SurfaceContainer } from '@/shared/components/ui/SurfaceContainer'

export function SummaryViewPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const { data: content, isLoading: contentLoading } = useContent(id)
  const { data: summary, isLoading: summaryLoading, error } = useContentSummary(id)

  const isLoading = contentLoading || summaryLoading

  if (isLoading || !id) {
    return <p className="text-app-muted">{t('loading')}</p>
  }
  if (!content) {
    return <p className="text-app-error">{t('contentNotFound')}</p>
  }

  const summaryPending = !!error || !summary

  return (
    <div>
      <div className="mb-4">
        <Link to={`/content/${id}`} className="text-sm text-app-muted">
          ← {t('backToContent')}
        </Link>
      </div>
      <SurfaceContainer>
        <h1 className="mb-1 text-[28px] font-semibold leading-[1.3] tracking-[-0.02em] text-app-text">
          {t('summary')}
        </h1>
        <p className="mb-4 text-sm text-app-muted">
          {content.type} · {new Date(content.uploadedAt).toLocaleDateString()}
        </p>
        <div className="mb-4 whitespace-pre-wrap leading-[1.6]">
          {summaryPending
            ? t('noSummaryYet')
            : summary.summaryText}
        </div>
        {summary?.model && (
          <p className="text-xs text-app-muted">{t('generatedWith')}: {summary.model}</p>
        )}
      </SurfaceContainer>
    </div>
  )
}
