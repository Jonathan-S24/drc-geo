import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Feature, Polygon } from 'geojson'
import type { DrcData } from '../data/useDrcData'
import type { Park, UnitFeatureProperties } from '../types'
import { useAppState } from '../state/AppStateContext'
import { useLayer } from '../state/LayerContext'
import { useLanguage } from '../i18n/LanguageContext'
import { useReducedMotion } from '../theme/useReducedMotion'
import { buildFleuveColors } from '../theme/fleuve'
import { makeProjection, DRC_BOUNDS } from '../theme/projection'
import { formatNumber } from '../utils/format'

type UnitFeature = Feature<Polygon, UnitFeatureProperties>

interface Tip {
  x: number
  y: number
  title: string
  sub: string
}

/** Health-zone count → green ramp. Buckets: 1–2 / 3–4 / 5–6 / 7–9 / 10+. */
export const SANTE_RAMP = { color: '#47C98A', steps: [0.14, 0.3, 0.46, 0.64, 0.85] }
export const SANTE_BUCKETS = ['1–2', '3–4', '5–6', '7–9', '10+']
export function santeBucket(n: number): number {
  if (n <= 0) return -1
  if (n <= 2) return 0
  if (n <= 4) return 1
  if (n <= 6) return 2
  if (n <= 9) return 3
  return 4
}
function santeOpacity(n: number): number {
  const b = santeBucket(n)
  return b < 0 ? 0.05 : SANTE_RAMP.steps[b]
}

export function FleuveMap({ data, fitKey }: { data: DrcData; fitKey: string }) {
  const { selection, selectUnit } = useAppState()
  const { mode, selectedPark, setSelectedPark, eraIndex } = useLayer()
  const { t, lang } = useLanguage()
  const reduced = useReducedMotion()

  const stageRef = useRef<HTMLDivElement | null>(null)
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight })

  // Track the stage size so the projection refits on resize / orientation change.
  useLayoutEffect(() => {
    const el = stageRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect
      setSize({ w: Math.round(r.width), h: Math.round(r.height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const proj = useMemo(() => makeProjection(DRC_BOUNDS, size.w, size.h), [size])
  // Key the palette on the TERRITORIES-file spelling: the provinces file writes
  // "Équateur" while units write "Equateur", so keying on the former left that
  // province falling back to grey.
  const colors = useMemo(
    () => buildFleuveColors([...new Set(data.units.map((u) => u.province))]),
    [data.units],
  )

  const features = data.boundaries.features as UnitFeature[]
  const pathById = useMemo(() => {
    const m = new Map<string, string>()
    for (const f of features) m.set(f.properties.p, proj.d(f.geometry))
    return m
  }, [features, proj])

  // One combined path of every unit: painted opaque dark beneath the coloured
  // fills so the country reads as *land* sitting on the animated water, and
  // used again to keep the Kuba weave on the land only.
  const landPath = useMemo(() => Array.from(pathById.values()).join(''), [pathById])

  const selectedPcode = selection.view === 'unit' ? selection.pcode : null
  // In parks the admin map ghosts; in histoire (pre-2015) it clears entirely so
  // the era's polygons take the stage.
  const eraCount = data.historicalEras.length // 4 historical + a synthetic 2015
  const showingHistory = mode === 'histoire' && eraIndex < eraCount
  const ghost = mode === 'parks'

  // Per-unit fill + opacity for the active mode.
  const styleFor = (pcode: string): { fill: string; opacity: number } => {
    const u = data.byPcode.get(pcode)
    if (!u) return { fill: '#888', opacity: 0.3 }
    if (showingHistory) return { fill: '#0A211C', opacity: 0 }
    if (mode === 'sante') {
      const n = data.healthZonesByTerritory.get(pcode)?.length ?? 0
      return { fill: SANTE_RAMP.color, opacity: santeOpacity(n) }
    }
    const base = colors.get(u.province) ?? '#888'
    if (ghost) return { fill: base, opacity: 0.09 }
    if (pcode === selectedPcode) return { fill: base, opacity: 0.78 }
    return { fill: base, opacity: 0.3 }
  }

  // Projected bounding box of the whole country — the target fitMap works with.
  const bbox = useMemo(() => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
    for (const f of features) {
      for (const ring of f.geometry.coordinates) {
        for (const [lon, lat] of ring) {
          const x = proj.px(lon), y = proj.py(lat)
          if (x < x0) x0 = x
          if (x > x1) x1 = x
          if (y < y0) y0 = y
          if (y > y1) y1 = y
        }
      }
    }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
  }, [features, proj])

  // The map never hides behind a panel: it re-fits into whatever space is free.
  const mapWrapRef = useRef<SVGGElement | null>(null)
  useEffect(() => {
    const fit = () => {
      const stage = stageRef.current
      const wrap = mapWrapRef.current
      if (!stage || !wrap || !bbox.w || !bbox.h) return
      const S = stage.getBoundingClientRect()
      const pad = 18
      let top = 72, left = 14, right = S.width - 14, bottom = S.height - 14
      // Panels only exist in the DOM while open, so a hit here means "visible".
      const rect = (sel: string) => {
        const el = document.querySelector(sel)
        return el ? el.getBoundingClientRect() : null
      }
      const leg = rect('.fl-legend'); if (leg) right = Math.min(right, leg.left - S.left - pad)
      const fic = rect('.fl-fiche'); if (fic) right = Math.min(right, fic.left - S.left - pad)
      const rail = rect('.fl-rail'); if (rail) bottom = Math.min(bottom, rail.top - S.top - pad)
      const tl = rect('.fl-hist'); if (tl) bottom = Math.min(bottom, tl.top - S.top - pad)
      const pd = rect('.fl-pdetail'); if (pd) left = Math.max(left, pd.right - S.left + pad)
      // Never squeeze to nothing — fall back to the full stage.
      if (right - left < 200) { right = S.width - 14; left = 14 }
      if (bottom - top < 200) { bottom = S.height - 14; top = 72 }

      const aw = right - left, ah = bottom - top
      if (aw <= 0 || ah <= 0) return
      const k = Math.min(aw / bbox.w, ah / bbox.h, 1.9)
      const tx = (left + right) / 2 - (bbox.x + bbox.w / 2) * k
      const ty = (top + bottom) / 2 - (bbox.y + bbox.h / 2) * k
      wrap.setAttribute('transform', `translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${k.toFixed(3)})`)
    }
    // Panels slide/fade in, so their rect is still mid-animation on the first
    // frame. Fit immediately for responsiveness, then again once they settle.
    const raf = requestAnimationFrame(fit)
    const settle = window.setTimeout(fit, 480)
    window.addEventListener('resize', fit)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(settle)
      window.removeEventListener('resize', fit)
    }
  }, [fitKey, bbox, size])

  const [tip, setTip] = useState<Tip | null>(null)

  // Arrival draw-in: stroke each province outline in, staggered, then fade the fill up.
  const unitsGroupRef = useRef<SVGGElement | null>(null)
  const arrivedRef = useRef(false)
  useEffect(() => {
    if (arrivedRef.current || reduced) return
    const g = unitsGroupRef.current
    if (!g) return
    arrivedRef.current = true
    const paths = Array.from(g.querySelectorAll<SVGPathElement>('path'))
    paths.forEach((p, i) => {
      const len = p.getTotalLength?.() ?? 0
      if (!len) return
      // target opacity lives on the SVG attribute (React-rendered), not inline style
      const targetOpacity = p.getAttribute('fill-opacity') ?? '0.3'
      p.style.strokeDasharray = String(len)
      p.style.strokeDashoffset = String(len)
      p.style.fillOpacity = '0'
      const delay = 380 + (i % 26) * 26
      window.setTimeout(() => {
        p.style.transition = 'stroke-dashoffset 1.1s ease-out, fill-opacity .9s ease-out'
        p.style.strokeDashoffset = '0'
        p.style.fillOpacity = targetOpacity
      }, delay)
      window.setTimeout(() => {
        // hand styling back to the attribute + hover CSS
        p.style.strokeDasharray = ''
        p.style.strokeDashoffset = ''
        p.style.fillOpacity = ''
        p.style.transition = ''
      }, 2200)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div ref={stageRef} className="absolute inset-0">
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${size.w} ${size.h}`}
        style={{ display: 'block', position: 'relative', zIndex: 1 }}
      >
        <FleuveDefs />

        {/* every map layer lives in mapWrap, which fitMap scales/translates so
            the country always sits in the space the panels leave free */}
        <g id="mapWrap" ref={mapWrapRef}>

        {/* landBack: the country as opaque land on the living river below */}
        <path d={landPath} fill="#0A211C" stroke="none" />
        <path d={landPath} fill="url(#kuba)" stroke="none" opacity={0.85} />

        {/* provinces & territoires */}
        <g ref={unitsGroupRef} style={{ pointerEvents: ghost ? 'none' : 'auto' }}>
          {features.map((f) => {
            const pcode = f.properties.p
            const u = data.byPcode.get(pcode)
            if (!u) return null
            const st = styleFor(pcode)
            const isSel = pcode === selectedPcode
            return (
              <path
                key={pcode}
                className="fl-unit"
                d={pathById.get(pcode)}
                fill={st.fill}
                fillOpacity={st.opacity}
                stroke={isSel ? '#F7D618' : 'rgba(244,235,220,.20)'}
                strokeWidth={isSel ? 1.5 : 0.65}
                tabIndex={ghost ? -1 : 0}
                role="button"
                aria-label={`${u.name}, ${u.province}`}
                onClick={() => selectUnit(pcode, false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    selectUnit(pcode, false)
                  }
                }}
                onMouseEnter={(e) =>
                  setTip({
                    x: e.clientX,
                    y: e.clientY,
                    title: u.name,
                    sub: `${u.province} · ${u.population_2024_ocha != null ? formatNumber(u.population_2024_ocha, lang === 'fr' ? 'fr-FR' : 'en-US') + ' hab.' : t('popZoneSante')}`,
                  })
                }
                onMouseMove={(e) => setTip((prev) => (prev ? { ...prev, x: e.clientX, y: e.clientY } : prev))}
                onMouseLeave={() => setTip(null)}
              />
            )
          })}
        </g>

        {showingHistory && (
          <HistoryEraLayer
            era={data.historicalEras[eraIndex]}
            proj={proj}
            reduced={reduced}
            onTip={setTip}
            t={t}
          />
        )}

        {!reduced && mode !== 'parks' && !showingHistory && <RiverFlow proj={proj} />}

        {mode === 'parks' && (
          <ParksLayer
            parks={data.sanctuaries}
            proj={proj}
            reduced={reduced}
            selectedPark={selectedPark}
            onSelect={setSelectedPark}
            onTip={setTip}
            lang={lang}
          />
        )}
        </g>
      </svg>

      <div className="grain" />

      {tip && (
        <div
          className="pointer-events-none fixed z-30 rounded-[11px] border border-[rgba(244,235,220,.14)] bg-[rgba(5,16,14,.94)] px-3 py-1.5 text-[12px] text-parch backdrop-blur"
          style={{ left: tip.x + 16, top: tip.y - 8, color: 'var(--parch)' }}
        >
          <b className="font-medium">{tip.title}</b>
          <span className="mt-px block text-[10.5px] text-[#8FB3A9]">{tip.sub}</span>
        </div>
      )}
    </div>
  )
}

function FleuveDefs() {
  return (
    <defs>
      <pattern id="kuba" width="34" height="34" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="34" height="34" fill="none" />
        <path d="M0 8h34M0 17h34M0 26h34" stroke="rgba(244,235,220,.05)" strokeWidth="1.4" />
        <path d="M8 0v34M17 0v34M26 0v34" stroke="rgba(244,235,220,.03)" strokeWidth="1.4" />
        <rect x="13" y="13" width="8" height="8" fill="rgba(200,121,65,.06)" />
      </pattern>
      <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="9" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="2.4" />
      </filter>
      <linearGradient id="riv" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#6FA8BC" stopOpacity="0" />
        <stop offset=".5" stopColor="#8CC4D6" stopOpacity=".9" />
        <stop offset="1" stopColor="#6FA8BC" stopOpacity="0" />
      </linearGradient>
    </defs>
  )
}

/** The Congo's arc — a dashed gradient stroke that flows continuously. */
function RiverFlow({ proj }: { proj: ReturnType<typeof makeProjection> }) {
  const ref = useRef<SVGPathElement | null>(null)
  const { px, py } = proj
  const d = `M${px(15.3)} ${py(-4.3)} C ${px(17.5)} ${py(-1.2)}, ${px(19.6)} ${py(2.2)}, ${px(23.2)} ${py(2.3)} C ${px(26.4)} ${py(2.4)}, ${px(27.2)} ${py(0.4)}, ${px(26.6)} ${py(-2.6)} C ${px(26.0)} ${py(-5.6)}, ${px(23.4)} ${py(-7.0)}, ${px(22.4)} ${py(-9.2)}`

  useEffect(() => {
    const path = ref.current
    if (!path) return
    const len = path.getTotalLength()
    path.style.strokeDasharray = `${len * 0.22} ${len * 0.78}`
    let offset = 0
    let raf = 0
    const flow = () => {
      offset -= 0.6
      path.style.strokeDashoffset = String(offset)
      raf = requestAnimationFrame(flow)
    }
    raf = requestAnimationFrame(flow)
    return () => cancelAnimationFrame(raf)
  }, [d])

  return (
    <path
      ref={ref}
      d={d}
      fill="none"
      stroke="url(#riv)"
      strokeWidth={2.6}
      strokeLinecap="round"
      opacity={0.5}
      filter="url(#soft)"
    />
  )
}

interface HistoryEraLayerProps {
  era: import('../data/useDrcData').HistoricalEra
  proj: ReturnType<typeof makeProjection>
  reduced: boolean
  onTip: (t: Tip | null) => void
  t: (k: 'histModernProvinces') => string
}

/** The selected era's provinces, staggered in with gold strokes. */
function HistoryEraLayer({ era, proj, reduced, onTip, t }: HistoryEraLayerProps) {
  const ERA_PALETTE = ['#B4653C', '#3F7F6E', '#8A6E3C', '#4A6E8A', '#7A4A62', '#5C7A46', '#A8794B', '#3E6B72', '#6B5A82']
  return (
    <g>
      {era.fc.features.map((f, i) => {
        const props = f.properties as { name: string; modern: string[] }
        const sub = `${props.modern.length} ${t('histModernProvinces')}`
        return (
          <path
            key={`${era.key}-${props.name}`}
            className="fl-era"
            d={proj.d(f.geometry)}
            tabIndex={0}
            role="img"
            aria-label={`${props.name} — ${sub}`}
            fill={ERA_PALETTE[i % ERA_PALETTE.length]}
            fillOpacity={0.62}
            stroke="#F7D618"
            strokeWidth={1.4}
            style={{
              cursor: 'pointer',
              opacity: reduced ? 1 : 0,
              animation: reduced ? undefined : `fl-rise .55s ease-out ${i * 0.045}s forwards`,
            }}
            onMouseEnter={(e) => onTip({ x: e.clientX, y: e.clientY, title: props.name, sub })}
            onMouseMove={(e) => onTip({ x: e.clientX, y: e.clientY, title: props.name, sub })}
            onMouseLeave={() => onTip(null)}
          />
        )
      })}
    </g>
  )
}

interface ParksLayerProps {
  parks: Park[]
  proj: ReturnType<typeof makeProjection>
  reduced: boolean
  selectedPark: string | null
  onSelect: (id: string) => void
  onTip: (t: Tip | null) => void
  lang: 'fr' | 'en'
}

/** Glow-filtered protected-area boundaries + pulsing centroid markers. */
function ParksLayer({ parks, proj, reduced, selectedPark, onSelect, onTip, lang }: ParksLayerProps) {
  return (
    <g>
      {parks.map((pk, i) => {
        if (!pk.geometry) return null
        const on = selectedPark === pk.id
        return (
          <path
            key={pk.id}
            className="fl-park"
            d={proj.d(pk.geometry)}
            tabIndex={0}
            role="button"
            aria-label={lang === 'en' ? pk.name_en : pk.name}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelect(pk.id)
              }
            }}
            fill="#47C98A"
            fillOpacity={on ? 0.5 : selectedPark ? 0.12 : 0.18}
            stroke="#7BE8B0"
            strokeWidth={on ? 2.4 : 1.3}
            filter="url(#glow)"
            style={{
              cursor: 'pointer',
              opacity: reduced ? 1 : 0,
              animation: reduced ? undefined : `fl-rise .7s ease-out ${i * 0.085}s forwards`,
            }}
            onClick={() => onSelect(pk.id)}
            onMouseEnter={(e) =>
              onTip({
                x: e.clientX,
                y: e.clientY,
                title: lang === 'en' ? pk.name_en : pk.name,
                sub: `${pk.area_km2.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US')} km² · ${pk.established}`,
              })
            }
            onMouseMove={(e) => onTip({ x: e.clientX, y: e.clientY, title: lang === 'en' ? pk.name_en : pk.name, sub: `${pk.area_km2.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US')} km² · ${pk.established}` })}
            onMouseLeave={() => onTip(null)}
          />
        )
      })}
      {!reduced &&
        parks.map((pk, i) =>
          pk.centroid ? (
            <circle key={`c-${pk.id}`} cx={proj.px(pk.centroid[1])} cy={proj.py(pk.centroid[0])} r={3.4} fill="#BFF5D8" style={{ pointerEvents: 'none' }}>
              <animate attributeName="r" values="3.4;7;3.4" dur="2.6s" begin={`${i * 0.25}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" values=".95;.25;.95" dur="2.6s" begin={`${i * 0.25}s`} repeatCount="indefinite" />
            </circle>
          ) : null,
        )}
    </g>
  )
}
