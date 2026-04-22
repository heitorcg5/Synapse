import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/app/auth-context'
import { userApi } from '../api/user-api'
import { getErrorMessage } from '@/shared/utils/api-client'

const MAX_BYTES = 2 * 1024 * 1024
const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif'

type ProfileQueryKey = readonly ['user-profile', string]

export function ProfileAvatarSection({
  hasAvatar,
  profileQueryKey,
}: {
  hasAvatar: boolean
  profileQueryKey: ProfileQueryKey
}) {
  const { t } = useTranslation()
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [sizeError, setSizeError] = useState(false)
  const [avatarImgFailed, setAvatarImgFailed] = useState(false)

  const pageBlobKey = ['user-avatar-blob', token ?? '', hasAvatar, 'page'] as const

  const { data: avatarObjectUrl, isFetching } = useQuery({
    queryKey: pageBlobKey,
    queryFn: async () => {
      const { data } = await userApi.getAvatarBlob()
      return URL.createObjectURL(data)
    },
    enabled: !!token && hasAvatar,
    staleTime: Infinity,
    gcTime: 0,
  })

  useEffect(() => {
    return () => {
      if (avatarObjectUrl) URL.revokeObjectURL(avatarObjectUrl)
    }
  }, [avatarObjectUrl])

  useEffect(() => {
    return () => {
      void queryClient.removeQueries({ queryKey: pageBlobKey })
    }
  }, [queryClient, token, hasAvatar])

  useEffect(() => {
    setAvatarImgFailed(false)
  }, [avatarObjectUrl])

  const invalidateAvatar = () => {
    void queryClient.invalidateQueries({
      queryKey: ['user-avatar-blob', token ?? ''],
    })
  }

  const uploadMutation = useMutation({
    mutationFn: (file: File) => userApi.uploadAvatar(file),
    onSuccess: (res) => {
      queryClient.setQueryData(profileQueryKey, res.data)
      invalidateAvatar()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => userApi.deleteAvatar(),
    onSuccess: (res) => {
      queryClient.setQueryData(profileQueryKey, res.data)
      invalidateAvatar()
    },
  })

  const onPickFile = () => fileInputRef.current?.click()

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    setSizeError(false)
    if (!file) return
    if (file.size > MAX_BYTES) {
      setSizeError(true)
      return
    }
    uploadMutation.mutate(file)
  }

  const busy = uploadMutation.isPending || deleteMutation.isPending
  const err =
    uploadMutation.error ?? deleteMutation.error
      ? getErrorMessage(uploadMutation.error ?? deleteMutation.error)
      : null

  return (
    <section style={styles.card}>
      <h2 style={styles.sectionTitle}>{t('profile.sectionPhoto')}</h2>
      <div style={styles.row}>
        <div style={styles.avatarWrap}>
          {hasAvatar && avatarObjectUrl && !avatarImgFailed ? (
            <img
              src={avatarObjectUrl}
              alt=""
              style={styles.avatarImg}
              onError={() => {
                setAvatarImgFailed(true)
                void queryClient.invalidateQueries({
                  queryKey: ['user-avatar-blob', token ?? ''],
                })
              }}
            />
          ) : (
            <div style={styles.avatarPlaceholder}>
              {hasAvatar && isFetching
                ? t('loading')
                : t('profile.photoPlaceholder')}
            </div>
          )}
        </div>
        <div style={styles.actions}>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            style={{ display: 'none' }}
            onChange={onFileChange}
          />
          <button
            type="button"
            style={styles.secondaryBtn}
            disabled={busy}
            onClick={onPickFile}
          >
            {uploadMutation.isPending
              ? t('profile.photoUploading')
              : t('profile.photoChoose')}
          </button>
          {hasAvatar && (
            <button
              type="button"
              style={styles.dangerBtn}
              disabled={busy}
              onClick={() => deleteMutation.mutate()}
            >
              {t('profile.photoRemove')}
            </button>
          )}
        </div>
      </div>
      <p style={styles.hint}>{t('profile.photoHint')}</p>
      {sizeError && (
        <div style={styles.error} role="alert">
          {t('profile.photoTooLarge')}
        </div>
      )}
      {err && (
        <div style={styles.error} role="alert">
          {err}
        </div>
      )}
    </section>
  )
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    marginBottom: '1.25rem',
    padding: '1.25rem',
    borderRadius: 12,
    border: '1px solid var(--border)',
    backgroundColor: 'var(--surface)',
  },
  sectionTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    marginBottom: '1rem',
    marginTop: 0,
  },
  row: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '1.25rem',
  },
  avatarWrap: {
    width: 96,
    height: 96,
    borderRadius: '50%',
    overflow: 'hidden',
    border: '1px solid var(--border)',
    flexShrink: 0,
    backgroundColor: 'var(--bg)',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    textAlign: 'center',
    padding: '0.5rem',
    boxSizing: 'border-box',
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
  },
  secondaryBtn: {
    padding: '0.5rem 0.9rem',
    borderRadius: 8,
    border: '1px solid var(--border)',
    backgroundColor: 'var(--bg)',
    color: 'var(--text)',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: '0.875rem',
  },
  dangerBtn: {
    padding: '0.5rem 0.9rem',
    borderRadius: 8,
    border: '1px solid rgba(239, 68, 68, 0.5)',
    backgroundColor: 'transparent',
    color: 'var(--error)',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: '0.875rem',
  },
  hint: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    marginTop: '0.75rem',
    marginBottom: 0,
    lineHeight: 1.4,
  },
  error: {
    marginTop: '0.75rem',
    padding: '0.65rem',
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: 'var(--error)',
    fontSize: '0.875rem',
  },
}
