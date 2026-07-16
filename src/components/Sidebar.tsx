import type { DrcData } from '../data/useDrcData'
import { SearchFilterBar } from './SearchFilterBar'
import { UnitList } from './UnitList'

interface SidebarProps {
  data: DrcData
}

export function Sidebar({ data }: SidebarProps) {
  return (
    <aside className="flex h-full w-full flex-col bg-card">
      <SearchFilterBar />
      <div className="thin-scroll flex-1 overflow-y-auto">
        <UnitList data={data} />
      </div>
    </aside>
  )
}
