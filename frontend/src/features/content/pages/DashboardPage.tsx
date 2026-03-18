import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useContentList } from '../hooks/useContentList'

const STATUS_KEYS: Record<string, string> = {
  READY: 'statusReady',
  PENDING: 'statusPending',
  PROCESSING: 'statusProcessing',
  FAILED: 'statusFailed',
}

export function DashboardPage() {
  const { t } = useTranslation()
  const { data: contents, isLoading, error } = useContentList()

  const translateStatus = (status: string) => t(STATUS_KEYS[status] || status)

  if (isLoading) {
    return <p style={{ color: 'var(--text-muted)' }}>{t('loading')}</p>
  }
  if (error) {
    return (
      <p style={{ color: 'var(--error)' }}>
        {t('failedToLoad')}
      </p>
    )
  }

  const list = contents ?? []

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>{t('dashboard')}</h1>
        <Link to="/upload" style={styles.uploadLink}>
          {t('upload')}
        </Link>
      </div>
      {list.length === 0 ? (
        <div style={styles.empty}>
          <p>{t('noContent')}</p>
          <Link to="/upload">{t('uploadFirst')}</Link>
        </div>
      ) : (
        <ul style={styles.list}>
          {list.map((c) => (
            <li key={c.id} style={styles.item}>
              <Link to={`/content/${c.id}`} style={styles.itemLink}>
                <span style={styles.type}>{c.type}</span>
                <span style={styles.status}>{translateStatus(c.status)}</span>
                <span style={styles.date}>
                  {new Date(c.uploadedAt).toLocaleDateString()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 600,
  },
  uploadLink: {
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    backgroundColor: 'var(--accent)',
    color: 'white',
    fontWeight: 500,
  },
  empty: {
    padding: '2rem',
    textAlign: 'center',
    color: 'var(--text-muted)',
  },
  list: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  item: {
    border: '1px solid var(--border)',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  itemLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem',
    color: 'inherit',
  },
  type: {
    fontWeight: 500,
    minWidth: '80px',
  },
  status: {
    fontSize: '0.875rem',
    color: 'var(--text-muted)',
  },
  date: {
    marginLeft: 'auto',
    fontSize: '0.875rem',
    color: 'var(--text-muted)',
  },
}
