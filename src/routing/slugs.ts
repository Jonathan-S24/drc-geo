import type { DrcData } from '../data/useDrcData'
import type { Selection } from '../state/AppStateContext'
import { normalizeForMatch, sameName } from '../utils/match'

/** "Nord-Kivu" → "nord-kivu", "Kasaï-Oriental" → "kasai-oriental". */
export function slugify(name: string): string {
  return normalizeForMatch(name)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export interface SlugIndex {
  pathFor: (selection: Selection) => string
  selectionFromPath: (pathname: string) => Selection
}

/** Path-based routing: /province/<slug>, /territoire/<slug>, /ville/<slug>. */
export function buildSlugIndex(data: DrcData): SlugIndex {
  const unitBySlug = new Map<string, string>() // slug → pcode
  const slugByPcode = new Map<string, string>()
  for (const u of data.units) {
    const s = slugify(u.name)
    unitBySlug.set(s, u.pcode)
    slugByPcode.set(u.pcode, s)
  }
  const provinceBySlug = new Map<string, string>() // slug → canonical province name
  for (const p of data.provinces) provinceBySlug.set(slugify(p.name), p.name)

  const pathFor = (selection: Selection): string => {
    if (selection.view === 'unit') {
      const u = data.byPcode.get(selection.pcode)
      const slug = slugByPcode.get(selection.pcode)
      if (!u || !slug) return '/'
      return `/${u.type === 'ville' ? 'ville' : 'territoire'}/${slug}`
    }
    if (selection.view === 'province') return `/province/${slugify(selection.name)}`
    return '/'
  }

  const selectionFromPath = (pathname: string): Selection => {
    const parts = pathname.replace(/^\/+|\/+$/g, '').split('/')
    if (parts.length === 2) {
      const [kind, slug] = parts
      if (kind === 'province') {
        const name = provinceBySlug.get(slug)
        if (name) return { view: 'province', name }
      } else if (kind === 'territoire' || kind === 'ville') {
        const pcode = unitBySlug.get(slug)
        if (pcode) return { view: 'unit', pcode, zoom: true }
      }
    }
    return { view: 'none' }
  }

  return { pathFor, selectionFromPath }
}

/** Canonical province display name (bridges "Equateur"/"Équateur" spellings). */
export function canonicalProvinceName(data: DrcData, name: string): string {
  return data.provinces.find((p) => sameName(p.name, name))?.name ?? name
}
