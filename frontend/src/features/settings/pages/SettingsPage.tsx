import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/app/auth-context'
import { brainApi } from '@/features/brain/api/brain-api'
import { userApi } from '@/features/profile/api/user-api'
import { normalizeKnowledgeExportFormat, type KnowledgeExportFormat } from '@/shared/types/api'
import { getErrorMessage } from '@/shared/utils/api-client'

type SummaryDetail = 'short' | 'medium' | 'detailed'
type AiLangMode = 'input' | 'ui' | 'custom'
type ProcessingMode = 'immediate' | 'background' | 'manual'
type ChunkTier = '500' | '1000' | '2000'
type KnowledgeStyle = 'tags' | 'folders' | 'graph'
type DataRetentionPolicy = 'forever' | '30d' | '90d'

export function SettingsPage() {
  const { t } = useTranslation()
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const profileQueryKey = ['user-profile', token ?? ''] as const

  const { data: profile, isLoading, error } = useQuery({
    queryKey: profileQueryKey,
    queryFn: () => userApi.getMe().then((r) => r.data),
    enabled: !!token,
  })

  const [summaryDetail, setSummaryDetail] = useState<SummaryDetail>('medium')
  const [langMode, setLangMode] = useState<AiLangMode>('input')
  const [customLang, setCustomLang] = useState<'en' | 'es'>('en')

  const [processingMode, setProcessingMode] = useState<ProcessingMode>('immediate')
  const [pipeSummarize, setPipeSummarize] = useState(true)
  const [pipeClassify, setPipeClassify] = useState(true)
  const [pipeTags, setPipeTags] = useState(true)
  const [pipeDupes, setPipeDupes] = useState(false)
  const [pipeLinks, setPipeLinks] = useState(false)
  const [chunkTier, setChunkTier] = useState<ChunkTier>('1000')

  const [knowledgeStyle, setKnowledgeStyle] = useState<KnowledgeStyle>('tags')
  const [autoTagging, setAutoTagging] = useState(true)
  const [autoLink, setAutoLink] = useState(false)

  const [dataRetention, setDataRetention] = useState<DataRetentionPolicy>('forever')
  const [defaultExportFormat, setDefaultExportFormat] = useState<KnowledgeExportFormat>('markdown')
  const [notifyProcessing, setNotifyProcessing] = useState(true)
  const [notifyConnection, setNotifyConnection] = useState(false)
  const [notifyDuplicate, setNotifyDuplicate] = useState(false)

  const autoProcessAfterCapture = processingMode !== 'manual'

  useEffect(() => {
    if (!profile) return
    const s = profile.aiSummaryDetail?.toLowerCase()
    if (s === 'short' || s === 'detailed' || s === 'medium') {
      setSummaryDetail(s)
    } else {
      setSummaryDetail('medium')
    }
    const m = profile.aiResponseLanguageMode?.toLowerCase()
    if (m === 'ui' || m === 'custom' || m === 'input') {
      setLangMode(m)
    } else {
      setLangMode('input')
    }
    const c = profile.aiCustomResponseLanguage?.toLowerCase()
    setCustomLang(c === 'es' ? 'es' : 'en')

    const pm = profile.processingMode?.toLowerCase()
    if (pm === 'immediate' || pm === 'background' || pm === 'manual') {
      setProcessingMode(pm)
    } else if (profile.aiAutoProcessCapture === true) {
      setProcessingMode('immediate')
    } else {
      setProcessingMode('manual')
    }

    setPipeSummarize(profile.pipelineSummarize !== false)
    setPipeClassify(profile.pipelineClassify !== false)
    setPipeTags(profile.pipelineGenerateTags !== false)
    setPipeDupes(profile.pipelineDetectDuplicates === true)
    setPipeLinks(profile.pipelineSuggestConnections === true)

    const ch = profile.aiChunkSizeTokens
    if (ch === '500' || ch === '2000' || ch === '1000') {
      setChunkTier(ch)
    } else {
      setChunkTier('1000')
    }

    const ks = profile.knowledgeStyle?.toLowerCase()
    if (ks === 'folders' || ks === 'graph' || ks === 'tags') {
      setKnowledgeStyle(ks)
    } else {
      setKnowledgeStyle('tags')
    }
    setAutoTagging(profile.autoTaggingEnabled !== false)
    setAutoLink(profile.autoLinkEnabled === true)

    const dr = profile.dataRetentionPolicy?.toLowerCase()
    if (dr === '30d' || dr === '90d' || dr === 'forever') {
      setDataRetention(dr)
    } else {
      setDataRetention('forever')
    }

    setDefaultExportFormat(normalizeKnowledgeExportFormat(profile.knowledgeExportFormat))

    setNotifyProcessing(profile.notifyProcessingFinished !== false)
    setNotifyConnection(profile.notifyNewConnection === true)
    setNotifyDuplicate(profile.notifyDuplicateDetected === true)
  }, [profile])

  const [showSaved, setShowSaved] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  const saveMutation = useMutation({
    mutationFn: () =>
      userApi.updateMe({
        aiSummaryDetail: summaryDetail,
        aiResponseLanguageMode: langMode,
        aiCustomResponseLanguage: langMode === 'custom' ? customLang : '',
        processingMode,
        pipelineSummarize: pipeSummarize,
        pipelineClassify: pipeClassify,
        pipelineGenerateTags: pipeTags,
        pipelineDetectDuplicates: pipeDupes,
        pipelineSuggestConnections: pipeLinks,
        aiChunkSizeTokens: chunkTier,
        aiAutoProcessCapture: processingMode === 'immediate',
        knowledgeStyle,
        autoTaggingEnabled: autoTagging,
        autoLinkEnabled: autoLink,
        dataRetentionPolicy: dataRetention,
        knowledgeExportFormat: defaultExportFormat,
        notifyProcessingFinished: notifyProcessing,
        notifyNewConnection: notifyConnection,
        notifyDuplicateDetected: notifyDuplicate,
      }),
    onSuccess: (res) => {
      queryClient.setQueryData(profileQueryKey, res.data)
      void queryClient.invalidateQueries({ queryKey: ['notifications-unread'] })
      void queryClient.invalidateQueries({ queryKey: ['notifications-list'] })
      setShowSaved(true)
      window.setTimeout(() => setShowSaved(false), 4000)
    },
  })

  const createFolderMutation = useMutation({
    mutationFn: () => brainApi.knowledgeFolderCreate({ name: newFolderName.trim() }),
    onSuccess: () => {
      setNewFolderName('')
      void queryClient.invalidateQueries({ queryKey: ['knowledge-folders'] })
    },
  })

  const onAutoProcessChange = (enabled: boolean) => {
    if (enabled) {
      setProcessingMode((prev) => (prev === 'manual' ? 'immediate' : prev))
    } else {
      setProcessingMode('manual')
    }
  }

  if (isLoading) {
    return <p style={{ color: 'var(--text-muted)' }}>{t('loading')}</p>
  }
  if (error || !profile) {
    return <p style={{ color: 'var(--error)' }}>{t('profileLoadError')}</p>
  }

  return (
    <div>
      <h1 style={styles.title}>{t('settingsPage.title')}</h1>
      <p style={styles.subtitle}>{t('settingsPage.intro')}</p>

      <section style={styles.card} aria-labelledby="settings-ai-block">
        <h2 id="settings-ai-block" style={styles.sectionTitle}>
          {t('settingsAi.blockAiTitle')}
        </h2>
        <p style={styles.hint}>{t('settingsAi.blockAiIntro')}</p>

        <h3 style={styles.subHeading}>{t('settingsAi.summaryLevelTitle')}</h3>
        <p style={styles.hint}>{t('settingsAi.summaryLevelHint')}</p>
        <p style={styles.meta}>{t('settingsAi.summaryLevelMeta')}</p>
        <label style={styles.label}>
          {t('settingsAi.summaryLength')}
          <select
            value={summaryDetail}
            onChange={(e) => setSummaryDetail(e.target.value as SummaryDetail)}
            style={styles.select}
          >
            <option value="short">{t('settingsAi.summaryShort')}</option>
            <option value="medium">{t('settingsAi.summaryMedium')}</option>
            <option value="detailed">{t('settingsAi.summaryDetailed')}</option>
          </select>
        </label>

        <div style={styles.subsectionDivider} />

        <h3 style={styles.subHeading}>{t('settingsAi.responseLangTitle')}</h3>
        <p style={styles.hint}>{t('settingsAi.responseLangHint')}</p>
        <label style={styles.label}>
          {t('settingsAi.responseLangLabel')}
          <select
            value={langMode}
            onChange={(e) => setLangMode(e.target.value as AiLangMode)}
            style={styles.select}
          >
            <option value="input">{t('settingsAi.langSameAsInput')}</option>
            <option value="ui">{t('settingsAi.langSameAsUi')}</option>
            <option value="custom">{t('settingsAi.langCustom')}</option>
          </select>
        </label>
        {langMode === 'custom' && (
          <label style={{ ...styles.label, marginTop: '0.75rem' }}>
            {t('settingsAi.customLangLabel')}
            <select
              value={customLang}
              onChange={(e) => setCustomLang(e.target.value as 'en' | 'es')}
              style={styles.select}
            >
              <option value="en">{t('preferences.langEnglish')}</option>
              <option value="es">{t('preferences.langSpanish')}</option>
            </select>
          </label>
        )}

        <div style={styles.subsectionDivider} />

        <h3 style={styles.subHeading}>{t('settingsAi.autoProcessTitle')}</h3>
        <p style={styles.hint}>{t('settingsAi.autoProcessHint')}</p>
        <p style={styles.captureConcept}>{t('settingsAi.captureConcept')}</p>
        <label style={styles.checkRow}>
          <input
            type="checkbox"
            checked={autoProcessAfterCapture}
            onChange={(e) => onAutoProcessChange(e.target.checked)}
          />
          <span>{t('settingsAi.autoProcessEnabled')}</span>
        </label>
      </section>

      <section style={styles.card} aria-labelledby="settings-flow-block">
        <h2 id="settings-flow-block" style={styles.sectionTitle}>
          {t('settingsAi.blockFlowTitle')}
        </h2>
        <p style={styles.hint}>{t('settingsAi.blockFlowIntro')}</p>

        <h3 style={styles.subHeading}>{t('settingsAi.pipelineStepsTitle')}</h3>
        <p style={styles.smallHint}>{t('settingsAi.pipelineStepsHint')}</p>
        <label style={styles.checkRow}>
          <input type="checkbox" checked={pipeSummarize} onChange={(e) => setPipeSummarize(e.target.checked)} />
          <span>{t('settingsAi.stepSummarize')}</span>
        </label>
        <label style={styles.checkRow}>
          <input type="checkbox" checked={pipeClassify} onChange={(e) => setPipeClassify(e.target.checked)} />
          <span>{t('settingsAi.stepClassify')}</span>
        </label>
        <label style={styles.checkRow}>
          <input type="checkbox" checked={pipeTags} onChange={(e) => setPipeTags(e.target.checked)} />
          <span>{t('settingsAi.stepTags')}</span>
        </label>
        <label style={styles.checkRow}>
          <input type="checkbox" checked={pipeDupes} onChange={(e) => setPipeDupes(e.target.checked)} />
          <span>{t('settingsAi.stepDuplicates')}</span>
        </label>
        <label style={styles.checkRow}>
          <input type="checkbox" checked={pipeLinks} onChange={(e) => setPipeLinks(e.target.checked)} />
          <span>{t('settingsAi.stepConnections')}</span>
        </label>

        <div style={styles.subsectionDivider} />

        <h3 style={styles.subHeading}>{t('settingsAi.processingModeTitle')}</h3>
        <p style={styles.hint}>{t('settingsAi.processingModeHint')}</p>
        <label style={styles.radioRow}>
          <input
            type="radio"
            name="procMode"
            checked={processingMode === 'immediate'}
            onChange={() => {
              setProcessingMode('immediate')
            }}
          />
          <span>{t('settingsAi.modeImmediate')}</span>
        </label>
        <label style={styles.radioRow}>
          <input
            type="radio"
            name="procMode"
            checked={processingMode === 'background'}
            onChange={() => {
              setProcessingMode('background')
            }}
          />
          <span>{t('settingsAi.modeBackground')}</span>
        </label>
        <label style={styles.radioRow}>
          <input
            type="radio"
            name="procMode"
            checked={processingMode === 'manual'}
            onChange={() => setProcessingMode('manual')}
          />
          <span>{t('settingsAi.modeManual')}</span>
        </label>
        <p style={styles.smallHint}>{t('settingsAi.modeManualHint')}</p>

        <div style={styles.subsectionDivider} />

        <h3 style={styles.subHeading}>{t('settingsAi.chunkTitle')}</h3>
        <p style={styles.hint}>{t('settingsAi.chunkHint')}</p>
        <label style={styles.label}>
          {t('settingsAi.chunkLabel')}
          <select
            value={chunkTier}
            onChange={(e) => setChunkTier(e.target.value as ChunkTier)}
            style={styles.select}
          >
            <option value="500">{t('settingsAi.chunk500')}</option>
            <option value="1000">{t('settingsAi.chunk1000')}</option>
            <option value="2000">{t('settingsAi.chunk2000')}</option>
          </select>
        </label>
      </section>

      <section style={styles.card} aria-labelledby="settings-knowledge-block">
        <h2 id="settings-knowledge-block" style={styles.sectionTitle}>
          {t('settingsPage.knowledgeBlockTitle')}
        </h2>
        <p style={styles.hint}>{t('settingsKnowledge.intro')}</p>

        <h3 style={styles.subHeading}>{t('settingsKnowledge.organizationTitle')}</h3>
        <p style={styles.hint}>{t('settingsKnowledge.organizationHint')}</p>
        <p style={styles.hint}>{t('settingsKnowledge.organizationUiOnly')}</p>
        <label style={styles.label}>
          {t('settingsKnowledge.styleLabel')}
          <select
            value={knowledgeStyle}
            onChange={(e) => setKnowledgeStyle(e.target.value as KnowledgeStyle)}
            style={styles.select}
          >
            <option value="tags">{t('settingsKnowledge.styleTags')}</option>
            <option value="folders">{t('settingsKnowledge.styleFolders')}</option>
            <option value="graph">{t('settingsKnowledge.styleGraph')}</option>
          </select>
        </label>

        <div style={styles.subsectionDivider} />

        <h3 style={styles.subHeading}>{t('settingsKnowledge.foldersDataTitle')}</h3>
        <p style={styles.hint}>{t('settingsKnowledge.foldersDataHint')}</p>
        <div style={styles.folderCreateRow}>
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder={t('settingsKnowledge.newFolderPlaceholder')}
            style={styles.textInput}
          />
          <button
            type="button"
            style={styles.secondaryBtn}
            disabled={!newFolderName.trim() || createFolderMutation.isPending}
            onClick={() => createFolderMutation.mutate()}
          >
            {t('settingsKnowledge.createFolder')}
          </button>
        </div>
        {createFolderMutation.isError && (
          <p style={{ color: 'var(--error)', fontSize: '0.85rem' }} role="alert">
            {getErrorMessage(createFolderMutation.error)}
          </p>
        )}

        <div style={styles.subsectionDivider} />

        <h3 style={styles.subHeading}>{t('settingsKnowledge.automationTitle')}</h3>
        <h4 style={styles.subSubHeading}>{t('settingsKnowledge.autoTaggingTitle')}</h4>
        <p style={styles.hint}>{t('settingsKnowledge.autoTaggingHint')}</p>
        <label style={styles.checkRow}>
          <input type="checkbox" checked={autoTagging} onChange={(e) => setAutoTagging(e.target.checked)} />
          <span>{t('settingsKnowledge.autoTaggingEnabled')}</span>
        </label>

        <h4 style={{ ...styles.subSubHeading, marginTop: '1rem' }}>{t('settingsKnowledge.autoLinkTitle')}</h4>
        <p style={styles.hint}>{t('settingsKnowledge.autoLinkHint')}</p>
        <label style={styles.checkRow}>
          <input type="checkbox" checked={autoLink} onChange={(e) => setAutoLink(e.target.checked)} />
          <span>{t('settingsKnowledge.autoLinkEnabled')}</span>
        </label>
      </section>

      <section style={styles.card} aria-labelledby="settings-notifications-block">
        <h2 id="settings-notifications-block" style={styles.sectionTitle}>
          {t('settingsNotifications.title')}
        </h2>
        <p style={styles.hint}>{t('settingsNotifications.intro')}</p>
        <label style={styles.checkRow}>
          <input
            type="checkbox"
            checked={notifyProcessing}
            onChange={(e) => setNotifyProcessing(e.target.checked)}
          />
          <span>{t('settingsNotifications.processingFinished')}</span>
        </label>
        <label style={styles.checkRow}>
          <input
            type="checkbox"
            checked={notifyConnection}
            onChange={(e) => setNotifyConnection(e.target.checked)}
          />
          <span>{t('settingsNotifications.newConnection')}</span>
        </label>
        <label style={styles.checkRow}>
          <input
            type="checkbox"
            checked={notifyDuplicate}
            onChange={(e) => setNotifyDuplicate(e.target.checked)}
          />
          <span>{t('settingsNotifications.duplicateDetected')}</span>
        </label>
      </section>

      <section style={styles.card} aria-labelledby="settings-privacy-block">
        <h2 id="settings-privacy-block" style={styles.sectionTitle}>
          {t('settingsPrivacy.blockTitle')}
        </h2>
        <p style={styles.hint}>{t('settingsPrivacy.blockIntro')}</p>

        <h3 style={styles.subHeading}>{t('settingsPrivacy.retentionTitle')}</h3>
        <p style={styles.hint}>{t('settingsPrivacy.retentionHint')}</p>
        <label style={styles.label}>
          {t('settingsPrivacy.retentionLabel')}
          <select
            value={dataRetention}
            onChange={(e) => setDataRetention(e.target.value as DataRetentionPolicy)}
            style={styles.select}
          >
            <option value="forever">{t('settingsPrivacy.retentionForever')}</option>
            <option value="30d">{t('settingsPrivacy.retention30')}</option>
            <option value="90d">{t('settingsPrivacy.retention90')}</option>
          </select>
        </label>

        <div style={styles.subsectionDivider} />

        <h3 style={styles.subHeading}>{t('settingsPrivacy.defaultExportTitle')}</h3>
        <p style={styles.hint}>{t('settingsPrivacy.defaultExportHint')}</p>
        <label style={styles.label}>
          {t('settingsPrivacy.defaultExportSelectLabel')}
          <select
            value={defaultExportFormat}
            onChange={(e) => setDefaultExportFormat(e.target.value as KnowledgeExportFormat)}
            style={styles.select}
          >
            <option value="markdown">{t('knowledge.exportFormatMarkdown')}</option>
            <option value="json">{t('knowledge.exportFormatJson')}</option>
            <option value="pdf">{t('knowledge.exportFormatPdf')}</option>
          </select>
        </label>
      </section>

      {saveMutation.isError && (
        <div style={styles.error} role="alert">
          {getErrorMessage(saveMutation.error)}
        </div>
      )}
      {showSaved && (
        <div style={styles.success} role="status">
          {t('settingsPage.saved')}
        </div>
      )}

      <button
        type="button"
        style={styles.button}
        disabled={saveMutation.isPending}
        onClick={() => saveMutation.mutate()}
      >
        {saveMutation.isPending ? t('settingsPage.saving') : t('settingsPage.save')}
      </button>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  title: {
    fontSize: '1.5rem',
    fontWeight: 600,
    marginBottom: '0.5rem',
  },
  subtitle: {
    color: 'var(--text-muted)',
    marginBottom: '1.5rem',
    maxWidth: 720,
    lineHeight: 1.5,
  },
  card: {
    marginBottom: '1.25rem',
    padding: '1.25rem',
    borderRadius: 12,
    border: '1px solid var(--border)',
    backgroundColor: 'var(--surface)',
  },
  sectionTitle: {
    fontSize: '1.05rem',
    fontWeight: 600,
    marginBottom: '0.35rem',
    marginTop: 0,
  },
  subHeading: {
    fontSize: '0.9rem',
    fontWeight: 600,
    marginBottom: '0.35rem',
    marginTop: '0.25rem',
    color: 'var(--text)',
  },
  subSubHeading: {
    fontSize: '0.85rem',
    fontWeight: 600,
    marginBottom: '0.25rem',
    marginTop: 0,
    color: 'var(--text)',
  },
  subsectionDivider: {
    borderTop: '1px solid var(--border)',
    marginTop: '1.25rem',
    marginBottom: '1rem',
    paddingTop: 0,
  },
  captureConcept: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
    letterSpacing: '0.02em',
    marginBottom: '0.65rem',
    marginTop: 0,
  },
  hint: {
    fontSize: '0.875rem',
    color: 'var(--text-muted)',
    marginBottom: '0.75rem',
    lineHeight: 1.45,
    marginTop: 0,
  },
  smallHint: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    marginBottom: '0.75rem',
    lineHeight: 1.4,
    marginTop: 0,
  },
  meta: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
    marginBottom: '1rem',
    marginTop: 0,
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
    fontSize: '0.875rem',
    color: 'var(--text-muted)',
  },
  select: {
    padding: '0.75rem',
    borderRadius: 8,
    border: '1px solid var(--border)',
    backgroundColor: 'var(--bg)',
    color: 'var(--text)',
    maxWidth: 360,
  },
  checkRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.65rem',
    fontSize: '0.875rem',
    color: 'var(--text)',
    cursor: 'pointer',
    marginBottom: '0.5rem',
  },
  radioRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.65rem',
    fontSize: '0.875rem',
    color: 'var(--text)',
    cursor: 'pointer',
    marginBottom: '0.45rem',
  },
  folderCreateRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
    alignItems: 'center',
    marginBottom: '0.5rem',
  },
  textInput: {
    flex: '1 1 12rem',
    minWidth: '10rem',
    padding: '0.5rem 0.65rem',
    borderRadius: 8,
    border: '1px solid var(--border)',
    backgroundColor: 'var(--bg)',
    color: 'var(--text)',
  },
  secondaryBtn: {
    padding: '0.5rem 0.85rem',
    borderRadius: 8,
    border: '1px solid var(--border)',
    backgroundColor: 'var(--surface)',
    color: 'var(--text)',
    fontWeight: 600,
    cursor: 'pointer',
  },
  error: {
    padding: '0.75rem',
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    color: 'var(--error)',
    marginBottom: '1rem',
    fontSize: '0.875rem',
  },
  success: {
    padding: '0.75rem',
    borderRadius: 8,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    color: 'var(--text)',
    marginBottom: '1rem',
    fontSize: '0.875rem',
  },
  button: {
    padding: '0.65rem 1.25rem',
    borderRadius: 8,
    border: 'none',
    backgroundColor: 'var(--accent)',
    color: 'white',
    fontWeight: 600,
    cursor: 'pointer',
  },
}
