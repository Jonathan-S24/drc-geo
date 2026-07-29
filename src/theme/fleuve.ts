import type { Province } from '../types'
import type { DrcData } from '../data/useDrcData'
import { sameName } from '../utils/match'

/** Fleuve province palette — earth + copper + leaf tones, neighbours differ. */
const FLEUVE_PALETTE = [
  '#2E6FA8', // flag-derived blue, muted for large map surfaces
  '#B4653C',
  '#3F7F6E',
  '#8A6E3C',
  '#4A6E8A',
  '#7A4A62',
  '#5C7A46',
  '#A8794B',
  '#3E6B72',
  '#6B5A82',
]

export const FLEUVE = {
  abyss: '#05100E',
  basin: '#081916',
  canopy: '#0F2A24',
  river: '#6FA8BC',
  copper: '#C87941',
  gold: '#E4B44C',
  leaf: '#47C98A',
  parch: '#F4EBDC',
  ink: '#0D1F1B',
}

/** Deterministic province→colour map, sorted by name so it's stable. */
export function buildFleuveColors(provinceNames: string[]): Map<string, string> {
  const sorted = [...new Set(provinceNames)].sort()
  const map = new Map<string, string>()
  sorted.forEach((name, i) => map.set(name, FLEUVE_PALETTE[i % FLEUVE_PALETTE.length]))
  return map
}

/** Total DRC area used for "% of the country" figures (km²). */
export const DRC_AREA_KM2 = 2345409

/** IUCN status → dossier pill class + colour bucket. */
export function speciesStatusKey(status: string): 'critique' | 'endanger' | 'vulnerable' | 'other' {
  const s = status.toLowerCase()
  if (s === 'critique') return 'critique'
  if (s === 'en danger') return 'endanger'
  if (s === 'vulnérable') return 'vulnerable'
  return 'other'
}

/** Provincial-context lookup bridging accent spellings. */
export function provinceFor(data: DrcData, provinceName: string): Province | undefined {
  return data.provinces.find((p) => sameName(p.name, provinceName))
}
