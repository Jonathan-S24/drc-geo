import { useEffect, useRef, useState } from 'react'
import type { DrcData } from '../../data/useDrcData'
import { useAppState } from '../../state/AppStateContext'
import { useLayer, type MapMode } from '../../state/LayerContext'
import { useLanguage } from '../../i18n/LanguageContext'
import { buildFleuveColors } from '../../theme/fleuve'
import { matches } from '../../utils/match'

export function Brand() {
  const { t } = useLanguage()
  return (
    <div className="fl-brand">
      <svg width="38" height="38" viewBox="0 0 40 40" fill="none" aria-hidden>
        <circle cx="20" cy="20" r="18.5" stroke="#C87941" strokeWidth="1.2" opacity=".55" />
        <path d="M8 27c5-1.5 6.5-7 11-9s7.5-.5 13-5" stroke="#6FA8BC" strokeWidth="2.1" strokeLinecap="round" />
        <path d="M11 32c4.5-2 7-8.5 12-10.5" stroke="#6FA8BC" strokeWidth="1.1" strokeLinecap="round" opacity=".5" />
        <circle cx="20" cy="20" r="3.1" fill="#E4B44C" />
      </svg>
      <div>
        <h1 className="font-disp">
          DRC<span style={{ color: 'var(--copper)' }}>.</span>Geo
        </h1>
        <small>{t('tagline')}</small>
      </div>
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

const MODES: { key: MapMode; labelKey: 'modeProvinces' | 'modeParks' | 'modeDensity' | 'modeHistoire'; badge: string; group: 'layers' | 'stories' }[] = [
  { key: 'provinces', labelKey: 'modeProvinces', badge: '215', group: 'layers' },
  { key: 'parks', labelKey: 'modeParks', badge: '9', group: 'layers' },
  { key: 'density', labelKey: 'modeDensity', badge: '2024', group: 'layers' },
  { key: 'histoire', labelKey: 'modeHistoire', badge: '1919→', group: 'stories' },
]

export function OptionsPanel() {
  const { mode, setMode } = useLayer()
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)

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
      <button className={`fl-pill fl-optbtn${mode !== 'provinces' ? ' hot' : ''}`} onClick={() => setOpen((o) => !o)}>
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
