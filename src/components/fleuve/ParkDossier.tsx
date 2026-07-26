import type { Park } from '../../types'
import { useLanguage } from '../../i18n/LanguageContext'
import { useCountUp } from '../../theme/useCountUp'
import { DRC_AREA_KM2, speciesStatusKey } from '../../theme/fleuve'
import { KubaBar } from './KubaBar'

export function ParkDossier({ park, onClose }: { park: Park; onClose: () => void }) {
  const { t, lang } = useLanguage()
  const locale = lang === 'fr' ? 'fr-FR' : 'en-US'
  const area = useCountUp(park.area_km2, locale)
  const name = lang === 'en' ? park.name_en : park.name
  const summary = lang === 'en' ? park.summary_en : park.summary_fr
  const features = (lang === 'en' && park.features_en) || park.features_fr
  const threats = (lang === 'en' && park.threats_en) || park.threats_fr
  const fact = lang === 'en' ? park.fact_en : park.fact_fr

  return (
    <>
      <button className="fl-close" onClick={onClose} aria-label={t('close2')}>
        ✕
      </button>
      <div className="fl-hero" style={{ height: 150 }}>
        {park.image && <img src={park.image} alt={name} crossOrigin="anonymous" />}
        <div className="fl-shade" />
        <div className="fl-kicker">
          <h2 className="font-disp" style={{ fontSize: 22 }}>
            {name}
          </h2>
        </div>
      </div>
      <div className="fl-body thin-scroll" style={{ paddingTop: 15 }}>
        <div className="fl-tags">
          {park.unesco_year && (
            <span className="fl-tag cop">
              {t('parkUnesco')} {park.unesco_year}
            </span>
          )}
          {park.danger_since && (
            <span className="fl-tag" style={{ background: 'rgba(217,99,63,.16)', color: '#8A3A1D' }}>
              {t('parkInPerilSince')} {park.danger_since}
            </span>
          )}
          {park.danger_period && (
            <span className="fl-tag" style={{ background: 'rgba(71,201,138,.16)', color: '#1B5B3F' }}>
              {t('parkSaved')} — {park.danger_period}
            </span>
          )}
          <span className="fl-tag">
            {t('parkIucn')} {park.iucn_category}
          </span>
        </div>

        <div className="fl-stats">
          <div className="fl-stat">
            <em>{t('ficheArea')}</em>
            <b>
              {area}
              <i>km²</i>
            </b>
            <span>
              {((park.area_km2 / DRC_AREA_KM2) * 100).toFixed(1)}% {t('parkOfCountry')}
            </span>
          </div>
          <div className="fl-stat">
            <em>{t('parkCreated')}</em>
            <b>{park.established}</b>
            <span>
              {2026 - park.established} {t('parkYears')}
            </span>
          </div>
        </div>

        <div className="fl-sec">
          <p>{summary}</p>
        </div>

        <KubaBar />

        <div className="fl-sec">
          <h5>{t('parkSpeciesFlagship')}</h5>
          {park.species.map((s) => (
            <div key={s.fr} className="fl-sp">
              <b>{lang === 'en' ? s.en : s.fr}</b>
              <em className={`fl-st-${speciesStatusKey(s.status)}`}>{s.status}</em>
            </div>
          ))}
        </div>

        <div className="fl-sec">
          <h5>{t('parkToSee')}</h5>
          <div className="fl-chips">
            {features.map((f) => (
              <span key={f} className="fl-chip leaf">
                {f}
              </span>
            ))}
          </div>
        </div>

        <div className="fl-sec">
          <h5>{t('parkThreats')}</h5>
          <div className="fl-thr">
            {threats.map((th) => (
              <span key={th}>{th}</span>
            ))}
          </div>
        </div>

        <div className="fl-sec">
          <h5>{t('parkProvinces')}</h5>
          <div className="fl-chips">
            {park.provinces.map((p) => (
              <span key={p} className="fl-chip">
                {p}
              </span>
            ))}
          </div>
        </div>

        <div className="fl-sec">
          <h5>{t('parkDidYouKnow')}</h5>
          <p className="font-disp" style={{ fontSize: 14.5 }}>
            {fact}
          </p>
        </div>
      </div>
    </>
  )
}
