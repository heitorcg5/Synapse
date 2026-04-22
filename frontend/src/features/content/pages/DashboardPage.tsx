import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

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
    },
    {
      to: '/knowledge',
      title: t('nav.knowledge'),
      desc: t('hubKnowledgeDesc'),
    },
    {
      to: '/upload',
      title: t('capture'),
      desc: t('hubCaptureDesc'),
    },
  ]

  return (
    <div>
      <h1 style={styles.title}>{t('digitalBrainHub')}</h1>
      <p style={styles.subtitle}>{t('digitalBrainHubSubtitle')}</p>
      <div style={styles.grid}>
        {cards.map(({ to, title, desc }) => (
          <Link key={to} to={to} style={styles.card}>
            <span style={styles.cardTitle}>{title}</span>
            <span style={styles.cardDesc}>{desc}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  title: {
    fontSize: '1.5rem',
    fontWeight: 700,
    marginBottom: '0.5rem',
  },
  subtitle: {
    color: 'var(--text-muted)',
    marginBottom: '1.5rem',
    maxWidth: 520,
    lineHeight: 1.5,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '1rem',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    padding: '1.25rem',
    borderRadius: 12,
    border: '1px solid var(--border)',
    backgroundColor: 'var(--surface)',
    color: 'inherit',
    textDecoration: 'none',
    transition: 'border-color 0.15s ease',
  },
  cardTitle: {
    fontWeight: 600,
    color: 'var(--accent)',
  },
  cardDesc: {
    fontSize: '0.875rem',
    color: 'var(--text-muted)',
    lineHeight: 1.4,
  },
}
