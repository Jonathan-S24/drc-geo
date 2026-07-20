import type { Feature, FeatureCollection, Polygon, Position } from 'geojson'
import type { UnitFeatureProperties } from '../types'

type UnitFeature = Feature<Polygon, UnitFeatureProperties>

/** Signed area of a ring (planar approximation — fine at DRC latitudes for centroids/sizes). */
function ringArea(ring: Position[]): number {
  let a = 0
  for (let i = 0; i < ring.length - 1; i++) {
    a += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1]
  }
  return a / 2
}

/** Polygon centroid of the outer ring (lon, lat). */
export function featureCentroid(feature: UnitFeature): [number, number] {
  const ring = feature.geometry.coordinates[0]
  const a = ringArea(ring)
  if (Math.abs(a) < 1e-12) return [ring[0][0], ring[0][1]]
  let cx = 0
  let cy = 0
  for (let i = 0; i < ring.length - 1; i++) {
    const f = ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1]
    cx += (ring[i][0] + ring[i + 1][0]) * f
    cy += (ring[i][1] + ring[i + 1][1]) * f
  }
  return [cx / (6 * a), cy / (6 * a)]
}

/** Planar area, used only to rank shapes by size for label priority. */
export function featureSize(feature: UnitFeature): number {
  return Math.abs(ringArea(feature.geometry.coordinates[0]))
}

/**
 * Area-weighted centroid of several features (label anchor for a province).
 * Weighting by unit size keeps the anchor inside the bulk of concave provinces.
 */
export function groupCentroid(features: UnitFeature[]): [number, number] {
  let x = 0
  let y = 0
  let w = 0
  for (const f of features) {
    const size = featureSize(f)
    const [cx, cy] = featureCentroid(f)
    x += cx * size
    y += cy * size
    w += size
  }
  return w > 0 ? [x / w, y / w] : [0, 0]
}

export interface SilhouetteData {
  path: string
  viewBox: string
}

/**
 * Project a unit's polygon to a small SVG path (equirectangular, y flipped),
 * for the card-header watermark. The shape IS the identity when there's no photo.
 */
export function featureToSvgPath(feature: UnitFeature, size = 100): SilhouetteData {
  const rings = feature.geometry.coordinates
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const ring of rings) {
    for (const [x, y] of ring) {
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }
  const spanX = maxX - minX || 1
  const spanY = maxY - minY || 1
  const scale = size / Math.max(spanX, spanY)
  const w = spanX * scale
  const h = spanY * scale
  const px = (x: number) => ((x - minX) * scale).toFixed(1)
  const py = (y: number) => ((maxY - y) * scale).toFixed(1)
  const path = rings
    .map((ring) => `M${ring.map(([x, y]) => `${px(x)},${py(y)}`).join('L')}Z`)
    .join('')
  return { path, viewBox: `0 0 ${w.toFixed(1)} ${h.toFixed(1)}` }
}

/** All features of a FeatureCollection indexed by pcode. */
export function indexFeatures(
  fc: FeatureCollection<Polygon, UnitFeatureProperties>,
): Map<string, UnitFeature> {
  return new Map(fc.features.map((f) => [f.properties.p, f]))
}

export interface CountrySvg {
  viewBox: string
  paths: { pcode: string; d: string }[]
}

/** Project every unit into ONE shared coordinate space (for the quiz click-map). */
export function countryToSvgPaths(
  fc: FeatureCollection<Polygon, UnitFeatureProperties>,
  size = 900,
): CountrySvg {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const f of fc.features) {
    for (const ring of f.geometry.coordinates) {
      for (const [x, y] of ring) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  const scale = size / Math.max(maxX - minX, maxY - minY)
  const w = (maxX - minX) * scale
  const h = (maxY - minY) * scale
  const px = (x: number) => ((x - minX) * scale).toFixed(1)
  const py = (y: number) => ((maxY - y) * scale).toFixed(1)
  const paths = fc.features.map((f) => ({
    pcode: f.properties.p,
    d: f.geometry.coordinates
      .map((ring) => `M${ring.map(([x, y]) => `${px(x)},${py(y)}`).join('L')}Z`)
      .join(''),
  }))
  return { viewBox: `0 0 ${w.toFixed(1)} ${h.toFixed(1)}`, paths }
}
