import { useParams, Link } from 'react-router-dom'
import { useContent } from '../hooks/useContent'
import { useContentSummary } from '../hooks/useContentSummary'

export function SummaryViewPage() {
  const { id } = useParams<{ id: string }>()
  const { data: content, isLoading: contentLoading } = useContent(id)
  const { data: summary, isLoading: summaryLoading, error } = useContentSummary(id)

  const isLoading = contentLoading || summaryLoading

  if (isLoading || !id) {
    return <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
  }
  if (!content) {
    return (
      <p style={{ color: 'var(--error)' }}>
        Content not found.
      </p>
    )
  }

  const summaryPending = !!error || !summary

  return (
    <div>
      <div style={styles.header}>
        <Link to={`/content/${id}`} style={styles.back}>
          ← Back to content
        </Link>
      </div>
      <div style={styles.card}>
        <h1 style={styles.title}>Summary</h1>
        <p style={styles.meta}>
          {content.type} · {new Date(content.uploadedAt).toLocaleDateString()}
        </p>
        <div style={styles.summary}>
          {summaryPending
            ? 'No summary available yet. Processing may still be in progress.'
            : summary.summaryText}
        </div>
        {summary?.model && (
          <p style={styles.model}>Generated with: {summary.model}</p>
        )}
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
    marginBottom: '0.25rem',
  },
  meta: {
    color: 'var(--text-muted)',
    fontSize: '0.875rem',
    marginBottom: '1rem',
  },
  summary: {
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap',
    marginBottom: '1rem',
  },
  model: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  },
}
