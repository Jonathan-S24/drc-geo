import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

/** Fleuve "Options d'affichage" modes. 'provinces' is the default stage. */
export type MapMode = 'provinces' | 'parks' | 'density' | 'histoire'

interface LayerContextValue {
  mode: MapMode
  setMode: (m: MapMode) => void
  /** Index into the historical era timeline (histoire mode). */
  eraIndex: number
  setEraIndex: (i: number) => void
  /** Selected park id in Sanctuaires (parks) mode, or null. */
  selectedPark: string | null
  setSelectedPark: (id: string | null) => void
}

const LayerContext = createContext<LayerContextValue | null>(null)

export function LayerProvider({ children }: { children: ReactNode }) {
  const [mode, setModeRaw] = useState<MapMode>('provinces')
  const [eraIndex, setEraIndex] = useState(0)
  const [selectedPark, setSelectedPark] = useState<string | null>(null)

  const value = useMemo<LayerContextValue>(
    () => ({
      mode,
      setMode: (m) => {
        setModeRaw(m)
        if (m !== 'parks') setSelectedPark(null)
      },
      eraIndex,
      setEraIndex,
      selectedPark,
      setSelectedPark,
    }),
    [mode, eraIndex, selectedPark],
  )

  return <LayerContext.Provider value={value}>{children}</LayerContext.Provider>
}

export function useLayer(): LayerContextValue {
  const ctx = useContext(LayerContext)
  if (!ctx) throw new Error('useLayer must be used within a LayerProvider')
  return ctx
}
