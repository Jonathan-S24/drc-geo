import { useMemo, useState } from 'react'
import type { DrcData } from '../data/useDrcData'
import { useAppState } from '../state/AppStateContext'
import { useLanguage } from '../i18n/LanguageContext'
import { territoryOfTheDay, todayKey } from '../engage/daily'
import { PROVINCE_COLORS } from '../theme/palette'

const SEEN_KEY = 'drcgeo-daily-seen'

/**
 * "Territoire du jour" — shown once per day on load (deterministic from the
 * date, so everyone sees the same territoire). Dismiss or click-through.
 */
export function DailyCard({ data }: { data: DrcData }) {
  const { selectUnit, selection } = useAppState()
  const { t } = useLanguage()
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(SEEN_KEY) === todayKey())

  const unit = useMemo(() => territoryOfTheDay(data), [data])

  if (dismissed || selection.view !== 'none') return null

  const done = () => {
    localStorage.setItem(SEEN_KEY, todayKey())
    setDismissed(true)
  }
  const color = PROVINCE_COLORS.get(unit.province) ?? '#5b9bd1'

  return (
    <div className="pointer-events-auto mx-auto flex w-[min(92vw,380px)] items-center gap-3 rounded-2xl bg-white/95 p-3 shadow-2xl backdrop-blur animate-card-in">
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[20px]"
        style={{ background: `${color}33` }}
        aria-hidden
      >
        📍
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] font-bold uppercase tracking-wide text-teal">{t('dailyTitle')}</p>
        <p className="truncate text-[15px] font-extrabold text-ink">
          {unit.name} <span className="font-semibold text-ink/50">· {unit.province}</span>
        </p>
      </div>
      <button
        type="button"
        onClick={() => {
          done()
          selectUnit(unit.pcode, true)
        }}
        className="shrink-0 rounded-full bg-teal px-3.5 py-2 text-[12px] font-bold text-white transition hover:bg-teal-light active:scale-[0.98]"
      >
        {t('dailyCta')}
      </button>
      <button
        type="button"
        onClick={done}
        aria-label={t('close2')}
        className="shrink-0 rounded-full p-1.5 text-ink/40 transition hover:bg-ink/10 hover:text-ink active:scale-[0.98]"
      >
        ✕
      </button>
    </div>
  )
}
