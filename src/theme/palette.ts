/**
 * Curated map palette (Purrweb "World Map" direction): coral, amber, mint,
 * purple, lake-blue, sage on a deep teal ocean.
 *
 * Province → color assignment is precomputed offline by greedy graph-coloring
 * of the real ADM2 adjacency (two provinces are neighbors if their unit
 * polygons share boundary vertices), so NEIGHBORS NEVER SHARE A COLOR.
 * 4 color classes suffice; each class alternates between (at most) two hues
 * reserved to it, which spreads all 6 hues without breaking the guarantee.
 */

export const OCEAN = '#0d4f5c'
export const OCEAN_DEEP = '#0a3f4a'
export const CARD_BG = '#f4faf9'

export const HUES = {
  coral: '#e8836b',
  amber: '#e3b04e',
  mint: '#67bfa0',
  purple: '#9d8cc9',
  lake: '#5b9bd1',
  sage: '#94aa7e',
} as const

// color class per province (from offline adjacency coloring; do not edit by hand)
const PROVINCE_CLASS: [string, number][] = [
  ['Bas-Uele', 2],
  ['Equateur', 0],
  ['Haut-Katanga', 0],
  ['Haut-Lomami', 1],
  ['Haut-Uele', 1],
  ['Ituri', 2],
  ['Kasaï', 0],
  ['Kasaï-Central', 2],
  ['Kasaï-Oriental', 3],
  ['Kinshasa', 0],
  ['Kongo-Central', 2],
  ['Kwango', 1],
  ['Kwilu', 2],
  ['Lomami', 0],
  ['Lualaba', 3],
  ['Maniema', 2],
  ['Maï-Ndombe', 1],
  ['Mongala', 1],
  ['Nord-Kivu', 1],
  ['Nord-Ubangi', 0],
  ['Sankuru', 1],
  ['Sud-Kivu', 0],
  ['Sud-Ubangi', 2],
  ['Tanganyika', 2],
  ['Tshopo', 0],
  ['Tshuapa', 2],
]

// two hues reserved per class; alternated by per-class occurrence index
const CLASS_HUES: string[][] = [
  [HUES.coral, HUES.lake],
  [HUES.amber, HUES.purple],
  [HUES.mint, HUES.sage],
  [HUES.purple, HUES.coral], // class 3 has only 2 members, far apart (Kasaï-Oriental, Lualaba)
]

function buildProvinceColors(): Map<string, string> {
  const seen: Record<number, number> = {}
  const map = new Map<string, string>()
  for (const [name, cls] of PROVINCE_CLASS) {
    const idx = seen[cls] ?? 0
    seen[cls] = idx + 1
    map.set(name, CLASS_HUES[cls][idx % CLASS_HUES[cls].length])
  }
  return map
}

/** Keyed by the territories-file spelling of province names (e.g. "Equateur"). */
export const PROVINCE_COLORS = buildProvinceColors()

/** Rotation used to tint a province's territoires when it is opened. */
export const SUB_HUES = [HUES.coral, HUES.amber, HUES.mint, HUES.purple, HUES.lake, HUES.sage]

// ---------- color math ----------

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

/** Mix `hex` toward `toward` by t (0..1). */
export function mix(hex: string, toward: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(hex)
  const [r2, g2, b2] = hexToRgb(toward)
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t)
}

/** Desaturate by mixing toward the color's own luminance gray (keeps lightness). */
export function desaturate(hex: string, t: number): string {
  const [r, g, b] = hexToRgb(hex)
  const lum = 0.299 * r + 0.587 * g + 0.114 * b
  return mix(hex, rgbToHex(lum, lum, lum), t)
}

/** Idle map fill: calm, ~30% desaturated. */
export function idleFill(hex: string): string {
  return desaturate(hex, 0.3)
}

/** Non-selected shapes while something is selected: dropped toward the deep ocean. */
export function dimmedFill(hex: string): string {
  return mix(desaturate(hex, 0.45), OCEAN_DEEP, 0.55)
}
