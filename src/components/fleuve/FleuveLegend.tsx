import type { DrcData } from '../../data/useDrcData'
import { useLanguage } from '../../i18n/LanguageContext'
import { useLayer } from '../../state/LayerContext'
import { DRC_AREA_KM2 } from '../../theme/fleuve'
import { ERAS, ERA_NAMES_EN } from '../../theme/eras'
import { SANTE_BUCKETS, SANTE_RAMP } from '../FleuveMap'

interface LegendProps {
  mode: 'parks' | 'sante' | 'histoire'
  data: DrcData
  onClose: () => void
}

/** Bottom-right legend — switches content by map mode. Dismissable. */
export function FleuveLegend({ mode, data, onClose }: LegendProps) {
  const { t, lang } = useLanguage()
  const fmt = (n: number) => n.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US')

  const close = (
    <button className="fl-lclose" onClick={onClose} aria-label={t('legendClose')}>
      ✕
    </button>
  )

  if (mode === 'histoire') return <HistLegend data={data} close={close} />

  if (mode === 'parks') {
    const parks = data.sanctuaries
    const un = parks.filter((p) => p.unesco_year).length
    const peril = parks.filter((p) => p.danger_since).length
    const total = parks.reduce((s, p) => s + p.area_km2, 0)
    return (
      <div className="fl-legend fl-rise">
        {close}
        <h6>{t('modeParks')}</h6>
        <div className="fl-lr">
          <span className="fl-sw" style={{ background: 'rgba(71,201,138,.45)', border: '1px solid #7BE8B0' }} />
          {t('legendParkReserve')}
        </div>
        <div className="fl-lr">
          <span className="fl-sw" style={{ background: 'rgba(228,180,76,.9)' }} />
          {t('legendUnescoSites')} · {un}
        </div>
        <div className="fl-lr">
          <span className="fl-sw" style={{ background: 'rgba(217,99,63,.92)' }} />
          {t('legendInPeril')} · {peril}
        </div>
        <div className="fl-lr" style={{ marginTop: 9, color: 'var(--parch)' }}>
          <b className="font-disp" style={{ fontSize: 16 }}>
            {fmt(total)} km²
          </b>
        </div>
        <div className="fl-lr" style={{ marginTop: -4 }}>
          {t('legendOfTerritory')} {((total / DRC_AREA_KM2) * 100).toFixed(1)}% {t('legendOfTerritorySuffix')}
        </div>
        <div className="fl-foot">
          {t('legendOsmCredit')}
          <br />
          {t('legendStatusCredit')}
        </div>
      </div>
    )
  }

  // health zones
  const total = [...data.healthZonesByTerritory.values()].reduce((s, arr) => s + arr.length, 0)
  return (
    <div className="fl-legend fl-rise">
      {close}
      <h6>{t('santeLegendTitle')}</h6>
      {SANTE_BUCKETS.map((label, i) => (
        <div key={label} className="fl-lr">
          <span className="fl-sw" style={{ background: SANTE_RAMP.color, opacity: SANTE_RAMP.steps[i] + 0.12 }} />
          {label} {t('santeLegendScale')}
        </div>
      ))}
      <div className="fl-lr" style={{ marginTop: 9, color: 'var(--parch)' }}>
        <b className="font-disp" style={{ fontSize: 16 }}>
          {fmt(total || 519)}
        </b>
        <span style={{ fontSize: 11 }}>{t('santeLegendTitle').toLowerCase()}</span>
      </div>
      <div className="fl-foot">{t('santeLegendCredit')}</div>
    </div>
  )
}

/** One clickable row per era; selecting a row drives the timeline (and vice versa). */
function HistLegend({ data, close }: { data: DrcData; close: React.ReactNode }) {
  const { t, lang } = useLanguage()
  const { eraIndex, setEraIndex } = useLayer()
  const active = Math.min(eraIndex, ERAS.length - 1)
  const era = ERAS[active]
  const eraName = lang === 'en' ? ERA_NAMES_EN[era.name] ?? era.name : era.name
  void data

  return (
    <div className="fl-legend fl-rise">
      {close}
      <h6>{t('histLegendTitle')}</h6>
      {ERAS.map((e, i) => (
        <button
          key={e.year}
          className={`fl-era${i === active ? ' on' : ''}`}
          onClick={() => setEraIndex(i)}
          aria-pressed={i === active}
        >
          <span className="fl-sw" style={{ background: e.swatch }} />
          <b>{e.year}</b>
          <em>
            {e.count.replace(' provinces', '')} {t('histProvAbbr')}
          </em>
        </button>
      ))}
      <div className="fl-lr" style={{ marginTop: 8, fontSize: 10.5, lineHeight: 1.45, color: '#7FA79D' }}>
        {eraName} · {era.period}
      </div>
      <div className="fl-foot">{t('histLegendFoot')}</div>
    </div>
  )
}
