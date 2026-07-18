export type NumberLocale = 'fr-FR' | 'en-US'

export function formatNumber(n: number | null | undefined, locale: NumberLocale = 'fr-FR'): string {
  if (n == null) return '—'
  return n.toLocaleString(locale)
}

export function formatArea(n: number | null | undefined, locale: NumberLocale = 'fr-FR'): string {
  if (n == null) return '—'
  return `${formatNumber(Math.round(n), locale)} km²`
}

/** "2026-07" → "juillet 2026" / "July 2026". Returns the input unchanged if not YYYY-MM. */
export function formatYearMonth(ym: string, locale: NumberLocale): string {
  const m = /^(\d{4})-(\d{2})$/.exec(ym)
  if (!m) return ym
  const date = new Date(Number(m[1]), Number(m[2]) - 1, 1)
  return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
}
