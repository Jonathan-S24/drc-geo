import type { TerritoryUnit } from '../types'
import { useAppState } from '../state/AppStateContext'
import { useLanguage } from '../i18n/LanguageContext'
import { formatNumber } from '../utils/format'
import type { NumberLocale } from '../utils/format'

interface PopulationBarChartProps {
  units: TerritoryUnit[]
}

export function PopulationBarChart({ units }: PopulationBarChartProps) {
  const { selectUnit } = useAppState()
  const { lang } = useLanguage()
  const locale: NumberLocale = lang === 'fr' ? 'fr-FR' : 'en-US'

  const rows = units
    .filter((u) => u.population_2024_ocha != null)
    .sort((a, b) => (b.population_2024_ocha ?? 0) - (a.population_2024_ocha ?? 0))
  const max = rows.reduce((m, u) => Math.max(m, u.population_2024_ocha ?? 0), 1)

  if (!rows.length) return null

  return (
    <div className="space-y-1">
      {rows.map((u) => {
        const pop = u.population_2024_ocha ?? 0
        const pct = Math.max(2, (pop / max) * 100)
        return (
          <button
            key={u.pcode}
            type="button"
            onClick={() => selectUnit(u.pcode, true)}
            className="flex w-full items-center gap-2 text-left text-[11.5px] hover:opacity-80"
          >
            <span className="w-24 shrink-0 truncate" title={u.name}>
              {u.name}
            </span>
            <span className="h-3 flex-1 overflow-hidden rounded bg-app-bg">
              <span
                className="block h-3 rounded bg-teal-light"
                style={{ width: `${pct}%` }}
              />
            </span>
            <span className="w-16 shrink-0 text-right text-ink/60">{formatNumber(pop, locale)}</span>
          </button>
        )
      })}
    </div>
  )
}
