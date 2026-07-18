import { useEffect, useState } from 'react'
import type { Province, ProvincesFile, TerritoriesFile, TerritoryUnit } from '../types'
import type { FeatureCollection, Polygon } from 'geojson'
import type { PlaceMedia, PlaceMediaFile, UnitFeatureProperties } from '../types'

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

  return {
    provinces: provincesFile.provinces,
    units: territoriesFile.units,
    boundaries,
    provincesMeta: provincesFile.meta,
    territoriesMeta: territoriesFile.meta,
    byPcode,
    byProvinceName,
    media,
  }
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
