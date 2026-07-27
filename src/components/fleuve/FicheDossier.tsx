import { useState } from 'react'
import type { DrcData } from '../../data/useDrcData'
import type { Park, TerritoryUnit } from '../../types'
import { useLanguage } from '../../i18n/LanguageContext'
import { useCountUp } from '../../theme/useCountUp'
import { provinceFor } from '../../theme/fleuve'
import { KubaBar } from './KubaBar'
import { TrustLinks } from '../TrustLinks'

interface FicheDossierProps {
  data: DrcData
  unit: TerritoryUnit
  onClose: () => void
}

export function FicheDossier({ data, unit, onClose }: FicheDossierProps) {
  const { t, lang } = useLanguage()
  const locale = lang === 'fr' ? 'fr-FR' : 'en-US'
  const media = data.media.get(unit.pcode)
  const province = provinceFor(data, unit.province)
  const isEmblem = media?.image_scope === 'national-symbol'
  const [emblemMode, setEmblemMode] = useState(isEmblem)

  const parksHere = data.sanctuaries.filter(
    (p) => p.territoires?.includes(unit.name) || p.provinces?.includes(unit.province),
  )
  const zones = (data.healthZonesByTerritory.get(unit.pcode) ?? [])
    .slice()
    .sort((a, b) => b.population_2024 - a.population_2024)

  const area = useCountUp(unit.area_km2_codab ?? null, locale)
  const popValue = unit.population_2024_ocha ?? unit.population_2024_zone_sante ?? null
  const pop = useCountUp(popValue, locale)
  const popApprox = unit.population_2024_ocha == null && unit.population_2024_zone_sante != null
  const popSub =
    unit.population_2024_ocha != null
      ? 'OCHA 2024'
      : unit.population_2024_zone_sante != null
        ? t('popZoneSante') + ' · OCHA 2024'
        : null

  return (
    <>
      <button className="fl-close" onClick={onClose} aria-label={t('close2')}>
        ✕
      </button>
      <div className={`fl-hero${emblemMode ? ' emblem' : ''}`}>
        {media?.image && (
          <img
            src={emblemMode ? data.nationalSymbolImage ?? media.image : media.image}
            alt={unit.name}
            crossOrigin="anonymous"
            onError={(e) => {
              if (!emblemMode && data.nationalSymbolImage) {
                setEmblemMode(true)
                ;(e.target as HTMLImageElement).src = data.nationalSymbolImage
              }
            }}
          />
        )}
        {!media?.image && data.nationalSymbolImage && (
          <img src={data.nationalSymbolImage} alt={unit.name} crossOrigin="anonymous" onLoad={() => setEmblemMode(true)} />
        )}
        <div className="fl-shade" />
        {media?.image_credit && <div className="fl-cred">{media.image_credit}</div>}
        <div className="fl-kicker">
          <em>{unit.type === 'ville' ? t('villeLabel') : t('territoireLabel')}</em>
          <h2 className="font-disp">{unit.name}</h2>
        </div>
      </div>

      <div className="fl-body thin-scroll">
        <div className="fl-tags">
          <span className="fl-tag cop">{unit.province}</span>
          {province?.capital && !province.capital.startsWith('(') && (
            <span className="fl-tag">
              {t('chefLieu')} {province.capital}
            </span>
          )}
        </div>

        <div className="fl-stats">
          <div className="fl-stat">
            <em>{t('ficheArea')}</em>
            <b>
              {area}
              <i>km²</i>
            </b>
            <span>UN COD-AB</span>
          </div>
          <div className="fl-stat">
            <em>{t('fichePopulation')}</em>
            <b>
              {popApprox && popValue != null ? '≈ ' : ''}
              {pop}
            </b>
            {popSub ? <span>{popSub}</span> : unit.population_note ? <span>{unit.population_note}</span> : null}
          </div>
        </div>

        <KubaBar />

        {unit.languages.length > 0 && (
          <Section title={t('languages')}>
            <div className="fl-chips">
              {unit.languages.slice(0, 5).map((l) => (
                <span key={l} className="fl-chip">
                  {l}
                </span>
              ))}
            </div>
          </Section>
        )}
        {unit.main_activities.length > 0 && (
          <Section title={t('mainActivities')}>
            <div className="fl-chips">
              {unit.main_activities.slice(0, 6).map((a) => (
                <span key={a} className="fl-chip">
                  {a}
                </span>
              ))}
            </div>
          </Section>
        )}
        {unit.economy_note && (
          <Section title={t('economy')}>
            <p>{unit.economy_note}</p>
          </Section>
        )}
        {media?.facts?.length ? (
          <Section title={t('ficheKnow')}>
            {media.facts.map((f, i) => (
              <p key={i} style={{ marginBottom: 7 }}>
                {f.icon ?? '•'} {lang === 'fr' ? f.fr : f.en}
              </p>
            ))}
          </Section>
        ) : null}
        {zones.length > 0 && (
          <Section title={`${t('santeZonesIn')} · ${zones.length}`}>
            {zones.slice(0, 8).map((z) => (
              <div key={z.pcode_zs} className="fl-zone">
                <b>{z.zone}</b>
                <em>{z.population_2024.toLocaleString(locale)}</em>
              </div>
            ))}
            {zones.length > 8 && (
              <p className="fl-zone-more">
                + {zones.length - 8} {t('santeMore')}
              </p>
            )}
          </Section>
        )}
        {parksHere.length > 0 && (
          <Section title={t('ficheProtected')}>
            <div className="fl-chips">
              {parksHere.map((p: Park) => (
                <span key={p.id} className="fl-chip leaf">
                  {lang === 'en' ? p.name_en : p.name}
                </span>
              ))}
            </div>
          </Section>
        )}
        {unit.security_note_2026 && (
          <Section title={t('security2026')}>
            <p>{unit.security_note_2026}</p>
          </Section>
        )}

        <Section title={t('ficheSource')}>
          <p style={{ fontSize: 11.5, color: 'var(--ink-2)' }}>{t('ficheSourceLine')}</p>
        </Section>

        <TrustLinks placeName={unit.name} pcode={unit.pcode} media={media} />
      </div>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="fl-sec">
      <h5>{title}</h5>
      {children}
    </div>
  )
}
