import type { DrcData } from '../data/useDrcData'
import { useAppState, type CompareItem } from '../state/AppStateContext'
import { useLanguage } from '../i18n/LanguageContext'
import type { TranslationKey } from '../i18n/translations'
import { formatArea, formatNumber } from '../utils/format'
import type { NumberLocale } from '../utils/format'
import { sameName } from '../utils/match'

interface CompareViewProps {
  data: DrcData
}

interface CompareRow {
  key: string
  title: string
  tag: string
  province: string
  area: string
  population: string
  languages: string
  activitiesLabel: string
  activities: string
  education: string
}

export function CompareView({ data }: CompareViewProps) {
  const { compare, toggleCompare, clearCompare, clearSelection } = useAppState()
  const { t, lang } = useLanguage()
  const locale: NumberLocale = lang === 'fr' ? 'fr-FR' : 'en-US'

  const rows = compare
    .map((item) => buildRow(item, data, locale, t))
    .filter((r): r is CompareRow => r !== null)

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 flex items-center gap-3 bg-teal px-4 py-3.5 text-white">
        <h2 className="text-lg font-bold">{t('compareView')}</h2>
        <div className="ml-auto flex gap-2">
          {rows.length > 0 && (
            <button
              type="button"
              onClick={clearCompare}
              className="rounded-md border border-white/40 px-2.5 py-1 text-[11px] hover:bg-white/10"
            >
              {t('compareClear')}
            </button>
          )}
          <button
            type="button"
            onClick={clearSelection}
            aria-label={t('close')}
            className="text-lg leading-none text-white/90 hover:text-white"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="thin-scroll flex-1 overflow-auto p-4">
        {!rows.length ? (
          <p className="p-6 text-center text-sm text-ink/50">{t('compareEmpty')}</p>
        ) : (
          <table className="w-full border-collapse text-[12.5px]">
            <tbody>
              <CompareHeaderRow rows={rows} onRemove={(item) => toggleCompare(item)} compare={compare} />
              <CompareTextRow label={t('province')} values={rows.map((r) => r.province)} />
              <CompareTextRow label={t('area')} values={rows.map((r) => r.area)} />
              <CompareTextRow label={t('population')} values={rows.map((r) => r.population)} />
              <CompareTextRow label={t('languages')} values={rows.map((r) => r.languages)} />
              <CompareTextRow label={rows[0]?.activitiesLabel ?? ''} values={rows.map((r) => r.activities)} />
              <CompareTextRow label={t('education')} values={rows.map((r) => r.education)} />
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function CompareHeaderRow({
  rows,
  onRemove,
  compare,
}: {
  rows: CompareRow[]
  onRemove: (item: CompareItem) => void
  compare: CompareItem[]
}) {
  return (
    <tr>
      <th className="w-28"></th>
      {rows.map((r, i) => (
        <th key={r.key} className="border-b border-line p-2 text-left align-top">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-semibold text-ink">{r.title}</div>
              <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold tracking-wide text-ink uppercase">
                {r.tag}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onRemove(compare[i])}
              className="text-ink/40 hover:text-ink"
              aria-label="remove"
            >
              ✕
            </button>
          </div>
        </th>
      ))}
    </tr>
  )
}

function CompareTextRow({ label, values }: { label: string; values: string[] }) {
  return (
    <tr>
      <td className="border-b border-line p-2 align-top font-medium text-ink/60">{label}</td>
      {values.map((v, i) => (
        <td key={i} className="border-b border-line p-2 align-top text-ink/90">
          {v || '—'}
        </td>
      ))}
    </tr>
  )
}

function buildRow(
  item: CompareItem,
  data: DrcData,
  locale: NumberLocale,
  t: (k: TranslationKey) => string,
): CompareRow | null {
  if (item.kind === 'unit') {
    const u = data.byPcode.get(item.pcode)
    if (!u) return null
    return {
      key: `u:${u.pcode}`,
      title: u.name,
      tag: u.type === 'ville' ? t('villeLabel') : t('territoireLabel'),
      province: u.province,
      area: formatArea(u.area_km2_codab, locale),
      population: formatNumber(u.population_2024_ocha, locale),
      languages: u.languages.join(', '),
      activitiesLabel: t('mainActivities'),
      activities: u.main_activities.join(', '),
      education:
        u.schools_primary || u.schools_secondary
          ? `${u.schools_primary ?? '?'} ${t('schoolsPrimary')} · ${u.schools_secondary ?? '?'} ${t('schoolsSecondary')}`
          : '',
    }
  }

  const p = data.provinces.find((prov) => sameName(prov.name, item.name))
  if (!p) return null
  return {
    key: `p:${p.name}`,
    title: p.name,
    tag: t('provinceLabel'),
    province: '—',
    area: formatArea(p.area_km2, locale),
    population: formatNumber(p.population_2024_est, locale),
    languages: `${p.national_languages} / ${p.local_languages}`,
    activitiesLabel: t('economy'),
    activities: p.economy_specialties,
    education: p.education,
  }
}
