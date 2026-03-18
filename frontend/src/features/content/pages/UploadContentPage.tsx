import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { contentApi } from '../api/content-api'
import { getErrorMessage } from '@/shared/utils/api-client'
import type { CreateContentRequest } from '@/shared/types/api'

const TYPES: CreateContentRequest['type'][] = [
  'TEXT',
  'VIDEO',
  'WEB',
  'AUDIO',
  'DOCUMENT',
]

export function UploadContentPage() {
  const { t } = useTranslation()
  const [type, setType] = useState<CreateContentRequest['type']>('TEXT')
  const [sourceUrl, setSourceUrl] = useState('')
  const [error, setError] = useState('')
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const createMutation = useMutation({
    mutationFn: (data: CreateContentRequest) =>
      contentApi.create(data).then((res) => res.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['content-list'] })
      navigate(`/content/${data.id}`)
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    createMutation.mutate({
      type,
      ...(sourceUrl.trim() ? { sourceUrl: sourceUrl.trim() } : {}),
    })
  }

  return (
    <div>
      <h1 style={styles.title}>{t('upload')}</h1>
      <form onSubmit={handleSubmit} style={styles.form}>
        {error && (
          <div style={styles.error} role="alert">
            {error}
          </div>
        )}
        <label style={styles.label}>
          {t('type')}
          <select
            value={type}
            onChange={(e) => setType(e.target.value as CreateContentRequest['type'])}
            style={styles.select}
          >
            {TYPES.map((typeOpt) => (
              <option key={typeOpt} value={typeOpt}>
                {typeOpt}
              </option>
            ))}
          </select>
        </label>
        <label style={styles.label}>
          {t('sourceUrl')}
          <input
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder={t('sourceUrlPlaceholder')}
            style={styles.input}
          />
        </label>
        <button
          type="submit"
          disabled={createMutation.isPending}
          style={styles.button}
        >
          {createMutation.isPending ? t('creating') : t('createContent')}
        </button>
      </form>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  title: {
    fontSize: '1.5rem',
    fontWeight: 600,
    marginBottom: '1.5rem',
  },
  form: {
    maxWidth: '400px',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  error: {
    padding: '0.75rem',
    borderRadius: '6px',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: 'var(--error)',
    fontSize: '0.875rem',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
    fontSize: '0.875rem',
    color: 'var(--text-muted)',
  },
  select: {
    padding: '0.75rem',
    borderRadius: '6px',
    border: '1px solid var(--border)',
    backgroundColor: 'var(--bg)',
    color: 'var(--text)',
  },
  input: {
    padding: '0.75rem',
    borderRadius: '6px',
    border: '1px solid var(--border)',
    backgroundColor: 'var(--bg)',
    color: 'var(--text)',
  },
  button: {
    padding: '0.75rem',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: 'var(--accent)',
    color: 'white',
    fontWeight: 600,
    marginTop: '0.5rem',
  },
}
