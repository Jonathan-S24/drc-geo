import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type Selection =
  | { view: 'none' }
  | { view: 'unit'; pcode: string; zoom: boolean }
  | { view: 'province'; name: string }

function readFromUrl(): Selection {
  const params = new URLSearchParams(window.location.search)
  const unit = params.get('unit')
  if (unit) return { view: 'unit', pcode: unit, zoom: true }
  const province = params.get('province')
  if (province) return { view: 'province', name: decodeURIComponent(province) }
  return { view: 'none' }
}

function writeToUrl(selection: Selection) {
  const params = new URLSearchParams()
  if (selection.view === 'unit') params.set('unit', selection.pcode)
  else if (selection.view === 'province') params.set('province', selection.name)
  const qs = params.toString()
  const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname
  window.history.replaceState(null, '', url)
}

interface AppStateValue {
  selection: Selection
  selectUnit: (pcode: string, zoom?: boolean) => void
  selectProvince: (name: string) => void
  clearSelection: () => void
}

const AppStateContext = createContext<AppStateValue | null>(null)

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [selection, setSelection] = useState<Selection>(readFromUrl)

  useEffect(() => {
    writeToUrl(selection)
  }, [selection])

  const value = useMemo<AppStateValue>(
    () => ({
      selection,
      selectUnit: (pcode, zoom = true) => setSelection({ view: 'unit', pcode, zoom }),
      selectProvince: (name) => setSelection({ view: 'province', name }),
      clearSelection: () => setSelection({ view: 'none' }),
    }),
    [selection],
  )

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState must be used within an AppStateProvider')
  return ctx
}
