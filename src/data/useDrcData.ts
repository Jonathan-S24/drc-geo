import { useEffect, useState } from 'react'
import type { AnthemsData, HealthZone, HistoricalEraProps, Park, Province, ProvincesFile, TerritoriesFile, TerritoryUnit } from '../types'
import type { FeatureCollection, Geometry, Polygon } from 'geojson'
import { normalizeForMatch } from '../utils/match'
import type { PlaceMedia, PlaceMediaFile, UnitFeatureProperties } from '../types'

export interface HistoricalEra {
  key: string
  label: string
  fc: FeatureCollection<Geometry, HistoricalEraProps>
}

export interface DrcData {
  provinces: Province[]
  units: TerritoryUnit[]
  boundaries: FeatureCollection<Polygon, UnitFeatureProperties>
  provincesMeta: ProvincesFile['meta']
  territoriesMeta: TerritoriesFile['meta']
  byPcode: Map<string, TerritoryUnit>
  byProvinceName: Map<string, Province>
  /** Look up per-place imagery/facts by unit P-code or "province:<Name>". Empty until curated. */
  media: Map<string, PlaceMedia>
  /** DRC coat-of-arms URL (from the national-symbol entries) used as the universal
   *  image-load fallback so a header is never empty. Null if none in the data. */
  nationalSymbolImage: string | null
  /** Health zones grouped by unit P-code. Joined on normalised territory NAME —
   *  that maps all 519 zones onto 164 territories (the pcode field in the source
   *  only resolves a fraction). */
  healthZonesByTerritory: Map<string, HealthZone[]>
  /** Historical administrative eras, chronological (Phase 3 layer). Empty if unavailable. */
  historicalEras: HistoricalEra[]
  historicalNote: string
  /** National anthems + naming eras for the Histoire timeline. Null if unavailable. */
  anthems: AnthemsData | null
  /** National parks / protected areas overlay (Phase 3). Null if the OSM fetch was skipped. */
  parks: FeatureCollection<Geometry, { name: string; name_en?: string }> | null
  /** Rich protected-area data for Sanctuaires mode (parks.json). Empty if unavailable. */
  sanctuaries: Park[]
}

type State =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; data: DrcData }

let cache: DrcData | null = null
let inflight: Promise<DrcData> | null = null
/** Resolves with the layer payload once the second, non-blocking wave lands. */
let layersInflight: Promise<Awaited<ReturnType<typeof loadLayers>>> | null = null

async function loadAll(): Promise<DrcData> {
  const [provincesRes, territoriesRes, boundariesRes, mediaRes] = await Promise.all([
    fetch('/data/drc_geo_provinces_v1.json'),
    fetch('/data/drc_geo_territories_v2.json'),
    fetch('/data/drc_geo_boundaries_adm2.geojson'),
    fetch('/data/place_media.json'),
  ])
  if (!provincesRes.ok || !territoriesRes.ok || !boundariesRes.ok) {
    throw new Error('Failed to load one or more data files')
  }
  const provincesFile: ProvincesFile = await provincesRes.json()
  const territoriesFile: TerritoriesFile = await territoriesRes.json()
  const boundaries: FeatureCollection<Polygon, UnitFeatureProperties> = await boundariesRes.json()

  const byPcode = new Map(territoriesFile.units.map((u) => [u.pcode, u]))
  const byProvinceName = new Map(provincesFile.provinces.map((p) => [p.name, p]))

  // Media is optional and non-fatal: if it fails to load or parse, the app still works.
  const media = new Map<string, PlaceMedia>()
  if (mediaRes.ok) {
    try {
      const mediaFile: PlaceMediaFile = await mediaRes.json()
      for (const [key, value] of Object.entries(mediaFile)) {
        if (key.startsWith('_')) continue // schema/doc keys
        const entry = value as PlaceMedia
        if (entry && (entry.image || entry.facts)) media.set(key, entry)
      }
    } catch {
      // ignore malformed media file
    }
  }

  // Coat of arms preferred (over the flag) as the universal image fallback.
  let nationalSymbolImage: string | null = null
  for (const entry of media.values()) {
    if (entry.image_scope !== 'national-symbol' || !entry.image) continue
    if (/coat_of_arms/i.test(entry.image)) {
      nationalSymbolImage = entry.image
      break
    }
    nationalSymbolImage = nationalSymbolImage ?? entry.image
  }

  // Layer data (Phase 3) — all optional and non-fatal, and none of it is needed
  // to draw the country. parks.geojson alone is 1.6 MB of JSON; awaiting it here
  // pushed largest-contentful-paint past 4s on a throttled phone. Kick it off
  // now, hand back the map immediately, and fold the layers in when they land.
  layersInflight = loadLayers(territoriesFile.units)

  return {
    provinces: provincesFile.provinces,
    units: territoriesFile.units,
    boundaries,
    provincesMeta: provincesFile.meta,
    territoriesMeta: territoriesFile.meta,
    byPcode,
    byProvinceName,
    media,
    nationalSymbolImage,
    healthZonesByTerritory: new Map(),
    historicalEras: [],
    historicalNote: '',
    anthems: null,
    parks: null,
    sanctuaries: [],
  }
}

async function loadLayers(units: TerritoryUnit[]) {
  const healthZonesByTerritory = new Map<string, HealthZone[]>()
  let historicalEras: HistoricalEra[] = []
  let historicalNote = ''
  let anthems: AnthemsData | null = null
  let parks: DrcData['parks'] = null
  let sanctuaries: Park[] = []

  const safeJson = async (url: string) => {
    try {
      const r = await fetch(url)
      return r.ok ? await r.json() : null
    } catch {
      return null
    }
  }

  const [health, historical, anthemsData, parksData, sanctuariesData] = await Promise.all([
    safeJson('/data/health_zones.json'),
    safeJson('/data/historical_provinces.json'),
    safeJson('/data/anthems.json'),
    safeJson('/data/parks.geojson'),
    safeJson('/data/parks.json'),
  ])

  if (health?.zones) {
    // Join on normalised territory name: the source's pcode_territory only
    // resolves a fraction, while names map all 519 zones onto 164 territories.
    // Letters only — the source writes "Katako Kombe" where the unit is
    // "Katako-Kombe", so punctuation and spacing must not break the join.
    const key = (s: string) => normalizeForMatch(s).replace(/[^a-z0-9]/g, '')
    const pcodesByName = new Map<string, string[]>()
    for (const u of units) {
      const k = key(u.name)
      const arr = pcodesByName.get(k) ?? []
      arr.push(u.pcode)
      pcodesByName.set(k, arr)
    }
    for (const z of health.zones as HealthZone[]) {
      const pcodes = pcodesByName.get(key(z.territory))
      if (!pcodes) continue
      for (const pcode of pcodes) {
        const arr = healthZonesByTerritory.get(pcode) ?? []
        arr.push(z)
        healthZonesByTerritory.set(pcode, arr)
      }
    }
  }

  if (historical?.eras) {
    historicalNote = historical.meta?.note_fr ?? ''
    historicalEras = Object.entries(historical.eras).map(([label, fc]) => ({
      key: label.split(/[ —]/)[0], // "1919 — 4 provinces" → "1919"
      label,
      fc: fc as HistoricalEra['fc'],
    }))
  }

  if (anthemsData?.anthems && anthemsData?.naming_eras) {
    anthems = { anthems: anthemsData.anthems, namingEras: anthemsData.naming_eras }
  }

  if (parksData?.features) parks = parksData
  if (sanctuariesData?.parks) sanctuaries = sanctuariesData.parks as Park[]

  return { healthZonesByTerritory, historicalEras, historicalNote, anthems, parks, sanctuaries }
}

/**
 * Fetches and memoizes the source-of-truth data files (once per session). The
 * map renders on the core files; the optional layer data arrives in a second
 * wave and triggers one more render.
 */
export function useDrcData(): State {
  const [state, setState] = useState<State>(cache ? { status: 'ready', data: cache } : { status: 'loading' })

  useEffect(() => {
    let alive = true
    const absorbLayers = (base: DrcData) => {
      if (!layersInflight) return
      void layersInflight.then((layers) => {
        cache = { ...base, ...layers }
        if (alive) setState({ status: 'ready', data: cache })
      })
    }

    if (cache) {
      absorbLayers(cache)
      return () => {
        alive = false
      }
    }
    if (!inflight) inflight = loadAll()
    inflight
      .then((data) => {
        cache = data
        if (alive) setState({ status: 'ready', data })
        absorbLayers(data)
      })
      .catch((err: unknown) => {
        if (alive) setState({ status: 'error', error: err instanceof Error ? err.message : String(err) })
      })
    return () => {
      alive = false
    }
  }, [])

  return state
}
