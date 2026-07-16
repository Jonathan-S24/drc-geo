import { useEffect, useMemo, useRef } from 'react'
import { MapContainer, GeoJSON, useMap } from 'react-leaflet'
import type { Feature, GeometryObject } from 'geojson'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { DrcData } from '../data/useDrcData'
import { useAppState } from '../state/AppStateContext'
import { buildProvinceColorMap } from '../utils/provinceColors'
import { sameName } from '../utils/match'

const DRC_CENTER: [number, number] = [-2.9, 23.6]
const SELECTED_COLOR = '#c8a24a'
const HOVER_COLOR = '#1f4e5f'

interface MapViewProps {
  data: DrcData
}

export function MapView({ data }: MapViewProps) {
  const { selectUnit } = useAppState()
  const geoJsonRef = useRef<L.GeoJSON | null>(null)
  const highlightedRef = useRef<Set<string>>(new Set())

  const colorMap = useMemo(() => buildProvinceColorMap(data.provinces.map((p) => p.name)), [data.provinces])

  const styleFor = (pcode: string): L.PathOptions => {
    const u = data.byPcode.get(pcode)
    const provinceColor = (u && colorMap.get(u.province)) || '#888'
    return {
      color: '#ffffff',
      weight: 0.7,
      fillColor: provinceColor,
      fillOpacity: u?.type === 'ville' ? 0.95 : 0.55,
    }
  }

  return (
    <MapContainer
      center={DRC_CENTER}
      zoom={5.25}
      zoomSnap={0.25}
      className="h-full w-full"
      attributionControl={false}
    >
      <GeoJSON
        ref={geoJsonRef}
        data={data.boundaries}
        style={(feature) => styleFor((feature as Feature<GeometryObject, { p: string }>).properties.p)}
        onEachFeature={(feature, layer) => {
          const pcode = (feature as Feature<GeometryObject, { p: string }>).properties.p
          const u = data.byPcode.get(pcode)
          if (!u) return
          const path = layer as L.Polygon
          layer.bindTooltip(`${u.name} (${u.province})`, { sticky: true })
          layer.on('click', () => selectUnit(u.pcode, false))
          layer.on('mouseover', () => path.setStyle({ weight: 2, color: HOVER_COLOR }))
          layer.on('mouseout', () => {
            if (highlightedRef.current.has(u.pcode)) return
            geoJsonRef.current?.resetStyle(path)
          })
        }}
      />
      <MapController data={data} geoJsonRef={geoJsonRef} highlightedRef={highlightedRef} />
    </MapContainer>
  )
}

interface MapControllerProps {
  data: DrcData
  geoJsonRef: React.RefObject<L.GeoJSON | null>
  highlightedRef: React.RefObject<Set<string>>
}

function MapController({ data, geoJsonRef, highlightedRef }: MapControllerProps) {
  const map = useMap()
  const { selection } = useAppState()

  // Fit the whole country once, on first load. invalidateSize() is required because the
  // map container is sized by flexbox, and Leaflet can measure it as 0x0 at construction
  // time (before the flex layout has settled), leaving zoom/pixel origin unset.
  useEffect(() => {
    map.invalidateSize()
    const gj = geoJsonRef.current
    if (gj) map.fitBounds(gj.getBounds(), { padding: [10, 10] })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const gj = geoJsonRef.current
    if (!gj) return

    const prevHighlighted = highlightedRef.current
    const nextHighlighted = new Set<string>()
    let bounds: L.LatLngBounds | null = null

    gj.eachLayer((layer) => {
      const poly = layer as L.Polygon
      const pcode = poly.feature && 'properties' in poly.feature ? (poly.feature.properties as { p: string }).p : undefined
      if (!pcode) return
      const u = data.byPcode.get(pcode)
      if (!u) return

      const isHighlighted =
        (selection.view === 'unit' && selection.pcode === pcode) ||
        (selection.view === 'province' && sameName(selection.name, u.province))

      if (isHighlighted) {
        nextHighlighted.add(pcode)
        poly.setStyle({ weight: 2.5, color: SELECTED_COLOR, fillOpacity: 0.75 })
        const b = poly.getBounds()
        bounds = bounds ? bounds.extend(b) : L.latLngBounds(b.getSouthWest(), b.getNorthEast())
      } else if (prevHighlighted.has(pcode)) {
        gj.resetStyle(poly)
      }
    })

    highlightedRef.current = nextHighlighted

    const shouldZoom = selection.view === 'province' || (selection.view === 'unit' && selection.zoom)
    if (bounds && shouldZoom) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 8 })
  }, [selection, data, map, geoJsonRef, highlightedRef])

  return null
}
