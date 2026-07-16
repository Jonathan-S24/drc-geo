import type { DrcData } from '../data/useDrcData'
import { useLanguage } from '../i18n/LanguageContext'
import { SearchFilterBar } from './SearchFilterBar'
import { UnitList } from './UnitList'

interface SidebarProps {
  data: DrcData
  onClose: () => void
}

export function Sidebar({ data, onClose }: SidebarProps) {
  const { t } = useLanguage()
  return (
    <aside className="flex h-full w-full flex-col bg-card">
      <div className="flex items-center justify-between border-b border-line px-3 py-2 md:hidden">
        <span className="text-[13px] font-semibold text-ink">{t('browseList')}</span>
        <button type="button" onClick={onClose} aria-label={t('close')} className="text-lg leading-none text-ink/70">
          ✕
        </button>
      </div>
      <SearchFilterBar />
      <div className="thin-scroll flex-1 overflow-y-auto">
        <UnitList data={data} />
      </div>
    </aside>
  )
}
