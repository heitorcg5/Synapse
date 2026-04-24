import type { CSSProperties } from 'react'

export function ContentPreview({
  contentType,
  sourceUrl,
  title,
}: {
  contentType?: string | null
  sourceUrl?: string | null
  title?: string | null
}) {
  const normalizedType = (contentType ?? '').toUpperCase()
  if (!sourceUrl) return null

  if (normalizedType === 'VIDEO') {
    const embedUrl = toYouTubeEmbedUrl(sourceUrl)
    if (!embedUrl) return null
    return (
      <div style={styles.wrap}>
        <iframe
          src={embedUrl}
          title={title ?? 'Video preview'}
          style={styles.videoFrame}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    )
  }

  if (normalizedType === 'IMAGE' || isImageUrl(sourceUrl)) {
    return (
      <div style={styles.wrap}>
        <img src={sourceUrl} alt={title ?? 'Image preview'} style={styles.image} />
      </div>
    )
  }

  return null
}

function toYouTubeEmbedUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl)
    const host = url.hostname.toLowerCase().replace(/^www\./, '')
    let videoId = ''
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      videoId = url.searchParams.get('v') ?? ''
    } else if (host === 'youtu.be') {
      videoId = url.pathname.replace('/', '')
    }
    if (!videoId) return null
    return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}`
  } catch {
    return null
  }
}

function isImageUrl(url: string): boolean {
  const clean = url.split('?')[0].toLowerCase()
  return (
    clean.endsWith('.png') ||
    clean.endsWith('.jpg') ||
    clean.endsWith('.jpeg') ||
    clean.endsWith('.gif') ||
    clean.endsWith('.webp') ||
    clean.endsWith('.avif')
  )
}

const styles: Record<string, CSSProperties> = {
  wrap: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
    border: '1px solid rgba(255,255,255,0.08)',
    background: '#0b0b11',
  },
  image: {
    width: '100%',
    display: 'block',
    objectFit: 'cover',
    maxHeight: 360,
  },
  videoFrame: {
    width: '100%',
    aspectRatio: '16 / 9',
    border: 0,
    display: 'block',
  },
}
