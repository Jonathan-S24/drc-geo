import { useState } from 'react'
import type { DrcData } from '../data/useDrcData'
import { useLayer, type MapLayer } from '../state/LayerContext'
import { useLanguage } from '../i18n/LanguageContext'

const ICONS: Record<Exclude<MapLayer, 'none'>, string> = {
  langues: '🗣️',
  sante: '🏥',
  histoire: '🕰️',
  parcs: '🌳',
}

interface LayersControlProps {
  data: DrcData
}

/** Expandable layer picker (one active at a time). Bottom-left over the map. */
export function LayersControl({ data }: LayersControlProps) {
  const { layer, setLayer } = useLayer()
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)

  const items: { key: Exclude<MapLayer, 'none'>; label: string; disabled?: boolean }[] = [
    { key: 'langues', label: t('layerLangues') },
    { key: 'sante', label: t('layerSante') },
    { key: 'histoire', label: t('layerHistoire'), disabled: data.historicalEras.length === 0 },
    { key: 'parcs', label: t('layerParcs'), disabled: data.parks === null },
  ]

  return (
    <div className="pointer-events-auto flex flex-col items-start gap-2">
      {open && (
        <div className="flex flex-col gap-1 rounded-2xl bg-white/95 p-1.5 shadow-xl backdrop-blur">
          {items.map((it) => (
            <button
              key={it.key}
              type="button"
              disabled={it.disabled}
              onClick={() => {
                setLayer(it.key)
                setOpen(false) // free the map back up, especially on mobile
              }}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] font-semibold transition active:scale-[0.98] disabled:opacity-35 ${
                layer === it.key ? 'bg-teal text-white' : 'text-ink hover:bg-teal/10'
              }`}
            >
              <span aria-hidden>{ICONS[it.key]}</span>
              <span>{it.label}</span>
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-bold shadow-lg backdrop-blur transition active:scale-[0.98] ${
          layer !== 'none' ? 'bg-teal text-white' : 'bg-white/95 text-ink hover:bg-white'
        }`}
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="m10 3 7 4-7 4-7-4 7-4Z" strokeLinejoin="round" />
          <path d="m3 11 7 4 7-4" strokeLinejoin="round" />
        </svg>
        {layer === 'none' ? t('layers') : t(`layer${layer[0].toUpperCase()}${layer.slice(1)}` as never)}
      </button>
    </div>
  )
}
