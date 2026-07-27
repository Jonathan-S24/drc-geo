import type { DrcData } from '../../data/useDrcData'
import { useLayer } from '../../state/LayerContext'
import { useLanguage } from '../../i18n/LanguageContext'
import { AnthemPlayer } from '../AnthemPlayer'

/**
 * Histoire & hymnes. Five stops — the four historical eras from
 * historical_provinces.json plus "2015", which restores the modern map.
 * Each stop carries the country's name of the period and its anthem.
 */
export function HistoirePanel({ data }: { data: DrcData }) {
  const { lang, t } = useLanguage()
  const { eraIndex, setEraIndex } = useLayer()

  const eras = data.historicalEras
  if (!eras.length) return null

  // stops: 1919, 1947, 1966, 1988 (historical) + 2015 (modern map)
  const stops = [...eras.map((e) => ({ key: e.key, label: e.label })), { key: '2015', label: '2015 — 26 provinces' }]
  const idx = Math.min(eraIndex, stops.length - 1)
  const stop = stops[idx]

  // naming_eras.map_era references the era label(s) this period spans
  const naming = data.anthems?.namingEras.find((ne) => ne.map_era.includes(stop.key))
  const countryName = naming ? (lang === 'en' ? naming.name_en : naming.name_fr) : null
  const anthem = naming?.anthem ? data.anthems?.anthems[naming.anthem] : null
  const provinceCount = stop.label.split('—')[1]?.trim()

  return (
    <div className="fl-hist fl-rise-x">
      <div className="fl-hist-eras">
        {stops.map((s, i) => (
          <button
            key={s.key}
            className={`fl-hist-era${i === idx ? ' on' : ''}`}
            onClick={() => setEraIndex(i)}
            aria-pressed={i === idx}
          >
            {s.key}
          </button>
        ))}
      </div>
      <p className="fl-hist-name font-disp">
        {countryName ?? stop.key}
        {naming && <span> · {naming.period}</span>}
      </p>
      <p className="fl-hist-sub">{provinceCount}</p>
      {anthem ? (
        <AnthemPlayer key={`${naming?.anthem}:${stop.key}`} anthem={anthem} years={naming?.period ?? stop.key} />
      ) : (
        <p className="fl-hist-note">
          <span aria-hidden>🎵</span> {t('histNoAnthem')}
        </p>
      )}
    </div>
  )
}
