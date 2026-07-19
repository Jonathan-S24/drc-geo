import { useEffect } from 'react'
import { LanguageProvider, useLanguage } from './i18n/LanguageContext'
import { AppStateProvider, useAppState } from './state/AppStateContext'
import { useDrcData, type DrcData } from './data/useDrcData'
import { MapView } from './components/MapView'
import { SearchPill } from './components/SearchPill'
import { DetailCard } from './components/DetailCard'
import { BottomSheet } from './components/BottomSheet'
import { PwaChrome } from './components/PwaChrome'
import { sameName } from './utils/match'

function Breadcrumb({ data }: { data: DrcData }) {
  const { selection, selectProvince, clearSelection } = useAppState()
  const { t } = useLanguage()
  if (selection.view === 'none') return null

  const provinceName =
    selection.view === 'province'
      ? selection.name
      : data.byPcode.get(selection.pcode)?.province ?? null
  const unitName = selection.view === 'unit' ? data.byPcode.get(selection.pcode)?.name : null
  const canonicalProvince = provinceName
    ? data.provinces.find((p) => sameName(p.name, provinceName))?.name ?? provinceName
    : null

  const seg = 'transition hover:text-white active:scale-[0.98]'
  return (
    <nav
      aria-label="Breadcrumb"
      className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-ocean-deep/80 px-4 py-2 text-[12.5px] font-semibold text-white/75 shadow-lg backdrop-blur"
    >
      <button type="button" className={seg} onClick={clearSelection}>
        {t('backToCountry')}
      </button>
      {canonicalProvince && (
        <>
          <span aria-hidden>›</span>
          <button
            type="button"
            className={`${seg} ${!unitName ? 'text-white' : ''}`}
            onClick={() => selectProvince(canonicalProvince)}
          >
            {canonicalProvince}
          </button>
        </>
      )}
      {unitName && (
        <>
          <span aria-hidden>›</span>
          <span className="text-white">{unitName}</span>
        </>
      )}
    </nav>
  )
}

function LangToggle() {
  const { lang, toggleLang } = useLanguage()
  return (
    <button
      type="button"
      onClick={toggleLang}
      className="pointer-events-auto rounded-full bg-white/95 px-3.5 py-2 text-[12px] font-bold text-ink shadow-lg backdrop-blur transition hover:bg-white active:scale-[0.98]"
      aria-label="Toggle language"
    >
      {lang === 'fr' ? 'EN' : 'FR'}
    </button>
  )
}

/** Skeleton shown while the data files load — never a blank flash. */
function LoadingState() {
  return (
    <div className="flex h-screen items-stretch justify-end bg-ocean p-4 md:p-6">
      <div className="hidden w-[400px] flex-col overflow-hidden rounded-2xl bg-card shadow-2xl md:flex">
        <div className="skeleton h-44 w-full !rounded-none" />
        <div className="flex flex-col gap-3 p-5">
          <div className="skeleton h-7 w-2/3" />
          <div className="skeleton h-4 w-1/2" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-9 w-40 !rounded-full" />
        </div>
      </div>
    </div>
  )
}

function AppShell({ data }: { data: DrcData }) {
  const { selection, selectProvince, clearSelection } = useAppState()
  const { t } = useLanguage()
  const hasCard = selection.view !== 'none'

  // Esc steps back: unit → its province → country
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || document.activeElement?.tagName === 'INPUT') return
      if (selection.view === 'unit') {
        const prov = data.byPcode.get(selection.pcode)?.province
        const canonical = prov ? data.provinces.find((p) => sameName(p.name, prov))?.name : null
        if (canonical) selectProvince(canonical)
        else clearSelection()
      } else if (selection.view === 'province') {
        clearSelection()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selection, data, selectProvince, clearSelection])

  const cardKey =
    selection.view === 'unit' ? selection.pcode : selection.view === 'province' ? selection.name : ''

  return (
    <div className="relative h-screen overflow-hidden bg-ocean">
      <MapView data={data} />

      {/* floating chrome over the map */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] flex flex-col gap-2 p-3 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 justify-center md:justify-start">
            <SearchPill data={data} />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <PwaChrome />
            <LangToggle />
          </div>
        </div>
        <div className="flex justify-center md:justify-start">
          <Breadcrumb data={data} />
        </div>
      </div>

      {/* attribution / caveat line over the ocean */}
      <p className="pointer-events-none absolute bottom-2 left-3 z-[900] hidden max-w-[46%] text-[10px] leading-snug text-white/45 md:block">
        {t('mapAttribution')}
      </p>

      {/* detail card: floating right on desktop, bottom sheet on mobile */}
      {hasCard && (
        <>
          <div className="absolute bottom-5 right-5 top-[76px] z-[1000] hidden w-[400px] animate-card-in md:block">
            <DetailCard data={data} />
          </div>
          <BottomSheet resetKey={cardKey}>
            <DetailCard data={data} />
          </BottomSheet>
        </>
      )}
    </div>
  )
}

function AppContent() {
  const { t } = useLanguage()
  const state = useDrcData()
  if (state.status === 'loading') return <LoadingState />
  if (state.status === 'error') {
    return (
      <div className="flex h-screen items-center justify-center bg-ocean text-white/80">
        <p>
          {t('loadError')} : {state.error}
        </p>
      </div>
    )
  }
  return <AppShell data={state.data} />
}

function App() {
  return (
    <LanguageProvider>
      <AppStateProvider>
        <AppContent />
      </AppStateProvider>
    </LanguageProvider>
  )
}

export default App
