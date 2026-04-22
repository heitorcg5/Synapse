/**
 * IANA time zones for select options (grouped by first path segment).
 */
export function getGroupedTimeZones(): { region: string; zones: string[] }[] {
  const supported =
    typeof Intl !== 'undefined' && 'supportedValuesOf' in Intl
      ? (Intl as typeof Intl & { supportedValuesOf: (k: string) => string[] }).supportedValuesOf(
          'timeZone',
        )
      : [
          'UTC',
          'Europe/London',
          'Europe/Madrid',
          'Europe/Paris',
          'America/New_York',
          'America/Chicago',
          'America/Los_Angeles',
          'America/Sao_Paulo',
          'Asia/Tokyo',
          'Asia/Shanghai',
          'Australia/Sydney',
        ]

  const sorted = [...supported].sort((a, b) => a.localeCompare(b))
  const map = new Map<string, string[]>()
  for (const z of sorted) {
    const region = z.includes('/') ? z.slice(0, z.indexOf('/')) : 'General'
    if (!map.has(region)) map.set(region, [])
    map.get(region)!.push(z)
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([region, zones]) => ({ region, zones }))
}
