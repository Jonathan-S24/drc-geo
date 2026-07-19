import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

export type Selection =
  | { view: 'none' }
  | { view: 'unit'; pcode: string; zoom: boolean }
  | { view: 'province'; name: string }

interface AppStateValue {
  selection: Selection
  setSelection: (s: Selection) => void
  selectUnit: (pcode: string, zoom?: boolean) => void
  selectProvince: (name: string) => void
  clearSelection: () => void
}

const AppStateContext = createContext<AppStateValue | null>(null)

// URL ↔ selection sync lives in useUrlSync (it needs DrcData to resolve slugs);
// this context just owns the selection state.
export function AppStateProvider({ children }: { children: ReactNode }) {
  const [selection, setSelection] = useState<Selection>({ view: 'none' })

  const value = useMemo<AppStateValue>(
    () => ({
      selection,
      setSelection,
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
