const COMBINING_DIACRITICS = /[̀-ͯ]/g

/** Strips accents and lowercases, so "Équateur" and "Equateur" compare equal. */
export function normalizeForMatch(s: string): string {
  return s.normalize('NFD').replace(COMBINING_DIACRITICS, '').toLowerCase().trim()
}

export function matches(haystack: string, query: string): boolean {
  if (!query) return true
  return normalizeForMatch(haystack).includes(normalizeForMatch(query))
}

/** Accent-insensitive equality, for joining province names across the two data files
 *  (e.g. territories JSON has "Equateur", provinces JSON has "Équateur"). */
export function sameName(a: string, b: string): boolean {
  return normalizeForMatch(a) === normalizeForMatch(b)
}
