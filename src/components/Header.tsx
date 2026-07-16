import type { DrcData } from '../data/useDrcData'
import { useLanguage } from '../i18n/LanguageContext'
import { useAppState } from '../state/AppStateContext'
import { formatNumber } from '../utils/format'
import type { NumberLocale } from '../utils/format'
import { LanguageToggle } from './LanguageToggle'

interface HeaderProps {
  data: DrcData
}

export function Header({ data }: HeaderProps) {
  const { t, lang } = useLanguage()
  const locale: NumberLocale = lang === 'fr' ? 'fr-FR' : 'en-US'
  const { compare, showCompare } = useAppState()

  const totalPopulation = data.provinces.reduce((s, p) => s + (p.population_2024_est || 0), 0)

  return (
    <header className="flex flex-wrap items-center gap-3.5 bg-teal px-4 py-2.5 text-white">
      <div>
        <h1 className="text-[18px] font-bold tracking-wide">{t('appTitle')}</h1>
        <div className="text-[11.5px] opacity-75">{t('appSubtitle')}</div>
      </div>
      <div className="ml-auto flex items-center gap-3.5 text-xs">
        <div className="text-right">
          <b className="block text-[15px]">{(totalPopulation / 1e6).toFixed(1)} M</b>
          {t('statPopulation')}
        </div>
        <div className="text-right">
          <b className="block text-[15px]">{formatNumber(data.provinces.length + data.units.length, locale)}</b>
          {t('statUnits')}
        </div>
        {compare.length > 0 && (
          <button
            type="button"
            onClick={showCompare}
            className="rounded-md border border-accent bg-accent/20 px-2.5 py-1 font-medium text-white hover:bg-accent/30"
          >
            {t('compare')} ({compare.length})
          </button>
        )}
        <LanguageToggle />
      </div>
    </header>
  )
}
