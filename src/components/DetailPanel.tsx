import type { DrcData } from '../data/useDrcData'
import { useAppState } from '../state/AppStateContext'
import { useLanguage } from '../i18n/LanguageContext'
import { formatArea, formatNumber } from '../utils/format'
import type { NumberLocale } from '../utils/format'
import { sameName } from '../utils/match'
import { PanelHeader } from './PanelHeader'
import { Section, Chips, Prose, FrenchSourceNote } from './DetailSections'
import { KpiCard } from './KpiCard'

interface DetailPanelProps {
  data: DrcData
  pcode: string
}

export function DetailPanel({ data, pcode }: DetailPanelProps) {
  const { clearSelection } = useAppState()
  const { t, lang } = useLanguage()
  const locale: NumberLocale = lang === 'fr' ? 'fr-FR' : 'en-US'

  const unit = data.byPcode.get(pcode)
  if (!unit) return null
  const province = data.provinces.find((p) => sameName(p.name, unit.province))

  return (
    <div className="flex h-full flex-col">
      <PanelHeader
        title={unit.name}
        tag={unit.type === 'ville' ? t('villeLabel') : t('territoireLabel')}
        onClose={clearSelection}
        compareItem={{ kind: 'unit', pcode: unit.pcode }}
        subtitle={
          <>
            {t('province')} : {unit.province}
            {province ? ` · ${t('provincialCapital')} : ${province.capital}` : ''}
          </>
        }
      />

      <div className="thin-scroll flex-1 overflow-y-auto">
        {!unit.has_caid_fiche && (
          <div className="m-4 rounded-md bg-accent/15 px-3 py-2 text-[12px] text-ink/80">{t('noCaidFiche')}</div>
        )}

        <div className="grid grid-cols-2 gap-2 p-4">
          <KpiCard
            label={t('area')}
            value={formatArea(unit.area_km2_codab, locale)}
            sub={unit.area_km2_caid ? `CAID: ${formatArea(unit.area_km2_caid, locale)}` : undefined}
          />
          <KpiCard
            label={t('population')}
            value={formatNumber(unit.population_2024_ocha, locale)}
            sub={unit.population_caid ? `CAID: ${formatNumber(unit.population_caid, locale)}` : undefined}
          />
        </div>

        <div className="px-4 pb-4">
          <Section title={t('languages')}>
            <Chips items={unit.languages} />
          </Section>
          <Section title={t('mainActivities')}>
            <Chips items={unit.main_activities} />
          </Section>
          <Section title={t('agriculturalProducts')}>
            <Chips items={unit.agricultural_products} />
            <FrenchSourceNote />
          </Section>
          <Section title={t('education')}>
            {unit.schools_primary || unit.schools_secondary ? (
              <p className="text-[13px] text-ink/90">
                {unit.schools_primary ?? '?'} {t('schoolsPrimary')} · {unit.schools_secondary ?? '?'}{' '}
                {t('schoolsSecondary')}
              </p>
            ) : (
              <p className="text-[13px] italic text-ink/40">{t('notAvailable')}</p>
            )}
          </Section>
          <Section title={t('health')}>
            <Prose text={unit.health_note} />
          </Section>
          <Section title={t('subdivisions')}>
            <Prose text={unit.subdivisions} />
            <FrenchSourceNote />
          </Section>
          <Section title={t('developmentOpportunities')}>
            <Prose text={unit.development_opportunities} />
            <FrenchSourceNote />
          </Section>
          <Section title={t('accessibilityTourism')}>
            <Prose text={unit.accessibility_tourism} />
            <FrenchSourceNote />
          </Section>
          {unit.security_note && (
            <Section title={t('securityNote')}>
              <Prose text={unit.security_note} />
              <FrenchSourceNote />
            </Section>
          )}
          {province && (
            <Section title={`${t('provincialContext')} (${unit.province})`}>
              <p className="mb-1 text-[13px] text-ink/90">
                <b>{t('resources')} :</b> {province.natural_resources}
              </p>
              <p className="mb-1 text-[13px] text-ink/90">
                <b>{t('economy')} :</b> {province.economy_specialties}
              </p>
              <p className="mb-1 text-[13px] text-ink/90">
                <b>{t('particularities')} :</b> {province.particularities}
              </p>
              <p className="text-[13px] text-ink/90">
                <b>{t('education')} :</b> {province.education}
              </p>
            </Section>
          )}
        </div>

        <div className="border-t border-line px-4 py-2.5 text-[10.5px] text-ink/50">
          {t('sourcesFooter')}
          {unit.caid_updated ? ` ${t('caveatUpdated')}: ${unit.caid_updated}.` : ''}
        </div>
      </div>
    </div>
  )
}
