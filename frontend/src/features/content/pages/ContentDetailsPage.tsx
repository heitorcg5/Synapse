import { useParams, Link } from 'react-router-dom'
import { useContent } from '../hooks/useContent'
import { useQuery } from '@tanstack/react-query'
import { contentApi } from '../api/content-api'

export function ContentDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const { data: content, isLoading, error } = useContent(id)
  const { data: tags = [] } = useQuery({
    queryKey: ['content-tags', id],
    queryFn: () => contentApi.getTags(id!).then((res) => res.data),
    enabled: !!id,
  })

  if (isLoading || !id) {
    return <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
  }
  if (error || !content) {
    return (
      <p style={{ color: 'var(--error)' }}>
        Content not found or failed to load.
      </p>
    )
  }

  return (
    <div>
      <div style={styles.header}>
        <Link to="/dashboard" style={styles.back}>
          ← Dashboard
        </Link>
      </div>
      <div style={styles.card}>
        <h1 style={styles.title}>Content details</h1>
        <dl style={styles.dl}>
          <dt style={styles.dt}>ID</dt>
          <dd style={styles.dd}>{content.id}</dd>
          <dt style={styles.dt}>Type</dt>
          <dd style={styles.dd}>{content.type}</dd>
          <dt style={styles.dt}>Status</dt>
          <dd style={styles.dd}>
            <span
              style={{
                ...styles.badge,
                ...(content.status === 'READY'
                  ? { backgroundColor: 'rgba(34, 197, 94, 0.2)', color: 'var(--success)' }
                  : {}),
              }}
            >
              {content.status}
            </span>
          </dd>
          <dt style={styles.dt}>Uploaded</dt>
          <dd style={styles.dd}>
            {new Date(content.uploadedAt).toLocaleString()}
          </dd>
          {content.sourceUrl && (
            <>
              <dt style={styles.dt}>Source URL</dt>
              <dd style={styles.dd}>
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
          <div style={styles.tags}>
            <strong>Tags:</strong>{' '}
            {tags.map((t) => (
              <span key={t.id} style={styles.tag}>
                {t.name}
              </span>
            ))}
          </div>
        )}
        <div style={styles.actions}>
          <Link
            to={`/content/${content.id}/summary`}
            style={styles.summaryLink}
          >
            View summary
          </Link>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  header: { marginBottom: '1rem' },
  back: {
    color: 'var(--text-muted)',
    fontSize: '0.875rem',
  },
  card: {
    padding: '1.5rem',
    backgroundColor: 'var(--surface)',
    borderRadius: '12px',
    border: '1px solid var(--border)',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 600,
    marginBottom: '1rem',
  },
  dl: {
    display: 'grid',
    gridTemplateColumns: 'auto 1fr',
    gap: '0.5rem 1.5rem',
    marginBottom: '1rem',
  },
  dt: {
    color: 'var(--text-muted)',
    fontSize: '0.875rem',
  },
  dd: {
    margin: 0,
    fontSize: '0.875rem',
  },
  badge: {
    display: 'inline-block',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    backgroundColor: 'var(--surface)',
    fontSize: '0.75rem',
  },
  tags: {
    marginBottom: '1rem',
    fontSize: '0.875rem',
  },
  tag: {
    display: 'inline-block',
    marginRight: '0.5rem',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    color: 'var(--accent)',
  },
  actions: {
    marginTop: '1rem',
    paddingTop: '1rem',
    borderTop: '1px solid var(--border)',
  },
  summaryLink: {
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    backgroundColor: 'var(--accent)',
    color: 'white',
    fontWeight: 500,
  },
}
