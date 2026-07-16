import { useAppState, type Filter } from '../state/AppStateContext'
import { useLanguage } from '../i18n/LanguageContext'

const FILTERS: { key: Filter; labelKey: 'filterAll' | 'filterProvinces' | 'filterTerritoires' | 'filterVilles' }[] = [
  { key: 'all', labelKey: 'filterAll' },
  { key: 'prov', labelKey: 'filterProvinces' },
  { key: 'terr', labelKey: 'filterTerritoires' },
  { key: 'ville', labelKey: 'filterVilles' },
]

export function SearchFilterBar() {
  const { search, setSearch, filter, setFilter } = useAppState()
  const { t } = useLanguage()

  return (
    <div className="border-b border-line">
      <div className="p-2.5">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="w-full rounded-md border border-line px-2.5 py-2 text-[13px] outline-none focus:border-teal-light"
        />
      </div>
      <div className="flex gap-1.5 px-2.5 pb-2 text-xs">
        {FILTERS.map(({ key, labelKey }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`flex-1 rounded-md border px-1 py-1.5 ${
              filter === key ? 'border-teal bg-teal text-white' : 'border-line bg-white text-ink hover:bg-app-bg'
            }`}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>
    </div>
  )
}
