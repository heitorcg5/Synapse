import type { CSSProperties, ReactNode } from 'react'

export type MetadataItem = {
  label: string
  value: ReactNode
  icon?: ReactNode
}

export function MetadataSidePanel({
  title,
  items,
  footer,
}: {
  title?: string
  items: MetadataItem[]
  footer?: ReactNode
}) {
  return (
    <aside style={styles.panel}>
      {title ? <h2 style={styles.title}>{title}</h2> : null}
      <div style={styles.list}>
        {items.map((item, idx) => (
          <div key={`${item.label}-${idx}`} style={styles.item}>
            <div style={styles.labelRow}>
              {item.icon ? <span style={styles.iconWrap}>{item.icon}</span> : null}
              <p style={styles.label}>{item.label}</p>
            </div>
            <div style={styles.value}>{item.value}</div>
          </div>
        ))}
      </div>
      {footer ? <div style={styles.footer}>{footer}</div> : null}
    </aside>
  )
}

const styles: Record<string, CSSProperties> = {
  panel: {
    minWidth: 0,
    background: '#111118',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 14,
    padding: 20,
    height: 'fit-content',
  },
  title: {
    margin: '0 0 1rem',
    fontSize: '0.95rem',
    fontWeight: 700,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  item: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    margin: 0,
    color: 'var(--text-muted)',
    fontSize: '0.78rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
  },
  labelRow: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
  },
  iconWrap: {
    width: 16,
    height: 16,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-muted)',
  },
  value: {
    color: 'var(--text)',
    fontSize: '0.9rem',
    lineHeight: 1.5,
    minHeight: 20,
  },
  footer: {
    marginTop: 16,
    paddingTop: 16,
    borderTop: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
}
