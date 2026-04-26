import type { CSSProperties } from 'react'
import type { GraphNode } from './types'

export function NodeTooltip({
  node,
  position,
}: {
  node: GraphNode | null
  position: { x: number; y: number }
}) {
  if (!node) return null
  return (
    <div
      style={{
        ...styles.card,
        left: position.x + 14,
        top: position.y + 14,
      }}
    >
      <p style={styles.title}>{node.title}</p>
      <p style={styles.meta}>{node.type}</p>
      <p style={styles.preview}>{node.summary || 'No summary yet.'}</p>
      <p style={styles.meta}>Tags: {node.tags.length ? node.tags.join(', ') : '—'}</p>
      <p style={styles.meta}>{new Date(node.createdAt).toLocaleString()}</p>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  card: {
    position: 'absolute',
    zIndex: 30,
    maxWidth: 260,
    pointerEvents: 'none',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(16, 18, 28, 0.78)',
    boxShadow: '0 20px 40px rgba(0,0,0,0.35)',
    backdropFilter: 'blur(8px)',
    padding: '10px 12px',
    color: '#e5e7eb',
    opacity: 1,
    transition: 'opacity 160ms ease',
  },
  title: {
    margin: 0,
    fontSize: 13,
    fontWeight: 600,
    lineHeight: 1.35,
    color: '#fff',
  },
  preview: {
    margin: '6px 0',
    fontSize: 12,
    color: '#cbd5e1',
    lineHeight: 1.4,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  meta: {
    margin: 0,
    fontSize: 11,
    color: '#94a3b8',
  },
}
