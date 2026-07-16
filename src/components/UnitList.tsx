import { useMemo, useState } from 'react'
import type { DrcData } from '../data/useDrcData'
import { useAppState } from '../state/AppStateContext'
import { useLanguage } from '../i18n/LanguageContext'
import { matches } from '../utils/match'
import { formatNumber } from '../utils/format'
import type { NumberLocale } from '../utils/format'

interface UnitListProps {
  data: DrcData
}

export function UnitList({ data }: UnitListProps) {
  const { filter, search, selectUnit, selectProvince } = useAppState()
  const { t, lang } = useLanguage()
  const locale: NumberLocale = lang === 'fr' ? 'fr-FR' : 'en-US'
  const [openProvinces, setOpenProvinces] = useState<Set<string>>(new Set())

  const provinces = useMemo(
    () =>
      data.provinces
        .filter((p) => !search.trim() || matches(p.name, search) || matches(p.capital, search))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [data.provinces, search],
  )

  const grouped = useMemo(() => {
    const groups: Record<string, DrcData['units']> = {}
    for (const u of data.units) {
      if (filter === 'terr' && u.type !== 'territoire') continue
      if (filter === 'ville' && u.type !== 'ville') continue
      if (search.trim() && !(matches(u.name, search) || matches(u.province, search))) continue
      ;(groups[u.province] ??= []).push(u)
    }
    for (const list of Object.values(groups)) list.sort((a, b) => a.name.localeCompare(b.name))
    return groups
  }, [data.units, filter, search])

  const toggleOpen = (name: string) =>
    setOpenProvinces((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })

  if (filter === 'prov') {
    if (!provinces.length) return <EmptyState label={t('noResults')} />
    return (
      <div>
        {provinces.map((p) => (
          <button
            key={p.name}
            type="button"
            onClick={() => selectProvince(p.name)}
            className="flex w-full items-center justify-between border-b border-line px-3 py-2.5 text-left text-[13.5px] font-semibold hover:bg-app-bg"
          >
            <span>{p.name}</span>
            <span className="text-xs font-normal text-ink/60">{formatNumber(p.population_2024_est, locale)}</span>
          </button>
        ))}
      </div>
    )
  }

  const provinceNames = Object.keys(grouped).sort()
  if (!provinceNames.length) return <EmptyState label={t('noResults')} />

  const forceOpen = search.trim().length > 0

  return (
    <div>
      {provinceNames.map((province) => {
        const units = grouped[province]
        const isOpen = forceOpen || openProvinces.has(province)
        return (
          <div key={province} className="border-b border-line">
            <button
              type="button"
              onClick={() => toggleOpen(province)}
              className="flex w-full items-center justify-between px-3 py-2.5 text-left text-[13.5px] font-semibold hover:bg-app-bg"
            >
              <span>{province}</span>
              <span className="rounded-full bg-app-bg px-1.5 py-0.5 text-[11px] font-normal text-ink/60">
                {units.length}
              </span>
            </button>
            {isOpen && (
              <div>
                {units.map((u) => (
                  <button
                    key={u.pcode}
                    type="button"
                    onClick={() => selectUnit(u.pcode, true)}
                    className="flex w-full items-center justify-between py-1.5 pr-3 pl-6 text-left text-[13px] hover:bg-app-bg"
                  >
                    <span>
                      {u.name}
                      {u.type === 'ville' ? ' ⌂' : ''}
                    </span>
                    <span className="text-xs text-ink/60">
                      {u.population_2024_ocha ? formatNumber(u.population_2024_ocha, locale) : ''}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return <div className="p-6 text-center text-sm text-ink/50">{label}</div>
}
