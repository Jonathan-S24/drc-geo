import { useState } from 'react'
import { useLanguage } from '../i18n/LanguageContext'

export function CaveatsBanner() {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b border-line bg-accent/10 text-[12px] text-ink">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left"
      >
        <span aria-hidden="true">⚠</span>
        <span className="flex-1 truncate">{t('caveatCensus')}</span>
        <span className="text-ink/50">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <ul className="space-y-1 px-3 pb-2.5 pl-8 text-ink/80">
          <li>{t('caveatCensus')}</li>
          <li>{t('caveatDivergence')}</li>
          <li>{t('caveatSecurity')}</li>
          <li>{t('caveatGaps')}</li>
        </ul>
      )}
    </div>
  )
}
