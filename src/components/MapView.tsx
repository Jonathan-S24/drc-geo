import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, GeoJSON, useMap } from 'react-leaflet'
import type { Feature, Geometry, Polygon } from 'geojson'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { DrcData } from '../data/useDrcData'
import type { HistoricalEraProps, UnitFeatureProperties } from '../types'
import { useAppState, type Selection } from '../state/AppStateContext'
import { useLanguage } from '../i18n/LanguageContext'
import { useLayer, type MapLayer } from '../state/LayerContext'
import { formatNumber } from '../utils/format'
import { sameName } from '../utils/match'
import { featureSize, groupCentroid, featureCentroid } from '../utils/geo'
import { PROVINCE_COLORS, SUB_HUES, idleFill, dimmedFill, mix } from '../theme/palette'
import { buildLanguageMap, LANGUAGE_COLORS } from '../theme/languages'

const DRC_CENTER: [number, number] = [-2.9, 23.6]
const FLY = { duration: 0.4, easeLinearity: 0.2 }

type UnitFeature = Feature<Polygon, UnitFeatureProperties>

interface MapViewProps {
  data: DrcData
}

function provinceHue(province: string): string {
  return PROVINCE_COLORS.get(province) ?? '#8aa'
}

/** Stable per-province rotation of hues for its territoires when opened. */
function subHue(data: DrcData, unit: { pcode: string; province: string }): string {
  const siblings = data.units.filter((u) => u.province === unit.province)
  const idx = siblings.findIndex((u) => u.pcode === unit.pcode)
  return SUB_HUES[idx % SUB_HUES.length]
}

export function MapView({ data }: MapViewProps) {
  const { selectUnit, selection } = useAppState()
  const { lang } = useLanguage()
  const { layer } = useLayer()
  const geoJsonRef = useRef<L.GeoJSON | null>(null)
  const selectionRef = useRef<Selection>(selection)
  selectionRef.current = selection
  const layerRef = useRef<MapLayer>(layer)
  layerRef.current = layer
  const languageMap = useMemo(() => buildLanguageMap(data), [data])

  // Full style state machine: idle (calm, desaturated) → hover (saturated) →
  // selected (full color, white outline) with everything else dropped darker.
  const styleFor = (pcode: string, hovered = false): L.PathOptions => {
    const u = data.byPcode.get(pcode)
    if (!u) return {}
    const activeLayer = layerRef.current
    // In history mode the modern boundaries are replaced by the era layer.
    if (activeLayer === 'histoire') return { opacity: 0, fillOpacity: 0, weight: 0 }
    // Language layer recolors every province by its dominant national language.
    const hue =
      activeLayer === 'langues'
        ? (languageMap.get(u.province) && LANGUAGE_COLORS[languageMap.get(u.province)!]) || provinceHue(u.province)
        : provinceHue(u.province)
    const sel = selectionRef.current

    if (activeLayer === 'langues' && sel.view === 'none') {
      return { color: 'rgba(255,255,255,0.7)', weight: hovered ? 1.6 : 0.6, fillColor: hue, fillOpacity: 0.9 }
    }

    if (sel.view === 'unit') {
      if (sel.pcode === pcode) {
        return { color: '#ffffff', weight: 2.5, fillColor: hue, fillOpacity: 1 }
      }
      const isSibling = data.byPcode.get(sel.pcode)?.province === u.province
      return {
        color: mix('#ffffff', '#0a3f4a', hovered ? 0.2 : 0.55),
        weight: hovered ? 1.4 : 0.6,
        fillColor: hovered ? hue : dimmedFill(hue),
        fillOpacity: isSibling ? 0.85 : 0.9,
      }
    }

    if (sel.view === 'province') {
      if (sameName(sel.name, u.province)) {
        // opened province: territoires appear as distinct colored sub-shapes
        return {
          color: '#ffffff',
          weight: hovered ? 2.2 : 1.2,
          fillColor: hovered ? mix(subHue(data, u), '#ffffff', 0.15) : subHue(data, u),
          fillOpacity: 1,
        }
      }
      return {
        color: mix('#ffffff', '#0a3f4a', hovered ? 0.2 : 0.55),
        weight: hovered ? 1.4 : 0.6,
        fillColor: hovered ? hue : dimmedFill(hue),
        fillOpacity: 0.9,
      }
    }

    // idle
    return {
      color: hovered ? '#ffffff' : 'rgba(255,255,255,0.75)',
      weight: hovered ? 1.8 : 0.7,
      fillColor: hovered ? hue : idleFill(hue),
      fillOpacity: u.type === 'ville' ? 1 : 0.96,
    }
  }

  const tooltipHtml = (pcode: string): string => {
    const u = data.byPcode.get(pcode)
    if (!u) return ''
    const pop = u.population_2024_ocha
    const popLine =
      pop == null
        ? lang === 'fr'
          ? 'population : voir unité englobante'
          : 'population: counted in surrounding unit'
        : `${formatNumber(pop, lang === 'fr' ? 'fr-FR' : 'en-US')} hab.`
    return `<b>${u.name}</b><br/><span style="opacity:.8">${popLine}</span>`
  }

  return (
    <MapContainer
      center={DRC_CENTER}
      zoom={5.25}
      zoomSnap={0.25}
      className="h-full w-full animate-fade-in"
      style={{ background: '#0d4f5c' }} // inline: leaflet.css's own background rule loads after ours
      attributionControl={false}
      zoomControl={false}
    >
      <GeoJSON
        key={lang} // tooltips capture lang at bind time; recreate the layer on toggle
        ref={geoJsonRef}
        data={data.boundaries}
        style={(feature) => styleFor((feature as UnitFeature).properties.p)}
        onEachFeature={(feature, layer) => {
          const pcode = (feature as UnitFeature).properties.p
          const u = data.byPcode.get(pcode)
          if (!u) return
          const path = layer as L.Polygon
          layer.bindTooltip(tooltipHtml(pcode), { sticky: true, className: 'map-tip', opacity: 1 })
          // In history mode the base layer is hidden — it must not swallow
          // clicks/hovers meant for the era shapes underneath it.
          layer.on('click', () => {
            if (layerRef.current === 'histoire') return
            selectUnit(u.pcode, true)
          })
          layer.on('mouseover', () => {
            if (layerRef.current === 'histoire') return
            path.setStyle(styleFor(pcode, true))
            path.bringToFront()
          })
          layer.on('mouseout', () => {
            if (layerRef.current === 'histoire') return
            path.setStyle(styleFor(pcode))
          })
        }}
      />
      <MapController data={data} geoJsonRef={geoJsonRef} styleFor={styleFor} layer={layer} />
      {layer !== 'histoire' && <MapLabels data={data} />}
      {layer === 'parcs' && data.parks && <ParksLayer data={data} />}
      {layer === 'histoire' && <HistoryLayer data={data} />}
      <ZoomControls />
    </MapContainer>
  )
}

// ---------- selection → restyle + fly ----------

interface MapControllerProps {
  data: DrcData
  geoJsonRef: React.RefObject<L.GeoJSON | null>
  styleFor: (pcode: string) => L.PathOptions
  layer: MapLayer
}

function MapController({ data, geoJsonRef, styleFor, layer }: MapControllerProps) {
  const map = useMap()
  const { selection } = useAppState()

  // Restyle every base feature when the active layer changes (language recolor,
  // history hide/show), independent of selection.
  useEffect(() => {
    const gj = geoJsonRef.current
    if (!gj) return
    gj.eachLayer((l) => {
      const poly = l as L.Polygon
      const pcode = poly.feature && 'properties' in poly.feature ? (poly.feature.properties as { p: string }).p : undefined
      if (pcode) poly.setStyle(styleFor(pcode))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layer])

  // Fit the whole country once. invalidateSize() because flexbox can leave the
  // container measured 0x0 at Leaflet construction time.
  useEffect(() => {
    map.invalidateSize()
    const gj = geoJsonRef.current
    if (gj) map.fitBounds(gj.getBounds(), { padding: [20, 20] })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const gj = geoJsonRef.current
    if (!gj) return

    let bounds: L.LatLngBounds | null = null
    gj.eachLayer((layer) => {
      const poly = layer as L.Polygon
      poly.closeTooltip()
      const pcode = poly.feature && 'properties' in poly.feature ? (poly.feature.properties as { p: string }).p : undefined
      if (!pcode) return
      const u = data.byPcode.get(pcode)
      if (!u) return
      poly.setStyle(styleFor(pcode))
      const isTarget =
        (selection.view === 'unit' && selection.pcode === pcode) ||
        (selection.view === 'province' && sameName(selection.name, u.province))
      if (isTarget) {
        poly.bringToFront()
        const b = poly.getBounds()
        bounds = bounds ? bounds.extend(b) : L.latLngBounds(b.getSouthWest(), b.getNorthEast())
      }
    })

    // the signature moment: the map flies you to the place (400ms ease-out)
    if (bounds) {
      const pad: [number, number] = window.innerWidth < 900 ? [24, 24] : [60, 60]
      map.flyToBounds(bounds, {
        ...FLY,
        padding: pad,
        maxZoom: selection.view === 'unit' ? 8.75 : 7.25,
      })
    } else if (selection.view === 'none') {
      map.flyToBounds(gj.getBounds(), { ...FLY, padding: [20, 20] })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection, data, map, geoJsonRef])

  return null
}

// ---------- zoom-dependent labels ----------

interface LabelSpec {
  key: string
  pos: [number, number] // lat, lng
  text: string
  size: number // planar size used for min-zoom gating
  kind: 'province' | 'unit'
  province: string
}

function MapLabels({ data }: { data: DrcData }) {
  const map = useMap()
  const { selection } = useAppState()
  const [zoom, setZoom] = useState(map.getZoom())

  useEffect(() => {
    const onZoom = () => setZoom(map.getZoom())
    map.on('zoomend', onZoom)
    return () => {
      map.off('zoomend', onZoom)
    }
  }, [map])

  const specs = useMemo<LabelSpec[]>(() => {
    const featByPcode = new Map(
      (data.boundaries.features as UnitFeature[]).map((f) => [f.properties.p, f]),
    )
    const provinces = new Map<string, UnitFeature[]>()
    for (const u of data.units) {
      const f = featByPcode.get(u.pcode)
      if (!f) continue
      const arr = provinces.get(u.province) ?? []
      arr.push(f)
      provinces.set(u.province, arr)
    }
    const out: LabelSpec[] = []
    for (const [prov, feats] of provinces) {
      const [lng, lat] = groupCentroid(feats)
      out.push({
        key: `prov:${prov}`,
        pos: [lat, lng],
        text: prov,
        size: feats.reduce((s, f) => s + featureSize(f), 0),
        kind: 'province',
        province: prov,
      })
    }
    for (const u of data.units) {
      const f = featByPcode.get(u.pcode)
      if (!f) continue
      const [lng, lat] = featureCentroid(f)
      out.push({
        key: `u:${u.pcode}`,
        pos: [lat, lng],
        text: u.name,
        size: featureSize(f),
        kind: 'unit',
        province: u.province,
      })
    }
    return out
  }, [data])

  useEffect(() => {
    const openProvince =
      selection.view === 'province'
        ? selection.name
        : selection.view === 'unit'
          ? data.byPcode.get(selection.pcode)?.province ?? null
          : null

    const candidates: (LabelSpec & { fontSize: number })[] = []
    for (const s of specs) {
      let visible = false
      let fontSize = 12
      if (s.kind === 'province') {
        // province names at country zoom; gate small provinces until zoomed a bit
        visible = !openProvince && zoom >= 4.5 && (s.size > 4 || zoom >= 6)
        fontSize = Math.max(10, Math.min(15, 10 + (zoom - 5) * 2))
      } else if (openProvince && sameName(s.province, openProvince)) {
        // territoire names at province zoom; small shapes need more zoom to fit
        visible = zoom >= 6.5 && (s.size > 0.5 || zoom >= 8)
        fontSize = Math.min(14, 9 + (zoom - 6.5) * 2)
      }
      if (visible) candidates.push({ ...s, fontSize })
    }

    // never overlap: bigger shapes keep their label, colliding smaller ones
    // drop out until the user zooms in and screen space frees up
    const kept: { x: number; y: number; w: number; h: number }[] = []
    const layerGroup = L.layerGroup()
    candidates.sort((a, b) => b.size - a.size)
    for (const s of candidates) {
      const pt = map.latLngToContainerPoint(s.pos)
      const w = s.text.length * s.fontSize * 0.62 + 8
      const h = s.fontSize + 8
      const box = { x: pt.x - w / 2, y: pt.y - h / 2, w, h }
      const collides = kept.some(
        (k) => box.x < k.x + k.w && box.x + box.w > k.x && box.y < k.y + k.h && box.y + box.h > k.y,
      )
      if (collides) continue
      kept.push(box)
      layerGroup.addLayer(
        L.marker(s.pos, {
          interactive: false,
          keyboard: false,
          icon: L.divIcon({
            className: 'map-label',
            html: `<span style="font-size:${s.fontSize.toFixed(1)}px">${s.text}</span>`,
            iconSize: [0, 0],
          }),
        }),
      )
    }
    layerGroup.addTo(map)
    return () => {
      layerGroup.remove()
    }
  }, [specs, zoom, selection, data, map])

  return null
}

// ---------- custom zoom controls (bottom-right, touch friendly) ----------

function ZoomControls() {
  const map = useMap()
  const btn =
    'flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-lg font-bold text-ink shadow-lg transition hover:bg-white active:scale-[0.98]'
  return (
    <div className="absolute bottom-6 right-4 z-[1000] flex flex-col gap-2 md:bottom-8 md:right-6">
      <button type="button" aria-label="Zoom in" className={btn} onClick={() => map.zoomIn()}>
        +
      </button>
      <button type="button" aria-label="Zoom out" className={btn} onClick={() => map.zoomOut()}>
        −
      </button>
    </div>
  )
}

// ---------- parks overlay ----------

function ParksLayer({ data }: { data: DrcData }) {
  const map = useMap()
  const { lang } = useLanguage()
  useEffect(() => {
    if (!data.parks) return
    const group = L.layerGroup().addTo(map)
    const gj = L.geoJSON(data.parks, {
      style: { color: '#2f7d4f', weight: 1.5, fillColor: '#3ba05f', fillOpacity: 0.4 },
      onEachFeature: (f, layer) => {
        const name = (lang === 'en' && f.properties?.name_en) || f.properties?.name || ''
        layer.bindTooltip(name, { sticky: true, className: 'map-tip', opacity: 1 })
        const b = (layer as L.Polygon).getBounds()
        L.marker(b.getCenter(), {
          interactive: false,
          keyboard: false,
          icon: L.divIcon({
            className: 'map-label',
            html: `<span style="font-size:11px">🌳 ${name}</span>`,
            iconSize: [0, 0],
          }),
        }).addTo(group)
      },
    }).addTo(group)
    void gj
    return () => {
      group.remove()
    }
  }, [map, data.parks, lang])
  return null
}

// ---------- historical eras ----------

type EraFeature = Feature<Geometry, HistoricalEraProps>

function HistoryLayer({ data }: { data: DrcData }) {
  const map = useMap()
  const { lang } = useLanguage()
  const { eraIndex } = useLayer()
  const eras = data.historicalEras

  useEffect(() => {
    const era = eras[Math.min(eraIndex, eras.length - 1)]
    if (!era) return
    const palette = ['#e8836b', '#e3b04e', '#67bfa0', '#9d8cc9', '#5b9bd1', '#94aa7e', '#b07d4f', '#a2666f']
    const group = L.layerGroup().addTo(map)
    let i = 0
    const gj = L.geoJSON(era.fc, {
      style: () => ({
        color: '#ffffff',
        weight: 1.4,
        fillColor: palette[i++ % palette.length],
        fillOpacity: 0.72,
      }),
      onEachFeature: (f, layer) => {
        const props = (f as EraFeature).properties
        const became = `<div style="margin-top:4px;opacity:.85"><b>${lang === 'fr' ? 'Provinces actuelles' : 'Modern provinces'} :</b> ${props.modern.join(', ')}</div>`
        layer.bindPopup(`<b>${props.name}</b>${became}`, { className: 'map-tip' })
        const b = (layer as L.Polygon).getBounds()
        L.marker(b.getCenter(), {
          interactive: false,
          keyboard: false,
          icon: L.divIcon({
            className: 'map-label',
            html: `<span style="font-size:13px">${props.name}</span>`,
            iconSize: [0, 0],
          }),
        }).addTo(group)
      },
    })
    gj.addTo(group)
    gj.bringToFront() // above the (hidden but still hit-testable) base boundaries
    // crossfade the newly mounted era in via the SVG renderer's root group
    const renderer = (gj.getLayers()[0] as L.Path | undefined)?.getElement()?.parentElement
    if (renderer) {
      renderer.style.transition = 'opacity 320ms ease'
      renderer.style.opacity = '0'
      requestAnimationFrame(() => {
        renderer.style.opacity = '1'
      })
    }
    map.fitBounds(gj.getBounds(), { padding: [30, 30], animate: true, duration: 0.4 })
    return () => {
      group.remove()
    }
  }, [map, eras, eraIndex, lang])

  return null
}
