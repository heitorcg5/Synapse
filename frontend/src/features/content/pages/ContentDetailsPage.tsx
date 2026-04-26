import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useContent } from '../hooks/useContent'
import { useQuery } from '@tanstack/react-query'
import { contentApi } from '../api/content-api'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { SurfaceContainer } from '@/shared/components/ui/SurfaceContainer'

const STATUS_KEYS: Record<string, string> = {
  READY: 'statusReady',
  PENDING: 'statusPending',
  PROCESSING: 'statusProcessing',
  FAILED: 'statusFailed',
}

export function ContentDetailsPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const translateStatus = (status: string) => t(STATUS_KEYS[status] || status)
  const { data: content, isLoading, error } = useContent(id)
  const { data: tags = [] } = useQuery({
    queryKey: ['content-tags', id],
    queryFn: () => contentApi.getTags(id!).then((res) => res.data),
    enabled: !!id,
    refetchInterval: 5_000,
  })
  const statusTone = (status: string): 'default' | 'success' | 'warning' | 'error' => {
    if (status === 'READY') return 'success'
    if (status === 'FAILED') return 'error'
    if (status === 'PENDING') return 'warning'
    return 'default'
  }

  if (isLoading || !id) {
    return <p className="text-app-muted">{t('loading')}</p>
  }
  if (error || !content) {
    return <p className="text-app-error">{t('contentNotFoundOrFailed')}</p>
  }

  return (
    <div>
      <div className="mb-4">
        <Link to="/inbox" className="text-sm text-app-muted">
          ← {t('backToInbox')}
        </Link>
      </div>
      <SurfaceContainer>
        <h1 className="mb-4 text-[28px] font-semibold leading-[1.3] tracking-[-0.02em] text-app-text">
          {t('contentDetails')}
        </h1>
        <dl className="mb-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
          <dt className="text-sm text-app-muted">ID</dt>
          <dd className="m-0 text-sm">{content.id}</dd>
          <dt className="text-sm text-app-muted">{t('type')}</dt>
          <dd className="m-0 text-sm">{content.type}</dd>
          <dt className="text-sm text-app-muted">{t('title')}</dt>
          <dd className="m-0 text-sm">{content.title || '—'}</dd>
          <dt className="text-sm text-app-muted">{t('status')}</dt>
          <dd className="m-0 text-sm">
            <Badge tone={statusTone(content.status)} className="rounded-md px-2 py-1 normal-case tracking-normal">
              {translateStatus(content.status)}
            </Badge>
          </dd>
          <dt className="text-sm text-app-muted">{t('uploaded')}</dt>
          <dd className="m-0 text-sm">{new Date(content.capturedAt).toLocaleString()}</dd>
          {content.sourceUrl && (
            <>
              <dt className="text-sm text-app-muted">{t('sourceUrl')}</dt>
              <dd className="m-0 text-sm">
                <a
                  href={content.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {content.sourceUrl}
                </a>
              </dd>
            </>
          )}
        </dl>
        {tags.length > 0 && (
          <div className="mb-4 text-sm">
            <strong>{t('tags')}:</strong>{' '}
            {tags.map((t) => (
              <span
                key={t.id}
                className="mr-2 inline-flex rounded-md bg-brand-purple/20 px-2 py-1 text-brand-purple"
              >
                {t.name}
              </span>
            ))}
          </div>
        )}
        <div className="mt-4 border-t border-[var(--border)] pt-4">
          <Link
            to={`/content/${content.id}/summary`}
            className="no-underline"
          >
            <Button size="sm">{t('viewSummary')}</Button>
          </Link>
        </div>
      </SurfaceContainer>
    </div>
  )
}
