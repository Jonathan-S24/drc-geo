import type { DrcData } from '../data/useDrcData'
import type { TerritoryUnit } from '../types'

/** Deterministic string hash (FNV-1a) — same result for everyone, everywhere. */
function fnv1a(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** YYYY-MM-DD in the user's local calendar (daily rollover at local midnight). */
export function todayKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/**
 * "Territoire du jour": seeded by the date so everyone sees the same one each
 * day. Only true territoires (145) — villes have thin qualitative data.
 */
export function territoryOfTheDay(data: DrcData, date = new Date()): TerritoryUnit {
  const territoires = data.units
    .filter((u) => u.type === 'territoire')
    .sort((a, b) => a.pcode.localeCompare(b.pcode)) // stable order independent of file order
  const idx = fnv1a(`drcgeo:${todayKey(date)}`) % territoires.length
  return territoires[idx]
}

/** Seeded PRNG (mulberry32) for reproducible quiz shuffles. */
export function seededRandom(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
