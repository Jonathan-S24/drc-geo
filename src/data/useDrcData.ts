import { useEffect, useState } from 'react'
import type { Province, ProvincesFile, TerritoriesFile, TerritoryUnit } from '../types'
import type { FeatureCollection, Polygon } from 'geojson'
import type { UnitFeatureProperties } from '../types'

export interface DrcData {
  provinces: Province[]
  units: TerritoryUnit[]
  boundaries: FeatureCollection<Polygon, UnitFeatureProperties>
  provincesMeta: ProvincesFile['meta']
  territoriesMeta: TerritoriesFile['meta']
  byPcode: Map<string, TerritoryUnit>
  byProvinceName: Map<string, Province>
}

type State =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  | { status: 'ready'; data: DrcData }

let cache: DrcData | null = null
let inflight: Promise<DrcData> | null = null

async function loadAll(): Promise<DrcData> {
  const [provincesRes, territoriesRes, boundariesRes] = await Promise.all([
    fetch('/data/drc_geo_provinces_v1.json'),
    fetch('/data/drc_geo_territories_v1.json'),
    fetch('/data/drc_geo_boundaries_adm2.geojson'),
  ])
  if (!provincesRes.ok || !territoriesRes.ok || !boundariesRes.ok) {
    throw new Error('Failed to load one or more data files')
  }
  const provincesFile: ProvincesFile = await provincesRes.json()
  const territoriesFile: TerritoriesFile = await territoriesRes.json()
  const boundaries: FeatureCollection<Polygon, UnitFeatureProperties> = await boundariesRes.json()

  const byPcode = new Map(territoriesFile.units.map((u) => [u.pcode, u]))
  const byProvinceName = new Map(provincesFile.provinces.map((p) => [p.name, p]))

  return {
    provinces: provincesFile.provinces,
    units: territoriesFile.units,
    boundaries,
    provincesMeta: provincesFile.meta,
    territoriesMeta: territoriesFile.meta,
    byPcode,
    byProvinceName,
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
