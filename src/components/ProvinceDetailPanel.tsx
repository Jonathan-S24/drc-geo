import type { DrcData } from '../data/useDrcData'
import { useAppState } from '../state/AppStateContext'
import { useLanguage } from '../i18n/LanguageContext'
import { formatArea, formatNumber } from '../utils/format'
import type { NumberLocale } from '../utils/format'
import { sameName } from '../utils/match'
import { PanelHeader } from './PanelHeader'
import { Section } from './DetailSections'
import { KpiCard } from './KpiCard'
import { PopulationBarChart } from './PopulationBarChart'
import { PlaceMediaBanner } from './PlaceMediaBanner'

interface ProvinceDetailPanelProps {
  data: DrcData
  name: string
}

export function ProvinceDetailPanel({ data, name }: ProvinceDetailPanelProps) {
  const { clearSelection, selectUnit } = useAppState()
  const { t, lang } = useLanguage()
  const locale: NumberLocale = lang === 'fr' ? 'fr-FR' : 'en-US'

  const province = data.provinces.find((p) => sameName(p.name, name))
  if (!province) return null

  const units = data.units.filter((u) => sameName(u.province, province.name))
  const territoires = units.filter((u) => u.type === 'territoire').sort((a, b) => a.name.localeCompare(b.name))
  const villes = units.filter((u) => u.type === 'ville').sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="flex h-full flex-col">
      <PanelHeader
        title={province.name}
        tag={t('provinceLabel')}
        onClose={clearSelection}
        compareItem={{ kind: 'province', name: province.name }}
        subtitle={
          <>
            {province.capital} · {territoires.length} {t('territoires').toLowerCase()}
            {villes.length ? ` · ${villes.length} ${t('villes').toLowerCase()}` : ''}
          </>
        }
      />

      <div className="thin-scroll flex-1 overflow-y-auto">
        <PlaceMediaBanner media={data.media.get(`province:${province.name}`)} />
        <div className="grid grid-cols-2 gap-2 p-4">
          <KpiCard label={t('area')} value={formatArea(province.area_km2, locale)} sub="INS 2020" />
          <KpiCard
            label={t('population')}
            value={formatNumber(province.population_2024_est, locale)}
            sub={`${t('density')} ${province.density_per_km2}/km²`}
          />
        </div>

        <div className="px-4 pb-4">
          <Section title={t('languages')}>
            <p className="mb-1 text-[12px] text-ink/60">{t('officialLanguageNote')}</p>
            <p className="text-[13px] text-ink/90">
              <b>{t('nationalLanguages')} :</b> {province.national_languages} · <b>{t('localLanguages')} :</b>{' '}
              {province.local_languages}
            </p>
          </Section>
          <Section title={t('resources')}>
            <p className="text-[13px] text-ink/90">{province.natural_resources}</p>
          </Section>
          <Section title={t('economy')}>
            <p className="text-[13px] text-ink/90">{province.economy_specialties}</p>
          </Section>
          <Section title={t('particularities')}>
            <p className="text-[13px] text-ink/90">{province.particularities}</p>
          </Section>
          <Section title={t('education')}>
            <p className="text-[13px] text-ink/90">{province.education}</p>
          </Section>

          <Section title={t('populationDistribution')}>
            <PopulationBarChart units={units} />
          </Section>

          <Section title={`${t('territoires')} (${territoires.length})`}>
            <div className="flex flex-wrap gap-1.5">
              {territoires.map((u) => (
                <button
                  key={u.pcode}
                  type="button"
                  onClick={() => selectUnit(u.pcode, true)}
                  className="rounded-full bg-app-bg px-2.5 py-1 text-[12px] text-ink/85 hover:bg-teal hover:text-white"
                >
                  {u.name}
                </button>
              ))}
            </div>
          </Section>

          {villes.length > 0 && (
            <Section title={`${t('villes')} (${villes.length})`}>
              <div className="flex flex-wrap gap-1.5">
                {villes.map((u) => (
                  <button
                    key={u.pcode}
                    type="button"
                    onClick={() => selectUnit(u.pcode, true)}
                    className="rounded-full bg-app-bg px-2.5 py-1 text-[12px] text-ink/85 hover:bg-teal hover:text-white"
                  >
                    {u.name}
                  </button>
                ))}
              </div>
            </Section>
          )}
        </div>

        <div className="border-t border-line px-4 py-2.5 text-[10.5px] text-ink/50">{t('sourcesFooter')}</div>
      </div>
    </div>
  )
}
