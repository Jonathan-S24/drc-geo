import { useState, type ReactNode } from 'react'

interface AccordionProps {
  title: string
  children: ReactNode
  defaultOpen?: boolean
  badge?: string
}

/** Disclosure row for the detail card's link list — keeps all data reachable without clutter. */
export function Accordion({ title, children, defaultOpen = false, badge }: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-t border-line/70">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-5 py-3 text-left transition hover:bg-teal/5 active:scale-[0.98]"
      >
        <span className="flex-1 text-[13px] font-bold text-ink">{title}</span>
        {badge && (
          <span className="rounded-full bg-teal/10 px-2 py-0.5 text-[10px] font-bold text-teal">{badge}</span>
        )}
        <svg
          viewBox="0 0 16 16"
          className={`h-3.5 w-3.5 text-ink/40 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="m3 6 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && <div className="px-5 pb-4 text-[13px] leading-relaxed text-ink/85">{children}</div>}
    </div>
  )
}
