import { useEffect, useMemo, useRef } from 'react'
import { MapContainer, GeoJSON, useMap } from 'react-leaflet'
import type { Feature, GeometryObject } from 'geojson'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { DrcData } from '../data/useDrcData'
import { useAppState, type Selection } from '../state/AppStateContext'
import { buildProvinceColorMap } from '../utils/provinceColors'
import { sameName } from '../utils/match'

const DRC_CENTER: [number, number] = [-2.9, 23.6]
const HOVER_COLOR = '#1f4e5f'
const DIMMED_OPACITY = 0.08

interface MapViewProps {
  data: DrcData
}

function isSelected(selection: Selection, pcode: string, province: string): boolean {
  return (
    (selection.view === 'unit' && selection.pcode === pcode) ||
    (selection.view === 'province' && sameName(selection.name, province))
  )
}

function hasActiveSelection(selection: Selection): boolean {
  return selection.view === 'unit' || selection.view === 'province'
}

export function MapView({ data }: MapViewProps) {
  const { selectUnit, selection } = useAppState()
  const geoJsonRef = useRef<L.GeoJSON | null>(null)
  // Event handlers are bound once by onEachFeature, so they read the live
  // selection through this ref rather than a stale closure.
  const selectionRef = useRef<Selection>(selection)
  selectionRef.current = selection

  const colorMap = useMemo(() => buildProvinceColorMap(data.provinces.map((p) => p.name)), [data.provinces])

  // Style for a unit given the current selection: selected shapes keep their
  // full province color while everything else fades back, so the selection
  // stands out without a highlight color that could collide with the palette.
  const styleFor = (pcode: string): L.PathOptions => {
    const u = data.byPcode.get(pcode)
    const provinceColor = (u && colorMap.get(u.province)) || '#888'
    const base: L.PathOptions = {
      color: '#ffffff',
      weight: 0.7,
      fillColor: provinceColor,
      fillOpacity: u?.type === 'ville' ? 0.95 : 0.55,
    }
    const sel = selectionRef.current
    if (!u || !hasActiveSelection(sel)) return base
    if (isSelected(sel, pcode, u.province)) {
      return { ...base, weight: 1.6, fillOpacity: u.type === 'ville' ? 1 : 0.85 }
    }
    return { ...base, weight: 0.5, fillOpacity: DIMMED_OPACITY }
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
          layer.on('click', () => selectUnit(u.pcode, true))
          layer.on('mouseover', () => path.setStyle({ weight: 2, color: HOVER_COLOR }))
          layer.on('mouseout', () => path.setStyle(styleFor(pcode)))
        }}
      />
      <MapController data={data} geoJsonRef={geoJsonRef} styleFor={styleFor} />
    </MapContainer>
  )
}

interface MapControllerProps {
  data: DrcData
  geoJsonRef: React.RefObject<L.GeoJSON | null>
  styleFor: (pcode: string) => L.PathOptions
}

function MapController({ data, geoJsonRef, styleFor }: MapControllerProps) {
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

    // Dimming affects every feature, so restyle all layers on each selection change.
    let bounds: L.LatLngBounds | null = null
    gj.eachLayer((layer) => {
      const poly = layer as L.Polygon
      const pcode = poly.feature && 'properties' in poly.feature ? (poly.feature.properties as { p: string }).p : undefined
      if (!pcode) return
      const u = data.byPcode.get(pcode)
      if (!u) return
      poly.setStyle(styleFor(pcode))
      if (isSelected(selection, pcode, u.province)) {
        const b = poly.getBounds()
        bounds = bounds ? bounds.extend(b) : L.latLngBounds(b.getSouthWest(), b.getNorthEast())
      }
    })

    // Center-stage the selection with a smooth fly animation.
    if (bounds) {
      map.flyToBounds(bounds, {
        padding: [50, 50],
        maxZoom: selection.view === 'unit' ? 8.5 : 7,
        duration: 0.9,
      })
    } else if (!hasActiveSelection(selection)) {
      map.flyToBounds(gj.getBounds(), { padding: [10, 10], duration: 0.9 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection, data, map, geoJsonRef])

  return null
}
