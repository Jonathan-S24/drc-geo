import type { Park } from '../../types'
import { useLanguage } from '../../i18n/LanguageContext'

interface RailProps {
  parks: Park[]
  selectedPark: string | null
  onSelect: (id: string) => void
}

/** Bottom card rail of protected areas (horizontal snap-scroll on mobile). */
export function SanctuairesRail({ parks, selectedPark, onSelect }: RailProps) {
  const { t, lang } = useLanguage()
  const fmt = (n: number) => n.toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-US')

  return (
    <div className="fl-rail dark-scroll fl-rise">
      {parks.map((p) => {
        const shortName = (lang === 'en' ? p.name_en : p.name)
          .replace('Parc national des ', '')
          .replace('Parc national de la ', '')
          .replace('Parc national du ', '')
          .replace('Parc national ', '')
          .replace('Réserve de faune ', '')
          .replace('National Park', '')
          .trim()
        return (
          <button
            key={p.id}
            type="button"
            className={`fl-pcard${selectedPark === p.id ? ' sel' : ''}`}
            onClick={() => onSelect(p.id)}
          >
            <div className="fl-ph">
              {p.image && <img src={p.image} alt="" loading="lazy" crossOrigin="anonymous" />}
              <div className="fl-ph-g" />
              {p.danger_since ? (
                <span className="fl-seal dg">{t('parkInPeril')}</span>
              ) : p.unesco_year ? (
                <span className="fl-seal un">
                  {t('parkUnesco')} {p.unesco_year}
                </span>
              ) : null}
            </div>
            <div className="fl-pb">
              <h3 className="font-disp">{shortName}</h3>
              <div className="fl-tl">{lang === 'en' ? p.tagline_en : p.tagline_fr}</div>
              <div className="fl-mt">
                <span>
                  <b>{fmt(p.area_km2)}</b> km²
                </span>
                <span>·</span>
                <span>{p.established}</span>
                <span>·</span>
                <span>
                  <b>{p.species.length}</b> {t('parkSpecies')}
                </span>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
