import { useEffect, useMemo, useRef, useState } from 'react'
import type { DrcData } from '../data/useDrcData'
import { useAppState } from '../state/AppStateContext'
import { useLanguage } from '../i18n/LanguageContext'
import { matches, sameName } from '../utils/match'
import { PROVINCE_COLORS } from '../theme/palette'

interface SearchPillProps {
  data: DrcData
}

interface Result {
  key: string
  kind: 'province' | 'unit'
  name: string
  typeLabel: string
  province: string
  color: string
  select: () => void
}

const MAX_RESULTS = 9

export function SearchPill({ data }: SearchPillProps) {
  const { selectUnit, selectProvince } = useAppState()
  const { t } = useLanguage()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  // "/" teleports focus to search from anywhere
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // click-away closes the list
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
  }, [])

  const results = useMemo<Result[]>(() => {
    if (!query.trim()) return []
    const out: Result[] = []
    for (const p of data.provinces) {
      if (!matches(p.name, query)) continue
      // palette is keyed by the territories-file spelling; join accent-insensitively
      const unitSpelling = data.units.find((u) => sameName(u.province, p.name))?.province ?? p.name
      out.push({
        key: `p:${p.name}`,
        kind: 'province',
        name: p.name,
        typeLabel: t('provinceLabel'),
        province: p.capital,
        color: PROVINCE_COLORS.get(unitSpelling) ?? '#8aa',
        select: () => selectProvince(p.name),
      })
    }
    for (const u of data.units) {
      if (!matches(u.name, query)) continue
      out.push({
        key: `u:${u.pcode}`,
        kind: 'unit',
        name: u.name,
        typeLabel: u.type === 'ville' ? t('villeLabel') : t('territoireLabel'),
        province: u.province,
        color: PROVINCE_COLORS.get(u.province) ?? '#8aa',
        select: () => selectUnit(u.pcode, true),
      })
    }
    // exact-prefix matches first, then provinces, then by name
    const q = query.trim().toLowerCase()
    out.sort((a, b) => {
      const ap = a.name.toLowerCase().startsWith(q) ? 0 : 1
      const bp = b.name.toLowerCase().startsWith(q) ? 0 : 1
      if (ap !== bp) return ap - bp
      if (a.kind !== b.kind) return a.kind === 'province' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    return out.slice(0, MAX_RESULTS)
  }, [query, data, t, selectProvince, selectUnit])

  useEffect(() => setActive(0), [query])

  const pick = (r: Result) => {
    r.select()
    setQuery('')
    setOpen(false)
    inputRef.current?.blur()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if ((e.key === 'Enter' || e.key === 'Return') && results[active]) {
      e.preventDefault()
      pick(results[active])
    } else if (e.key === 'Escape') {
      setQuery('')
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  return (
    <div ref={rootRef} className="pointer-events-auto relative w-full max-w-[420px]">
      <div className="flex items-center gap-2.5 rounded-full bg-white/95 px-4 py-2.5 shadow-lg backdrop-blur transition focus-within:bg-white focus-within:shadow-xl">
        <svg viewBox="0 0 20 20" className="h-4.5 w-4.5 shrink-0 text-ink/45" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="9" cy="9" r="6" />
          <path d="m13.5 13.5 3.5 3.5" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={t('searchPlaceholder')}
          className="w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-ink/40"
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-label={t('searchPlaceholder')}
        />
        <kbd className="hidden shrink-0 rounded-md border border-line bg-card px-1.5 py-0.5 text-[10px] font-semibold text-ink/45 md:block">
          /
        </kbd>
      </div>

      {open && query.trim() && (
        <div className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-2xl bg-white/98 shadow-xl backdrop-blur">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-[13px] italic text-ink/45">{t('noResults')}</p>
          ) : (
            <ul role="listbox">
              {results.map((r, i) => (
                <li key={r.key} role="option" aria-selected={i === active}>
                  <button
                    type="button"
                    onClick={() => pick(r)}
                    onMouseEnter={() => setActive(i)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition active:scale-[0.98] ${
                      i === active ? 'bg-teal/8' : ''
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: r.color }}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-ink">{r.name}</span>
                    <span className="shrink-0 rounded-full bg-teal/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-teal">
                      {r.typeLabel}
                    </span>
                    <span className="hidden max-w-[110px] shrink-0 truncate text-[11.5px] text-ink/50 sm:block">
                      {r.province}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
