import { useEffect, useRef, useState } from 'react'
import type { DrcData } from '../../data/useDrcData'
import { useAppState } from '../../state/AppStateContext'
import { useLayer, type MapMode } from '../../state/LayerContext'
import { useLanguage } from '../../i18n/LanguageContext'
import { buildFleuveColors } from '../../theme/fleuve'
import { useReducedMotion } from '../../theme/useReducedMotion'
import { matches } from '../../utils/match'

/**
 * The mark: a telescope on a tripod whose legs stand on the Congo's curves,
 * its flared objective aimed at the flag's yellow star, inside a copper ring.
 * Copied verbatim from DRCGeo_Fleuve_prototype.html — the coordinates are
 * geometrically aligned, so don't "tidy" them.
 */
export function Brand() {
  // SMIL <animate> ignores CSS animation properties, so the reduced-motion
  // preference has to gate it here rather than in the stylesheet.
  const reduced = useReducedMotion()
  return (
    <div className="fl-brand">
      <svg className="fl-mark" viewBox="0 0 40 40" fill="none" role="img" aria-label="DRC.Geo">
        <circle cx="20" cy="20" r="18.5" stroke="#C87941" strokeWidth="1.2" opacity=".55" />
        <path
          d="M6.5 29.8Q13 33.2 20 30.2T33.5 27.8"
          stroke="#6FA8BC"
          strokeWidth="2.1"
          strokeLinecap="round"
          opacity=".9"
        />
        <path
          d="M8 32.6Q14 35.2 20 32.8T31.5 30.6"
          stroke="#6FA8BC"
          strokeWidth="1.1"
          strokeLinecap="round"
          opacity=".4"
        />
        <g stroke="#F0E6D6" strokeLinecap="round" fill="none">
          <path d="M18.5 17.9V21.2" strokeWidth="1.9" />
          <path d="M18.5 21.2 13.8 31.2M18.5 21.2 19.2 30.6M18.5 21.2 23.2 30" strokeWidth="1.6" />
          <path d="M15.9 26.5 21.6 25.6" strokeWidth="1" opacity=".75" />
        </g>
        <path d="M9.51 21.25 11.49 23.75 26.74 13.19 28.07 12.77 23.97 7.61 23.26 8.81Z" fill="#F0E6D6" />
        <path d="M19.7 18.01 16.96 14.57" stroke="#C87941" strokeWidth="1.2" opacity=".9" />
        <path d="M8.93 23.74 10.5 22.5" stroke="#C87941" strokeWidth="3.2" strokeLinecap="round" />
        <path
          d="M29.31 5.28 29.88 6.79 31.5 6.87 30.23 7.88 30.66 9.44 29.31 8.55
               27.96 9.44 28.39 7.88 27.12 6.87 28.74 6.79Z"
          fill="#E4B44C"
        >
          {!reduced && <animate attributeName="opacity" values="1;.6;1" dur="3.4s" repeatCount="indefinite" />}
        </path>
      </svg>
      <h1 className="font-disp">
        DRC<span style={{ color: 'var(--copper)' }}>.</span>Geo
      </h1>
    </div>
  )
}

export function Breadcrumb({ data }: { data: DrcData }) {
  const { selection } = useAppState()
  const unit = selection.view === 'unit' ? data.byPcode.get(selection.pcode) : null
  return (
    <div className="fl-crumb">
      <b>RDC</b>
      {unit ? (
        <>
          <span>·</span>
          {unit.province}
          <span>·</span>
          <b>{unit.name}</b>
        </>
      ) : (
        <>
          <span>·</span>26 provinces<span>·</span>145 territoires
        </>
      )}
    </div>
  )
}

export function LangToggle() {
  const { lang, toggleLang } = useLanguage()
  return (
    <button className="fl-pill" onClick={toggleLang} aria-label="Language">
      {lang === 'fr' ? 'FR' : 'EN'}
    </button>
  )
}

interface Result {
  key: string
  kind: 'unit' | 'park'
  name: string
  type: string
  color: string
  onPick: () => void
}

export function FleuveSearch({ data }: { data: DrcData }) {
  const { selectUnit } = useAppState()
  const { setMode, setSelectedPark } = useLayer()
  const { t, lang } = useLanguage()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const colors = buildFleuveColors(data.provinces.map((p) => p.name))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const results: Result[] = []
  if (q.trim().length >= 2) {
    for (const p of data.sanctuaries) {
      if (matches(p.name, q) || matches(p.name_en, q)) {
        results.push({
          key: `park:${p.id}`,
          kind: 'park',
          name: lang === 'en' ? p.name_en : p.name,
          type: 'parc',
          color: 'var(--leaf)',
          onPick: () => {
            setMode('parks')
            setSelectedPark(p.id)
          },
        })
      }
      if (results.length >= 3) break
    }
    for (const u of data.units) {
      if (matches(u.name, q) || matches(u.province, q)) {
        results.push({
          key: `u:${u.pcode}`,
          kind: 'unit',
          name: u.name,
          type: u.type === 'ville' ? t('villeLabel') : t('territoireLabel'),
          color: colors.get(u.province) ?? '#888',
          onPick: () => {
            setMode('provinces')
            selectUnit(u.pcode, false)
          },
        })
      }
      if (results.length >= 12) break
    }
  }

  const pick = (r: Result) => {
    r.onPick()
    setQ('')
    setOpen(false)
    inputRef.current?.blur()
  }

  return (
    <div className="fl-search">
      <svg className="fl-search-ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8FB3A9" strokeWidth="2.4">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </svg>
      <input
        ref={inputRef}
        value={q}
        placeholder={t('searchPlaceholderFleuve')}
        autoComplete="off"
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
          setActive(0)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActive((a) => Math.min(a + 1, results.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((a) => Math.max(a - 1, 0))
          } else if (e.key === 'Enter' && results[active]) {
            pick(results[active])
          } else if (e.key === 'Escape') {
            setQ('')
            setOpen(false)
          }
        }}
      />
      {open && results.length > 0 && (
        <div className="fl-results">
          {results.map((r, i) => (
            <div key={r.key} className={i === active ? 'on' : ''} onMouseDown={() => pick(r)} onMouseEnter={() => setActive(i)}>
              <i style={{ background: r.color }} />
              {r.name}
              <em>{r.type}</em>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const MODES: { key: MapMode; labelKey: 'modeProvinces' | 'modeParks' | 'modeSante' | 'modeHistoire'; badge: string; group: 'layers' | 'stories' }[] = [
  { key: 'provinces', labelKey: 'modeProvinces', badge: '215', group: 'layers' },
  { key: 'parks', labelKey: 'modeParks', badge: '9', group: 'layers' },
  { key: 'sante', labelKey: 'modeSante', badge: '519', group: 'layers' },
  { key: 'histoire', labelKey: 'modeHistoire', badge: '1919→', group: 'stories' },
]

export function OptionsPanel() {
  const { mode, setMode, selectedPark, setSelectedPark } = useLayer()
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)

  // The panel and the park dossier share the bottom-left column, so the two are
  // mutually exclusive — whichever opens dismisses the other, and nothing
  // ever overlaps in any state.
  const toggle = () => {
    setOpen((o) => {
      if (!o) setSelectedPark(null)
      return !o
    })
  }
  useEffect(() => {
    if (selectedPark) setOpen(false)
  }, [selectedPark])

  return (
    <>
      {open && (
        <div className="fl-optpanel fl-rise" role="menu">
          <h4>{t('layersHeading')}</h4>
          {MODES.filter((m) => m.group === 'layers').map((m) => (
            <OptRow key={m.key} m={m} active={mode === m.key} onPick={() => setMode(m.key)} label={t(m.labelKey)} />
          ))}
          <h4>{t('storiesHeading')}</h4>
          {MODES.filter((m) => m.group === 'stories').map((m) => (
            <OptRow key={m.key} m={m} active={mode === m.key} onPick={() => setMode(m.key)} label={t(m.labelKey)} />
          ))}
        </div>
      )}
      <button className={`fl-pill fl-optbtn${mode !== 'provinces' ? ' hot' : ''}`} onClick={toggle}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M2 12h4M18 12h4M12 2v4M12 18v4" />
        </svg>
        Options d'affichage
      </button>
    </>
  )
}

function OptRow({
  m,
  active,
  onPick,
  label,
}: {
  m: { badge: string }
  active: boolean
  onPick: () => void
  label: string
}) {
  return (
    <button className={`fl-opt${active ? ' on' : ''}`} onClick={onPick} role="menuitemradio" aria-checked={active}>
      <span className="fl-dot" />
      {label}
      <small>{m.badge}</small>
    </button>
  )
}
