export type NumberLocale = 'fr-FR' | 'en-US'

export function formatNumber(n: number | null | undefined, locale: NumberLocale = 'fr-FR'): string {
  if (n == null) return '—'
  return n.toLocaleString(locale)
}

export function formatArea(n: number | null | undefined, locale: NumberLocale = 'fr-FR'): string {
  if (n == null) return '—'
  return `${formatNumber(Math.round(n), locale)} km²`
}
