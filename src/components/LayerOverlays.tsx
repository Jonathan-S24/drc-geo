import type { DrcData } from '../data/useDrcData'
import { useAppState } from '../state/AppStateContext'
import { useLayer } from '../state/LayerContext'
import { useLanguage } from '../i18n/LanguageContext'
import { LANGUAGE_COLORS } from '../theme/languages'
import { formatNumber, type NumberLocale } from '../utils/format'
import { AnthemPlayer } from './AnthemPlayer'

/** Renders the overlay UI (legend / timeline / health panel / note) for the active layer. */
export function LayerOverlays({ data }: { data: DrcData }) {
  const { layer } = useLayer()
  if (layer === 'langues') return <LanguageLegend />
  if (layer === 'histoire') return <HistoryTimeline data={data} />
  if (layer === 'sante') return <HealthPanel data={data} />
  if (layer === 'parcs') return <ParksNote />
  return null
}

function LanguageLegend() {
  const { t } = useLanguage()
  return (
    <div className="pointer-events-auto rounded-2xl bg-white/95 px-4 py-3 shadow-xl backdrop-blur">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink/55">{t('layerLangues')}</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {Object.entries(LANGUAGE_COLORS).map(([name, color]) => (
          <span key={name} className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink">
            <span className="h-3 w-3 rounded-full" style={{ background: color }} aria-hidden />
            {name}
          </span>
        ))}
      </div>
    </div>
  )
}

function HistoryTimeline({ data }: { data: DrcData }) {
  const { eraIndex, setEraIndex } = useLayer()
  const { t, lang } = useLanguage()
  // eras from data + a synthetic "2015" step (modern) rendered by the last era's clamp
  const stops = [...data.historicalEras.map((e) => e.key), '2015']
  const clamped = Math.min(eraIndex, data.historicalEras.length - 1)
  const activeEra = data.historicalEras[clamped]

  // Match the current slider stop (e.g. "1988") to the country's naming era.
  const stopKey = stops[eraIndex]
  const naming = data.anthems?.namingEras.find((ne) => ne.map_era.includes(stopKey))
  const countryName = naming ? (lang === 'en' ? naming.name_en : naming.name_fr) : null
  const anthem = naming?.anthem ? data.anthems?.anthems[naming.anthem] : null
  const anthemNote = naming ? (lang === 'en' ? naming.anthem_note_en ?? naming.anthem_note_fr : naming.anthem_note_fr) : null

  return (
    <div className="pointer-events-auto w-[min(92vw,520px)] rounded-2xl bg-white/95 px-4 py-3 shadow-xl backdrop-blur">
      <div className="mb-1.5">
        <p className="text-[14px] font-extrabold leading-tight text-teal">
          {countryName ?? stopKey}
          {naming && <span className="font-semibold text-ink/45"> · {naming.period}</span>}
        </p>
        <p className="text-[11px] font-semibold text-ink/55">{activeEra?.label.split('—')[1]?.trim()}</p>
      </div>
      <input
        type="range"
        min={0}
        max={stops.length - 1}
        value={eraIndex}
        onChange={(e) => setEraIndex(Number(e.target.value))}
        className="w-full accent-teal"
        aria-label={t('layerHistoire')}
      />
      <div className="mt-0.5 flex justify-between text-[10.5px] font-semibold text-ink/50">
        {stops.map((s) => (
          <span key={s}>{s}</span>
        ))}
      </div>

      {anthem && naming ? (
        <AnthemPlayer key={`${naming.anthem}:${naming.period}`} anthem={anthem} years={naming.period} />
      ) : (
        anthemNote && (
          <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-app-bg px-3 py-2 text-[11px] leading-snug text-ink/60">
            <span aria-hidden>🎵</span>
            <span>{anthemNote}</span>
          </p>
        )
      )}

      <p className="mt-2 text-[11px] leading-snug text-ink/55">{data.historicalNote || t('historyNote')}</p>
      {data.anthems && <p className="mt-1 text-[10px] italic leading-snug text-ink/40">{t('anthemBookend')}</p>}
    </div>
  )
}

function HealthPanel({ data }: { data: DrcData }) {
  const { selection } = useAppState()
  const { t, lang } = useLanguage()
  const locale: NumberLocale = lang === 'fr' ? 'fr-FR' : 'en-US'

  const territoryPcode = selection.view === 'unit' ? selection.pcode : null
  const unit = territoryPcode ? data.byPcode.get(territoryPcode) : null
  const zones = territoryPcode ? (data.healthZonesByTerritory.get(territoryPcode) ?? []) : []

  return (
    <div className="pointer-events-auto w-[min(88vw,300px)] rounded-2xl bg-white/95 shadow-xl backdrop-blur">
      <div className="border-b border-line px-4 py-2.5">
        <p className="text-[13px] font-extrabold text-ink">🏥 {t('healthZonesTitle')}</p>
        {unit && (
          <p className="text-[11.5px] text-ink/55">
            {unit.name} · {zones.length} {t('healthZonesCount')}
          </p>
        )}
      </div>
      {zones.length === 0 ? (
        <p className="px-4 py-3 text-[12px] italic text-ink/50">{t('healthZonesHint')}</p>
      ) : (
        <ul className="thin-scroll max-h-[46vh] overflow-y-auto py-1">
          {zones
            .slice()
            .sort((a, b) => b.population_2024 - a.population_2024)
            .map((z) => (
              <li
                key={z.pcode_zs}
                className="flex items-baseline justify-between gap-3 px-4 py-1.5 text-[12.5px]"
              >
                <span className="truncate font-semibold text-ink/85">{z.zone}</span>
                <span className="shrink-0 text-ink/55">
                  {formatNumber(z.population_2024, locale)} {t('inhabitants')}
                </span>
              </li>
            ))}
        </ul>
      )}
    </div>
  )
}

function ParksNote() {
  const { t } = useLanguage()
  return (
    <div className="pointer-events-auto rounded-2xl bg-white/95 px-4 py-2.5 shadow-xl backdrop-blur">
      <p className="text-[11.5px] font-medium text-ink/70">🌳 {t('parksNote')}</p>
    </div>
  )
}
