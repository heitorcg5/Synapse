import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { contentApi } from '../api/content-api'
import { getErrorMessage } from '@/shared/utils/api-client'
import type { CreateContentRequest } from '@/shared/types/api'
import { Input } from '@/shared/components/ui/Input'
import { Textarea } from '@/shared/components/ui/Textarea'
import { Button } from '@/shared/components/ui/Button'
import { SurfaceContainer } from '@/shared/components/ui/SurfaceContainer'

const TYPES: CreateContentRequest['type'][] = [
  'TEXT',
  'VIDEO',
  'WEB',
  'AUDIO',
  'DOCUMENT',
]
const CREATE_FOLDER_OPTION = '__create-new-folder__'

function inferContentTypeFromUrl(rawUrl: string): CreateContentRequest['type'] | null {
  const trimmed = rawUrl.trim()
  if (!trimmed) return null

  const maybeUrl = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  let url: URL
  try {
    url = new URL(maybeUrl)
  } catch {
    return null
  }

  const host = url.hostname.toLowerCase()
  const path = url.pathname.toLowerCase()

  const videoHosts = ['youtube.com', 'youtu.be', 'vimeo.com', 'twitch.tv', 'dailymotion.com', 'tiktok.com']
  if (videoHosts.some((h) => host.includes(h))) return 'VIDEO'

  const audioExt = ['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg', '.opus']
  if (audioExt.some((ext) => path.endsWith(ext))) return 'AUDIO'

  const videoExt = ['.mp4', '.mov', '.mkv', '.avi', '.webm', '.m4v']
  if (videoExt.some((ext) => path.endsWith(ext))) return 'VIDEO'

  const docExt = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.txt', '.md', '.rtf', '.odt', '.epub', '.csv']
  if (docExt.some((ext) => path.endsWith(ext))) return 'DOCUMENT'

  return 'WEB'
}

export function UploadContentPage() {
  const { t } = useTranslation()
  const [type, setType] = useState<CreateContentRequest['type']>('TEXT')
  const [sourceUrl, setSourceUrl] = useState('')
  const [typeOverridden, setTypeOverridden] = useState(false)
  const [rawContent, setRawContent] = useState('')
  const [folderId, setFolderId] = useState('')
  const [creatingFolderInline, setCreatingFolderInline] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [folderError, setFolderError] = useState('')
  const [error, setError] = useState('')
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const inferredType = useMemo(() => inferContentTypeFromUrl(sourceUrl), [sourceUrl])
  const foldersQuery = useQuery({
    queryKey: ['content-folders'],
    queryFn: () => contentApi.contentFolders().then((res) => res.data),
  })

  useEffect(() => {
    if (!sourceUrl.trim()) {
      setTypeOverridden(false)
      return
    }
    if (typeOverridden) return
    if (inferredType && inferredType !== type) {
      setType(inferredType)
    }
  }, [sourceUrl, inferredType, type, typeOverridden])

  const createMutation = useMutation({
    mutationFn: (data: CreateContentRequest) =>
      contentApi.create(data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-list'] })
      queryClient.invalidateQueries({ queryKey: ['inbox-list'] })
      navigate('/inbox')
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  const createFolderMutation = useMutation({
    mutationFn: (name: string) =>
      contentApi.contentFolderCreate({ name }).then((res) => res.data),
    onSuccess: (folder) => {
      queryClient.invalidateQueries({ queryKey: ['content-folders'] })
      setFolderId(folder.id)
      setCreatingFolderInline(false)
      setNewFolderName('')
      setFolderError('')
    },
    onError: (err) => setFolderError(getErrorMessage(err)),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    createMutation.mutate({
      type,
      ...(sourceUrl.trim() ? { sourceUrl: sourceUrl.trim() } : {}),
      ...(rawContent.trim() ? { rawContent: rawContent.trim() } : {}),
      ...(folderId ? { folderId } : {}),
    })
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-[640px] flex-col justify-center">
      <div className="space-y-8">
        <header className="space-y-6 text-center">
          <h1 className="text-[28px] font-semibold leading-[1.3] tracking-[-0.02em] text-app-text">
            {t('capture')}
          </h1>
          <p className="mx-auto max-w-[560px] text-[15px] leading-[1.5] text-[#9CA3AF]">{t('captureHint')}</p>
        </header>

        <SurfaceContainer className="mx-auto w-full">
          <form onSubmit={handleSubmit} className="flex flex-col gap-8">
            {error && (
              <div
                className="rounded-md bg-[rgba(239,68,68,0.15)] p-3 text-sm text-app-error"
                role="alert"
              >
                {error}
              </div>
            )}
            <label className="flex flex-col gap-1 text-[13px] font-medium text-app-muted">
              {t('type')}
              <select
                value={type}
                onChange={(e) => {
                  setType(e.target.value as CreateContentRequest['type'])
                  setTypeOverridden(true)
                }}
                className="rounded-[10px] border border-[rgba(255,255,255,0.06)] bg-[#101018] p-3 text-sm text-app-text outline-none transition-[border-color,box-shadow,background-color] duration-150 ease-in-out focus:border-[#7C5CFF] focus:shadow-[0_0_0_2px_rgba(124,92,255,0.18)]"
              >
                {TYPES.map((typeOpt) => (
                  <option key={typeOpt} value={typeOpt}>
                    {typeOpt}
                  </option>
                ))}
              </select>
            </label>
            <div className="space-y-2">
              <label className="flex flex-col gap-1 text-[13px] font-medium text-app-muted">
                {t('captureFolder')}
                <select
                  value={creatingFolderInline ? CREATE_FOLDER_OPTION : folderId}
                  onChange={(e) => {
                    const nextValue = e.target.value
                    if (nextValue === CREATE_FOLDER_OPTION) {
                      setCreatingFolderInline(true)
                      setFolderId('')
                      return
                    }
                    setCreatingFolderInline(false)
                    setFolderError('')
                    setFolderId(nextValue)
                  }}
                  className="rounded-[10px] border border-[rgba(255,255,255,0.06)] bg-[#101018] p-3 text-sm text-app-text outline-none transition-[border-color,box-shadow,background-color] duration-150 ease-in-out focus:border-[#7C5CFF] focus:shadow-[0_0_0_2px_rgba(124,92,255,0.18)]"
                >
                  <option value="">{t('captureFolderNone')}</option>
                  {(foldersQuery.data ?? []).map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                  <option value={CREATE_FOLDER_OPTION}>{t('captureFolderCreateOption')}</option>
                </select>
              </label>
              {foldersQuery.isError && (
                <p className="text-xs text-app-error">{getErrorMessage(foldersQuery.error)}</p>
              )}
              {creatingFolderInline && (
                <div className="space-y-2 rounded-[12px] border border-[rgba(255,255,255,0.06)] bg-[#0E0E15] p-3">
                  <label className="flex flex-col gap-1 text-[13px] font-medium text-app-muted">
                    {t('captureNewFolderLabel')}
                    <Input
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder={t('captureNewFolderPlaceholder')}
                    />
                  </label>
                  {folderError && <p className="text-xs text-app-error">{folderError}</p>}
                  <div className="flex items-center justify-end">
                    <Button
                      type="button"
                      size="sm"
                      disabled={!newFolderName.trim() || createFolderMutation.isPending}
                      onClick={() => {
                        setFolderError('')
                        createFolderMutation.mutate(newFolderName.trim())
                      }}
                    >
                      {createFolderMutation.isPending ? t('creating') : t('captureCreateFolder')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <label className="flex flex-col gap-1 text-[13px] font-medium text-app-muted">
              {t('sourceUrl')}
              <Input
                type="url"
                value={sourceUrl}
                onChange={(e) => {
                  const next = e.target.value
                  setSourceUrl(next)
                  if (!next.trim()) {
                    setType('TEXT')
                    setTypeOverridden(false)
                  }
                }}
                placeholder={t('sourceUrlPlaceholder')}
              />
            </label>
            <label className="flex flex-col gap-1 text-[13px] font-medium text-app-muted">
              {t('rawContentOptional')}
              <Textarea
                value={rawContent}
                onChange={(e) => setRawContent(e.target.value)}
                placeholder={t('rawContentPlaceholder')}
                className="resize-y"
                rows={6}
              />
            </label>
            <Button
              type="submit"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? t('creating') : t('saveToInbox')}
            </Button>
          </form>
        </SurfaceContainer>
      </div>
    </div>
  )
}
