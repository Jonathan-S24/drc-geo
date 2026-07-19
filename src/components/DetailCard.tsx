import { useState } from 'react'
import type { Feature, Polygon } from 'geojson'
import type { DrcData } from '../data/useDrcData'
import type { PlaceMedia, Province, TerritoryUnit, UnitFeatureProperties } from '../types'
import { useAppState } from '../state/AppStateContext'
import { useLanguage } from '../i18n/LanguageContext'
import { formatArea, formatNumber, formatYearMonth, type NumberLocale } from '../utils/format'
import { sameName } from '../utils/match'
import { PROVINCE_COLORS, mix } from '../theme/palette'
import { Accordion } from './Accordion'
import { ShapeSilhouette } from './ShapeSilhouette'
import { PopulationBarChart } from './PopulationBarChart'

type UnitFeature = Feature<Polygon, UnitFeatureProperties>

interface DetailCardProps {
  data: DrcData
}

export function DetailCard({ data }: DetailCardProps) {
  const { selection } = useAppState()

  if (selection.view === 'unit') {
    const unit = data.byPcode.get(selection.pcode)
    if (!unit) return null
    return <UnitCard key={unit.pcode} data={data} unit={unit} />
  }
  if (selection.view === 'province') {
    const province = data.provinces.find((p) => sameName(p.name, selection.name))
    if (!province) return null
    return <ProvinceCard key={province.name} data={data} province={province} />
  }
  return null
}

// ---------- shared pieces ----------

function unitFeatures(data: DrcData, pcodes: string[]): UnitFeature[] {
  const feats = data.boundaries.features as UnitFeature[]
  const set = new Set(pcodes)
  return feats.filter((f) => set.has(f.properties.p))
}

function CardHero({
  name,
  color,
  media,
  features,
}: {
  name: string
  color: string
  media: PlaceMedia | undefined
  features: UnitFeature[]
}) {
  const [imageOk, setImageOk] = useState(true)
  const hasImage = Boolean(media?.image) && imageOk

  if (hasImage) {
    return (
      <div className="relative h-44 w-full shrink-0 overflow-hidden">
        <img
          src={media!.image}
          alt={name}
          className="h-full w-full object-cover"
          onError={() => setImageOk(false)}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
        <h2 className="absolute bottom-3 left-5 right-12 text-[26px] font-extrabold leading-tight text-white drop-shadow">
          {name}
        </h2>
        {media?.image_credit && (
          <span className="absolute right-2 top-2 rounded-full bg-black/45 px-2 py-0.5 text-[9px] text-white/85">
            {media.image_credit}
          </span>
        )}
      </div>
    )
  }

  // no photo: the unit's map color + its real silhouette ARE the identity
  return (
    <div
      className="relative h-44 w-full shrink-0 overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${color}, ${mix(color, '#0a3f4a', 0.35)})` }}
    >
      <ShapeSilhouette
        features={features}
        className="absolute -right-4 -top-6 h-[130%] text-white/20"
      />
      <h2 className="absolute bottom-3 left-5 right-12 text-[28px] font-extrabold leading-tight text-white drop-shadow">
        {name}
      </h2>
    </div>
  )
}

function KvRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-line/60 py-2 first:border-t-0">
      <span className="shrink-0 text-[11.5px] font-bold uppercase tracking-wide text-ink/45">{label}</span>
      <span className="text-right text-[13.5px] font-semibold text-ink">
        {value}
        {sub && <span className="block text-[10.5px] font-medium text-ink/45">{sub}</span>}
      </span>
    </div>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-teal/8 px-2.5 py-1 text-[12px] font-semibold text-ink/85">{children}</span>
  )
}

function ChipList({ items }: { items: string[] }) {
  const { t } = useLanguage()
  if (!items.length) return <p className="italic text-ink/40">{t('notAvailable')}</p>
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((x) => (
        <Chip key={x}>{x}</Chip>
      ))}
    </div>
  )
}

function Prose({ text }: { text: string | null }) {
  const { t } = useLanguage()
  return text ? <p>{text}</p> : <p className="italic text-ink/40">{t('notAvailable')}</p>
}

function FactsList({ media }: { media: PlaceMedia }) {
  const { lang } = useLanguage()
  return (
    <ul className="flex flex-col gap-2">
      {(media.facts ?? []).map((f, i) => (
        <li key={i} className="flex gap-2">
          {f.icon && <span aria-hidden>{f.icon}</span>}
          <span>{lang === 'fr' ? f.fr : f.en}</span>
        </li>
      ))}
    </ul>
  )
}

function SourcesBlock({ extra }: { extra?: string }) {
  const { t } = useLanguage()
  return (
    <div className="flex flex-col gap-1.5 text-[12px] text-ink/70">
      <p>{t('sourcesFooter')}</p>
      <p>{t('caveatDivergence')}</p>
      <p>{t('caveatGaps')}</p>
      {extra && <p>{extra}</p>}
    </div>
  )
}

function CtaPill({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mx-5 my-3 rounded-full bg-teal px-5 py-2.5 text-[13.5px] font-bold text-white shadow-md transition hover:bg-teal-light active:scale-[0.98]"
    >
      {label}
    </button>
  )
}

// ---------- unit card ----------

function UnitCard({ data, unit }: { data: DrcData; unit: TerritoryUnit }) {
  const { selectUnit } = useAppState()
  const { t, lang } = useLanguage()
  const locale: NumberLocale = lang === 'fr' ? 'fr-FR' : 'en-US'
  const media = data.media.get(unit.pcode)
  const province = data.provinces.find((p) => sameName(p.name, unit.province))
  const color = PROVINCE_COLORS.get(unit.province) ?? '#8aa'
  const firstFact = media?.facts?.[0]

  return (
    <CardShell>
      <CardHero name={unit.name} color={color} media={media} features={unitFeatures(data, [unit.pcode])} />

      <div className="flex flex-wrap items-center gap-1.5 px-5 pt-3">
        <span className="rounded-full bg-ink/8 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide text-ink/70">
          {unit.type === 'ville' ? t('villeLabel') : t('territoireLabel')}
        </span>
        <Chip>
          {unit.province}
          {province ? ` · ${t('chefLieu')} ${province.capital}` : ''}
        </Chip>
      </div>

      {firstFact && (
        <p className="px-5 pt-2.5 text-[13.5px] font-semibold leading-snug text-teal">
          {firstFact.icon && <span aria-hidden>{firstFact.icon} </span>}
          {lang === 'fr' ? firstFact.fr : firstFact.en}
        </p>
      )}

      <div className="px-5 pt-3">
        <KvRow label={t('area')} value={formatArea(unit.area_km2_codab, locale)} sub="UN COD-AB" />
        <KvRow
          label={t('population')}
          value={formatNumber(unit.population_2024_ocha, locale)}
          sub={
            unit.population_caid
              ? `OCHA · CAID: ${formatNumber(unit.population_caid, locale)}`
              : unit.population_2024_ocha == null
                ? lang === 'fr'
                  ? 'comptée dans l’entité environnante'
                  : 'counted in surrounding unit'
                : 'OCHA'
          }
        />
        <KvRow
          label={t('languages')}
          value={unit.languages.length ? unit.languages.slice(0, 3).join(', ') : '—'}
          sub={t('officialLanguageNote')}
        />
        {unit.type === 'territoire' && unit.caid_updated && (
          <KvRow label="CAID" value={unit.caid_updated} sub={t('caveatUpdated')} />
        )}
      </div>

      <CtaPill label={t('ctaViewMap')} onClick={() => selectUnit(unit.pcode, true)} />

      {unit.provenance_note && (
        <p className="mx-5 mb-3 rounded-xl bg-accent/15 px-3 py-2 text-[11.5px] text-ink/75">
          <b>{t('dataProvenance')} :</b> {unit.provenance_note}
        </p>
      )}

      <div className="mt-1">
        {media?.facts?.length ? (
          <Accordion title={t('faitsUniques')} badge={String(media.facts.length)}>
            <FactsList media={media} />
          </Accordion>
        ) : null}
        {unit.security_note_2026 && (
          <Accordion title={t('security2026')} defaultOpen>
            <p className="mb-1.5 text-[11.5px] font-bold text-teal">
              {t('securityAsOf')} {formatYearMonth(unit.security_note_2026_date ?? '2026-07', locale)} —{' '}
              {t('securitySources')}
            </p>
            <p>{unit.security_note_2026}</p>
            {unit.security_note && (
              <details className="mt-2">
                <summary className="cursor-pointer text-[12px] font-semibold text-ink/55">
                  {t('securityNoteHistorical')}
                </summary>
                <p className="mt-1 text-ink/70">{unit.security_note}</p>
              </details>
            )}
          </Accordion>
        )}
        {!unit.security_note_2026 && unit.security_note && (
          <Accordion title={t('securityNote')}>
            <Prose text={unit.security_note} />
          </Accordion>
        )}
        {unit.economy_note && (
          <Accordion title={t('economy')}>
            <Prose text={unit.economy_note} />
          </Accordion>
        )}
        {unit.main_activities.length > 0 && (
          <Accordion title={t('mainActivities')}>
            <ChipList items={unit.main_activities} />
          </Accordion>
        )}
        {unit.agricultural_products.length > 0 && (
          <Accordion title={t('agriculturalProducts')}>
            <ChipList items={unit.agricultural_products} />
          </Accordion>
        )}
        {(unit.schools_primary || unit.schools_secondary || unit.health_note) && (
          <Accordion title={`${t('education')} · ${t('health')}`}>
            {(unit.schools_primary || unit.schools_secondary) && (
              <p>
                {unit.schools_primary ?? '?'} {t('schoolsPrimary')} · {unit.schools_secondary ?? '?'}{' '}
                {t('schoolsSecondary')}
              </p>
            )}
            {unit.health_note && <p className="mt-1">{unit.health_note}</p>}
          </Accordion>
        )}
        {unit.subdivisions && (
          <Accordion title={t('subdivisions')}>
            <Prose text={unit.subdivisions} />
          </Accordion>
        )}
        {unit.development_opportunities && (
          <Accordion title={t('developmentOpportunities')}>
            <Prose text={unit.development_opportunities} />
          </Accordion>
        )}
        {unit.accessibility_tourism && (
          <Accordion title={t('accessibilityTourism')}>
            <Prose text={unit.accessibility_tourism} />
          </Accordion>
        )}
        {province && (
          <Accordion title={`${t('provincialContext')} (${unit.province})`}>
            <p>
              <b>{t('resources')} :</b> {province.natural_resources}
            </p>
            <p className="mt-1">
              <b>{t('economy')} :</b> {province.economy_specialties}
            </p>
            <p className="mt-1">
              <b>{t('particularities')} :</b> {province.particularities}
            </p>
          </Accordion>
        )}
        <Accordion title={t('sourcesTitle')}>
          <SourcesBlock extra={unit.caid_updated ? `${t('caveatUpdated')}: ${unit.caid_updated}.` : undefined} />
        </Accordion>
      </div>
    </CardShell>
  )
}

// ---------- province card ----------

function ProvinceCard({ data, province }: { data: DrcData; province: Province }) {
  const { selectProvince, selectUnit } = useAppState()
  const { t, lang } = useLanguage()
  const locale: NumberLocale = lang === 'fr' ? 'fr-FR' : 'en-US'
  const media = data.media.get(`province:${province.name}`)
  const units = data.units.filter((u) => sameName(u.province, province.name))
  const unitSpelling = units[0]?.province ?? province.name
  const color = PROVINCE_COLORS.get(unitSpelling) ?? '#8aa'
  const territoires = units.filter((u) => u.type === 'territoire').sort((a, b) => a.name.localeCompare(b.name))
  const villes = units.filter((u) => u.type === 'ville').sort((a, b) => a.name.localeCompare(b.name))
  const firstFact = media?.facts?.[0]

  return (
    <CardShell>
      <CardHero
        name={province.name}
        color={color}
        media={media}
        features={unitFeatures(data, units.map((u) => u.pcode))}
      />

      <div className="flex flex-wrap items-center gap-1.5 px-5 pt-3">
        <span className="rounded-full bg-ink/8 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide text-ink/70">
          {t('provinceLabel')}
        </span>
        <Chip>
          {t('chefLieu')} {province.capital}
        </Chip>
        <Chip>
          {territoires.length} {t('territoires').toLowerCase()}
          {villes.length ? ` · ${villes.length} ${t('villes').toLowerCase()}` : ''}
        </Chip>
      </div>

      {firstFact && (
        <p className="px-5 pt-2.5 text-[13.5px] font-semibold leading-snug text-teal">
          {firstFact.icon && <span aria-hidden>{firstFact.icon} </span>}
          {lang === 'fr' ? firstFact.fr : firstFact.en}
        </p>
      )}

      <div className="px-5 pt-3">
        <KvRow label={t('area')} value={formatArea(province.area_km2, locale)} sub="INS 2020" />
        <KvRow
          label={t('population')}
          value={formatNumber(province.population_2024_est, locale)}
          sub={`OCHA · ${t('densityLabel').toLowerCase()} ${province.density_per_km2}/km²`}
        />
        <KvRow label={t('languages')} value={province.national_languages} sub={t('officialLanguageNote')} />
      </div>

      <CtaPill label={t('ctaExplore')} onClick={() => selectProvince(province.name)} />

      <div className="mt-1">
        {media?.facts?.length ? (
          <Accordion title={t('faitsUniques')} badge={String(media.facts.length)}>
            <FactsList media={media} />
          </Accordion>
        ) : null}
        <Accordion title={`${t('territoires')} (${territoires.length})`} defaultOpen>
          <ChipButtons units={territoires} onPick={(pcode) => selectUnit(pcode, true)} />
          {villes.length > 0 && (
            <>
              <p className="mb-1.5 mt-3 text-[11.5px] font-bold uppercase tracking-wide text-ink/45">
                {t('villes')} ({villes.length})
              </p>
              <ChipButtons units={villes} onPick={(pcode) => selectUnit(pcode, true)} />
            </>
          )}
        </Accordion>
        <Accordion title={t('populationDistribution')}>
          <PopulationBarChart units={units} />
        </Accordion>
        <Accordion title={t('resources')}>
          <Prose text={province.natural_resources} />
        </Accordion>
        <Accordion title={t('economy')}>
          <Prose text={province.economy_specialties} />
        </Accordion>
        <Accordion title={t('particularities')}>
          <Prose text={province.particularities} />
        </Accordion>
        <Accordion title={t('education')}>
          <Prose text={province.education} />
        </Accordion>
        <Accordion title={t('languages')}>
          <p>
            <b>{t('nationalLanguages')} :</b> {province.national_languages}
          </p>
          <p className="mt-1">
            <b>{t('localLanguages')} :</b> {province.local_languages}
          </p>
        </Accordion>
        <Accordion title={t('sourcesTitle')}>
          <SourcesBlock />
        </Accordion>
      </div>
    </CardShell>
  )
}

function ChipButtons({ units, onPick }: { units: TerritoryUnit[]; onPick: (pcode: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {units.map((u) => (
        <button
          key={u.pcode}
          type="button"
          onClick={() => onPick(u.pcode)}
          className="rounded-full bg-teal/8 px-2.5 py-1 text-[12px] font-semibold text-ink/85 transition hover:bg-teal hover:text-white active:scale-[0.98]"
        >
          {u.name}
        </button>
      ))}
    </div>
  )
}

// ---------- shell (scroll container + close) ----------

function CardShell({ children }: { children: React.ReactNode }) {
  const { clearSelection } = useAppState()
  const { t } = useLanguage()
  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-2xl bg-card shadow-2xl">
      <button
        type="button"
        onClick={clearSelection}
        aria-label={t('close')}
        className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur transition hover:bg-black/55 active:scale-[0.98]"
      >
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="m4 4 8 8m0-8-8 8" strokeLinecap="round" />
        </svg>
      </button>
      <div className="thin-scroll flex flex-1 flex-col overflow-y-auto pb-4">{children}</div>
    </div>
  )
}
