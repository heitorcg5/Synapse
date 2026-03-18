import { useState, useEffect, useCallback } from 'react'
import i18n from '@/i18n/config'

const LANGUAGES = [
  { code: 'en' as const, label: 'EN', ariaLabel: 'English' },
  { code: 'es' as const, label: 'ES', ariaLabel: 'Español' },
] as const

type LangCode = (typeof LANGUAGES)[number]['code']

function getCurrentLang(): LangCode {
  const lng = i18n.language || 'en'
  return lng.startsWith('es') ? 'es' : 'en'
}

/**
 * Toggle de idioma (EN/ES). Usa i18n directamente para no depender del
 * contexto de React y funcionar en header y páginas de auth.
 * Accesible, con estados hover/focus y estilos del tema.
 */
export function LanguageToggle() {
  const [current, setCurrent] = useState<LangCode>(getCurrentLang)

  const handleChange = useCallback((code: LangCode) => {
    if (code !== current) {
      i18n.changeLanguage(code)
    }
  }, [current])

  useEffect(() => {
    const onLanguageChanged = () => setCurrent(getCurrentLang())
    i18n.on('languageChanged', onLanguageChanged)
    return () => i18n.off('languageChanged', onLanguageChanged)
  }, [])

  return (
    <div
      role="group"
      aria-label="Idioma / Language"
      style={styles.wrapper}
    >
      {LANGUAGES.map(({ code, label, ariaLabel }) => (
        <button
          key={code}
          type="button"
          onClick={() => handleChange(code)}
          aria-pressed={current === code}
          aria-label={ariaLabel}
          title={ariaLabel}
          style={{
            ...styles.option,
            ...(current === code ? styles.optionActive : {}),
          }}
          className="language-toggle__option"
        >
          {label}
        </button>
      ))}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'inline-flex',
    alignItems: 'stretch',
    flexShrink: 0,
    minWidth: 72,
    padding: 2,
    borderRadius: 8,
    border: '1px solid rgba(99, 102, 241, 0.35)',
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    boxSizing: 'border-box',
  },
  option: {
    flex: 1,
    minWidth: 34,
    padding: '6px 12px',
    border: 'none',
    borderRadius: 6,
    background: 'transparent',
    color: 'var(--text-muted)',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 0.15s ease, color 0.15s ease',
  },
  optionActive: {
    backgroundColor: 'var(--accent)',
    color: '#c7d2fe',
  },
}
