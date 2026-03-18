import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en/translation.json'
import es from './es/translation.json'

const STORAGE_KEY = 'synapse_lang'

function getDefaultLanguage(): string {
  if (typeof window === 'undefined') return 'en'
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'en' || stored === 'es') return stored
  const browser = navigator.language || (navigator as { userLanguage?: string }).userLanguage || ''
  if (browser.startsWith('es')) return 'es'
  return 'en'
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
  },
  lng: getDefaultLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
})

i18n.on('languageChanged', (lng) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, lng)
  }
})

export default i18n
