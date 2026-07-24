import { useEffect, useState } from 'react'
import type { HealthZone, HistoricalEraProps, Province, ProvincesFile, TerritoriesFile, TerritoryUnit } from '../types'
import type { FeatureCollection, Geometry, Polygon } from 'geojson'
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
  /** Health zones grouped by territory pcode (Phase 3 layer). Empty if unavailable. */
  healthZonesByTerritory: Map<string, HealthZone[]>
  /** Historical administrative eras, chronological (Phase 3 layer). Empty if unavailable. */
  historicalEras: HistoricalEra[]
  historicalNote: string
  /** National parks / protected areas overlay (Phase 3). Null if the OSM fetch was skipped. */
  parks: FeatureCollection<Geometry, { name: string; name_en?: string }> | null
}

type State =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; data: DrcData }

let cache: DrcData | null = null
let inflight: Promise<DrcData> | null = null

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

  // Layer data (Phase 3) — all optional and non-fatal.
  const { healthZonesByTerritory, historicalEras, historicalNote, parks } = await loadLayers()

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
    healthZonesByTerritory,
    historicalEras,
    historicalNote,
    parks,
  }
}

async function loadLayers() {
  const healthZonesByTerritory = new Map<string, HealthZone[]>()
  let historicalEras: HistoricalEra[] = []
  let historicalNote = ''
  let parks: DrcData['parks'] = null

  const safeJson = async (url: string) => {
    try {
      const r = await fetch(url)
      return r.ok ? await r.json() : null
    } catch {
      return null
    }
  }

  const [health, historical, parksData] = await Promise.all([
    safeJson('/data/health_zones.json'),
    safeJson('/data/historical_provinces.json'),
    safeJson('/data/parks.geojson'),
  ])

  if (health?.zones) {
    for (const z of health.zones as HealthZone[]) {
      const arr = healthZonesByTerritory.get(z.pcode_territory) ?? []
      arr.push(z)
      healthZonesByTerritory.set(z.pcode_territory, arr)
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

  if (parksData?.features) parks = parksData

  return { healthZonesByTerritory, historicalEras, historicalNote, parks }
}

/** Fetches and memoizes the three source-of-truth data files (fetched once per session). */
export function useDrcData(): State {
  const [state, setState] = useState<State>(cache ? { status: 'ready', data: cache } : { status: 'loading' })

  useEffect(() => {
    if (cache) return
    if (!inflight) inflight = loadAll()
    inflight
      .then((data) => {
        cache = data
        setState({ status: 'ready', data })
      })
      .catch((err: unknown) => {
        setState({ status: 'error', error: err instanceof Error ? err.message : String(err) })
      })
  }, [])

  return state
}
