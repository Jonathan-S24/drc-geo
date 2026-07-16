import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type Filter = 'all' | 'prov' | 'terr' | 'ville'

export type CompareItem = { kind: 'unit'; pcode: string } | { kind: 'province'; name: string }

export type Selection =
  | { view: 'none' }
  | { view: 'unit'; pcode: string; zoom: boolean }
  | { view: 'province'; name: string }
  | { view: 'compare' }

const MAX_COMPARE = 3

function readFromUrl(): { selection: Selection; compare: CompareItem[] } {
  const params = new URLSearchParams(window.location.search)
  const compareParam = params.get('compare')
  const compare: CompareItem[] = compareParam
    ? compareParam
        .split(',')
        .map((entry): CompareItem | null => {
          const [type, ...rest] = entry.split(':')
          const value = rest.join(':')
          if (!value) return null
          if (type === 'u') return { kind: 'unit', pcode: value }
          if (type === 'p') return { kind: 'province', name: decodeURIComponent(value) }
          return null
        })
        .filter((x): x is CompareItem => x !== null)
        .slice(0, MAX_COMPARE)
    : []

  if (params.get('view') === 'compare') return { selection: { view: 'compare' }, compare }
  const unit = params.get('unit')
  if (unit) return { selection: { view: 'unit', pcode: unit, zoom: true }, compare }
  const province = params.get('province')
  if (province) return { selection: { view: 'province', name: decodeURIComponent(province) }, compare }
  return { selection: { view: 'none' }, compare }
}

function writeToUrl(selection: Selection, compare: CompareItem[]) {
  const params = new URLSearchParams()
  if (selection.view === 'unit') params.set('unit', selection.pcode)
  else if (selection.view === 'province') params.set('province', selection.name)
  else if (selection.view === 'compare') params.set('view', 'compare')
  if (compare.length) {
    params.set(
      'compare',
      compare.map((c) => (c.kind === 'unit' ? `u:${c.pcode}` : `p:${encodeURIComponent(c.name)}`)).join(','),
    )
  }
  const qs = params.toString()
  const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname
  window.history.replaceState(null, '', url)
}

interface AppStateValue {
  filter: Filter
  setFilter: (f: Filter) => void
  search: string
  setSearch: (s: string) => void
  selection: Selection
  selectUnit: (pcode: string, zoom?: boolean) => void
  selectProvince: (name: string) => void
  showCompare: () => void
  clearSelection: () => void
  compare: CompareItem[]
  toggleCompare: (item: CompareItem) => void
  isComparing: (item: CompareItem) => boolean
  clearCompare: () => void
  compareFull: boolean
}

const AppStateContext = createContext<AppStateValue | null>(null)

export function AppStateProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(readFromUrl, [])
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [selection, setSelection] = useState<Selection>(initial.selection)
  const [compare, setCompare] = useState<CompareItem[]>(initial.compare)

  useEffect(() => {
    writeToUrl(selection, compare)
  }, [selection, compare])

  const value = useMemo<AppStateValue>(() => {
    const sameItem = (a: CompareItem, b: CompareItem) =>
      a.kind === b.kind && (a.kind === 'unit' && b.kind === 'unit' ? a.pcode === b.pcode : a.kind === 'province' && b.kind === 'province' ? a.name === b.name : false)

    return {
      filter,
      setFilter,
      search,
      setSearch,
      selection,
      selectUnit: (pcode, zoom = true) => setSelection({ view: 'unit', pcode, zoom }),
      selectProvince: (name) => setSelection({ view: 'province', name }),
      showCompare: () => setSelection({ view: 'compare' }),
      clearSelection: () => setSelection({ view: 'none' }),
      compare,
      toggleCompare: (item) =>
        setCompare((prev) => {
          if (prev.some((p) => sameItem(p, item))) return prev.filter((p) => !sameItem(p, item))
          if (prev.length >= MAX_COMPARE) return prev
          return [...prev, item]
        }),
      isComparing: (item) => compare.some((p) => sameItem(p, item)),
      clearCompare: () => setCompare([]),
      compareFull: compare.length >= MAX_COMPARE,
    }
  }, [filter, search, selection, compare])

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState must be used within an AppStateProvider')
  return ctx
}
