import type { DrcData } from '../../data/useDrcData'
import { useLanguage } from '../../i18n/LanguageContext'
import { DRC_AREA_KM2 } from '../../theme/fleuve'

/** Bottom-right legend — switches content by map mode. */
export function FleuveLegend({ mode, data }: { mode: 'parks' | 'density'; data: DrcData }) {
  const { t, lang } = useLanguage()
  const fmt = (n: number) => n.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US')

  if (mode === 'parks') {
    const parks = data.sanctuaries
    const un = parks.filter((p) => p.unesco_year).length
    const peril = parks.filter((p) => p.danger_since).length
    const total = parks.reduce((s, p) => s + p.area_km2, 0)
    return (
      <div className="fl-legend fl-rise">
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

  // density
  const buckets = [0.08, 0.25, 0.45, 0.65, 0.9]
  const labels = ['< 10', '10–30', '30–80', '80–300', '> 300']
  return (
    <div className="fl-legend fl-rise">
      <h6>{t('densityLegendTitle')}</h6>
      {buckets.map((o, i) => (
        <div key={i} className="fl-lr">
          <span className="fl-sw" style={{ background: `rgba(200,121,65,${o})` }} />
          {labels[i]} hab/km²
        </div>
      ))}
      <div className="fl-foot">{t('densityLegendCredit')}</div>
    </div>
  )
}
