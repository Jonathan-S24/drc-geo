import type { ReactNode } from 'react'
import { useLanguage } from '../i18n/LanguageContext'
import { useAppState, type CompareItem } from '../state/AppStateContext'

interface PanelHeaderProps {
  title: string
  tag: string
  subtitle: ReactNode
  onClose: () => void
  compareItem: CompareItem
}

export function PanelHeader({ title, tag, subtitle, onClose, compareItem }: PanelHeaderProps) {
  const { t } = useLanguage()
  const { toggleCompare, isComparing, compareFull } = useAppState()
  const active = isComparing(compareItem)
  const disabled = !active && compareFull

  return (
    <div className="sticky top-0 bg-teal px-4 py-3.5 text-white">
      <button
        type="button"
        onClick={onClose}
        aria-label={t('close')}
        className="absolute top-2.5 right-3 text-lg leading-none text-white/90 hover:text-white"
      >
        ✕
      </button>
      <h2 className="pr-6 text-lg font-bold">{title}</h2>
      <span className="mt-1 inline-block rounded-full bg-accent px-2 py-0.5 text-[10.5px] font-semibold tracking-wide text-ink uppercase">
        {tag}
      </span>
      <div className="mt-1 text-xs opacity-85">{subtitle}</div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => toggleCompare(compareItem)}
        className={`mt-2 rounded-md border px-2.5 py-1 text-[11px] font-medium ${
          active
            ? 'border-accent bg-accent text-ink'
            : 'border-white/40 text-white hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-transparent'
        }`}
      >
        {active ? t('compareRemove') : t('compareAdd')}
      </button>
    </div>
  )
}
