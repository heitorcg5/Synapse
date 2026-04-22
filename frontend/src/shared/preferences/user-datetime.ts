export type UserFormatPrefs = {
  dateFormat?: string | null
  timeFormat?: string | null
  timeZone?: string | null
}

function localeTag(i18nLang: string): string {
  return i18nLang.startsWith('es') ? 'es-ES' : 'en-US'
}

/**
 * API timestamps: ISO strings (with or without `Z`/offset), epoch ms/s, or legacy Jackson arrays [seconds, nanos].
 * Naive `...T12:00:00` is treated as UTC to align with Java `Instant` in JSON.
 */
export function parseApiInstant(value: unknown): Date | null {
  if (value == null) return null
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null
    return new Date(value < 1e12 ? value * 1000 : value)
  }
  if (Array.isArray(value) && value.length >= 1) {
    const sec = Number(value[0])
    const nano = Number(value[1] ?? 0)
    if (!Number.isFinite(sec)) return null
    return new Date(sec * 1000 + nano / 1e6)
  }
  if (typeof value !== 'string') return null
  let s = value.trim()
  if (!s) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    s = `${s}T00:00:00Z`
  } else if (
    /^\d{4}-\d{2}-\d{2}T/.test(s) &&
    !/[zZ]$/.test(s) &&
    !/[+-]\d{2}:\d{2}$/.test(s) &&
    !/[+-]\d{4}$/.test(s)
  ) {
    s = `${s}Z`
  }
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

function safeTimeZoneForIntl(tz: string | null | undefined): string | undefined {
  const t = tz?.trim()
  if (!t) return undefined
  try {
    Intl.DateTimeFormat('en-US', { timeZone: t }).format(0)
    return t
  } catch {
    return undefined
  }
}

/** ISO-style calendar date yyyy-MM-dd (local or in `timeZone`). */
export function formatUserDate(iso: string, i18nLang: string, prefs: UserFormatPrefs): string {
  const d = parseApiInstant(iso)
  if (!d) return '—'
  const tz = safeTimeZoneForIntl(prefs.timeZone ?? undefined)
  const df = (prefs.dateFormat || 'iso').toLowerCase()

  try {
    if (df === 'iso') {
      return new Intl.DateTimeFormat('en-CA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: tz,
      }).format(d)
    }
    if (df === 'dmy') {
      return new Intl.DateTimeFormat(localeTag(i18nLang), {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: tz,
      }).format(d)
    }
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: tz,
    }).format(d)
  } catch {
    return '—'
  }
}

export function formatUserTime(iso: string, i18nLang: string, prefs: UserFormatPrefs): string {
  const d = parseApiInstant(iso)
  if (!d) return '—'
  const tz = safeTimeZoneForIntl(prefs.timeZone ?? undefined)
  const tf = (prefs.timeFormat || 'h24').toLowerCase()
  const hour12 = tf === 'h12'
  try {
    return new Intl.DateTimeFormat(localeTag(i18nLang), {
      hour: '2-digit',
      minute: '2-digit',
      hour12,
      timeZone: tz,
    }).format(d)
  } catch {
    return '—'
  }
}

/** Calendar date and clock time using the user’s locale and profile formats. */
export function formatUserDateTime(iso: string, i18nLang: string, prefs: UserFormatPrefs): string {
  if (!parseApiInstant(iso)) return '—'
  return `${formatUserDate(iso, i18nLang, prefs)} · ${formatUserTime(iso, i18nLang, prefs)}`
}
