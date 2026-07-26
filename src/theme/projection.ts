import type { FeatureCollection, Geometry, Polygon, MultiPolygon } from 'geojson'

export interface Projection {
  px: (lon: number) => number
  py: (lat: number) => number
  d: (geom: Geometry) => string
  width: number
  height: number
}

/** Equirectangular fit-to-viewport projection, matching the Fleuve prototype. */
export function makeProjection(
  bounds: { x0: number; x1: number; y0: number; y1: number },
  width: number,
  height: number,
): Projection {
  const pad = Math.min(width, height) * 0.055
  const sx = (width - pad * 2) / (bounds.x1 - bounds.x0)
  const sy = (height - pad * 2) / (bounds.y1 - bounds.y0)
  const s = Math.min(sx, sy)
  const ox = (width - (bounds.x1 - bounds.x0) * s) / 2
  const oy = (height - (bounds.y1 - bounds.y0) * s) / 2
  const px = (lon: number) => ox + (lon - bounds.x0) * s
  const py = (lat: number) => oy + (bounds.y1 - lat) * s

  const d = (geom: Geometry): string => {
    const rings =
      geom.type === 'Polygon'
        ? [(geom as Polygon).coordinates]
        : geom.type === 'MultiPolygon'
          ? (geom as MultiPolygon).coordinates
          : []
    let s2 = ''
    for (const poly of rings) {
      for (const ring of poly) {
        ring.forEach((c, i) => {
          s2 += (i ? 'L' : 'M') + px(c[0]).toFixed(1) + ' ' + py(c[1]).toFixed(1)
        })
        s2 += 'Z'
      }
    }
    return s2
  }

  return { px, py, d, width, height }
}

/** DRC bounding box (fixed, tuned in the prototype) with a small margin. */
export const DRC_BOUNDS = { x0: 12.0, x1: 31.4, y0: -13.6, y1: 5.5 }

/** Bounds covering only the given features (for future zoom — unused by the static map). */
export function boundsOf(fc: FeatureCollection): { x0: number; x1: number; y0: number; y1: number } {
  let x0 = Infinity
  let x1 = -Infinity
  let y0 = Infinity
  let y1 = -Infinity
  for (const f of fc.features) {
    const g = f.geometry
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : []
    for (const poly of polys) {
      for (const ring of poly) {
        for (const [lon, lat] of ring) {
          if (lon < x0) x0 = lon
          if (lon > x1) x1 = lon
          if (lat < y0) y0 = lat
          if (lat > y1) y1 = lat
        }
      }
    }
  }
  return { x0, x1, y0, y1 }
}
