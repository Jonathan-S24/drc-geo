export interface Province {
  name: string
  iso_code: string
  capital: string
  former_province: string
  area_km2: number
  population_2024_est: number
  density_per_km2: number
  timezone: string
  national_languages: string
  local_languages: string
  natural_resources: string
  economy_specialties: string
  particularities: string
  education: string
}

export interface ProvincesFile {
  meta: {
    project: string
    version: string
    level: string
    count: number
    sources: Record<string, string>
    caveat: string
  }
  provinces: Province[]
}

export type UnitType = 'territoire' | 'ville'

export interface TerritoryUnit {
  province: string
  name: string
  pcode: string
  area_km2_codab: number | null
  area_km2_caid: number | null
  population_2024_ocha: number | null
  population_caid: number | null
  population_caid_source: string | null
  subdivisions: string | null
  languages: string[]
  main_activities: string[]
  agricultural_products: string[]
  health_note: string | null
  schools_primary: number | null
  schools_secondary: number | null
  development_opportunities: string | null
  security_note: string | null
  accessibility_tourism: string | null
  caid_updated: string | null
  has_caid_fiche: boolean
  type: UnitType
  // v2 fields (drc_geo_territories_v2.json), present on a subset of units:
  /** Current security situation for eastern units, compiled July 2026 (sources cited in text). */
  security_note_2026?: string
  /** "YYYY-MM" the 2026 security note refers to; may be absent (fall back to 2026-07). */
  security_note_2026_date?: string
  /** Economy profile for major villes, compiled 2026-07 (source named inside the text). */
  economy_note?: string
  /** For units filled without a CAID fiche (Kabambare): where the data came from. */
  provenance_note?: string
}

export interface TerritoriesFile {
  meta: {
    project: string
    version: string
    level: string
    territoires: number
    villes: number
    sources: Record<string, string>
    caveat: string
  }
  units: TerritoryUnit[]
}

export interface UnitFeatureProperties {
  p: string // pcode, joins to TerritoryUnit.pcode
}

export interface PlaceFact {
  icon?: string
  en: string
  fr: string
}

export interface PlaceMedia {
  image?: string
  image_credit?: string
  image_source_page?: string
  /** "unit" = photo of the place itself; "province" = provincial fallback photo. Absent ⇒ unit. */
  image_scope?: 'unit' | 'province'
  /** Caption shown over province-scope fallback photos, explaining the substitution. */
  image_note_fr?: string
  image_note_en?: string
  facts?: PlaceFact[]
}

/**
 * Editable, separate from the source-of-truth data files. Keyed by unit P-code
 * (e.g. "CD1000") or "province:<Name>". Entries beyond the seed examples are
 * curated in a coowork research pass. The "_meta" key documents the schema.
 */
export type PlaceMediaFile = Record<string, PlaceMedia | Record<string, unknown>>

/** The subset of a search/selection target shared by units and provinces. */
export type SelectableKind = 'unit' | 'province'
