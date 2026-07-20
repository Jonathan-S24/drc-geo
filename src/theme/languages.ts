import type { Province } from '../types'
import { sameName } from '../utils/match'
import type { DrcData } from '../data/useDrcData'

/** The four national languages of the DRC, each with a distinct map color. */
export const LANGUAGE_COLORS: Record<string, string> = {
  Lingala: '#5b9bd1', // lake blue
  Swahili: '#e8836b', // coral
  Tshiluba: '#e3b04e', // amber
  Kikongo: '#67bfa0', // mint
}

const MAJORS = Object.keys(LANGUAGE_COLORS)

/** Dominant national language for a province: first of the four majors listed. */
export function dominantLanguage(p: Province): string {
  const tokens = p.national_languages.split(',').map((s) => s.trim())
  for (const t of tokens) {
    const hit = MAJORS.find((m) => t.toLowerCase().startsWith(m.toLowerCase()))
    if (hit) return hit
  }
  return tokens[0] ?? 'Lingala'
}

/** province name → dominant language, keyed by the territories-file spelling. */
export function buildLanguageMap(data: DrcData): Map<string, string> {
  const map = new Map<string, string>()
  for (const u of data.units) {
    const p = data.provinces.find((x) => sameName(x.name, u.province))
    if (p) map.set(u.province, dominantLanguage(p))
  }
  return map
}
