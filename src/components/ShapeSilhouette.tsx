import { useMemo } from 'react'
import type { Feature, Polygon } from 'geojson'
import type { UnitFeatureProperties } from '../types'
import { featureToSvgPath } from '../utils/geo'

interface ShapeSilhouetteProps {
  features: Feature<Polygon, UnitFeatureProperties>[]
  className?: string
}

/**
 * A unit's (or province's) real boundary drawn as an SVG silhouette — used as
 * the card-header watermark when no photo exists. The shape is the identity,
 * the way the reference design uses flags.
 */
export function ShapeSilhouette({ features, className }: ShapeSilhouetteProps) {
  const { path, viewBox } = useMemo(() => {
    if (features.length === 1) return featureToSvgPath(features[0])
    // merge multiple unit polygons into one silhouette (province case)
    const merged: Feature<Polygon, UnitFeatureProperties> = {
      type: 'Feature',
      properties: { p: 'merged' },
      geometry: {
        type: 'Polygon',
        coordinates: features.flatMap((f) => f.geometry.coordinates),
      },
    }
    return featureToSvgPath(merged)
  }, [features])

  return (
    <svg viewBox={viewBox} className={className} aria-hidden preserveAspectRatio="xMidYMid meet">
      <path d={path} fill="currentColor" fillRule="evenodd" />
    </svg>
  )
}
