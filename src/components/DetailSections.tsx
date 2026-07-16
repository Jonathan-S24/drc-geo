import type { ReactNode } from 'react'
import { useLanguage } from '../i18n/LanguageContext'

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-4">
      <h3 className="mb-1.5 text-[13px] font-semibold text-teal">{title}</h3>
      {children}
    </div>
  )
}

export function Chips({ items }: { items: string[] | null | undefined }) {
  const { t } = useLanguage()
  if (!items || !items.length) return <Empty />
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <span key={i} className="rounded-full bg-app-bg px-2.5 py-1 text-[12px] text-ink/85">
          {item}
        </span>
      ))}
    </div>
  )
  function Empty() {
    return <p className="text-[13px] italic text-ink/40">{t('notAvailable')}</p>
  }
}

export function Prose({ text }: { text: string | null | undefined }) {
  const { t } = useLanguage()
  if (!text) return <p className="text-[13px] italic text-ink/40">{t('notAvailable')}</p>
  return <p className="text-[13px] leading-relaxed text-ink/90">{text}</p>
}

export function FrenchSourceNote() {
  const { t, lang } = useLanguage()
  if (lang !== 'en') return null
  return <p className="mt-1 text-[11px] italic text-ink/40">{t('sourceFrench')}</p>
}
