import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

export type MapLayer = 'none' | 'langues' | 'sante' | 'histoire' | 'parcs'

interface LayerContextValue {
  layer: MapLayer
  setLayer: (l: MapLayer) => void
  /** Index into DrcData.historicalEras (+ one synthetic "2015" step at the end). */
  eraIndex: number
  setEraIndex: (i: number) => void
}

const LayerContext = createContext<LayerContextValue | null>(null)

export function LayerProvider({ children }: { children: ReactNode }) {
  const [layer, setLayerRaw] = useState<MapLayer>('none')
  const [eraIndex, setEraIndex] = useState(0)

  const value = useMemo<LayerContextValue>(
    () => ({
      layer,
      setLayer: (l) => setLayerRaw((cur) => (cur === l ? 'none' : l)),
      eraIndex,
      setEraIndex,
    }),
    [layer, eraIndex],
  )

  return <LayerContext.Provider value={value}>{children}</LayerContext.Provider>
}

export function useLayer(): LayerContextValue {
  const ctx = useContext(LayerContext)
  if (!ctx) throw new Error('useLayer must be used within a LayerProvider')
  return ctx
}
