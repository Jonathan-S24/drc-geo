import { useEffect, useState } from 'react'
import { LanguageProvider, useLanguage } from './i18n/LanguageContext'
import { AppStateProvider, useAppState } from './state/AppStateContext'
import { LayerProvider, useLayer } from './state/LayerContext'
import { useDrcData, type DrcData } from './data/useDrcData'
import { useUrlSync } from './routing/useUrlSync'
import { FleuveMap } from './components/FleuveMap'
import { Brand, Breadcrumb, LangToggle, FleuveSearch, OptionsPanel } from './components/fleuve/FleuveChrome'
import { FicheDossier } from './components/fleuve/FicheDossier'
import { ParkDossier } from './components/fleuve/ParkDossier'
import { SanctuairesRail } from './components/fleuve/SanctuairesRail'
import { FleuveLegend } from './components/fleuve/FleuveLegend'
import { HistoirePanel } from './components/fleuve/HistoirePanel'
import { PwaChrome } from './components/PwaChrome'
import { QuizMode } from './components/QuizMode'

function LoadingState() {
  return (
    <div className="flex h-screen items-center justify-center" style={{ background: 'var(--abyss)' }}>
      <div className="flex flex-col items-center gap-4">
        <svg width="52" height="52" viewBox="0 0 40 40" fill="none" className="fl-rise">
          <circle cx="20" cy="20" r="18.5" stroke="#C87941" strokeWidth="1.2" opacity=".55" />
          <path d="M8 27c5-1.5 6.5-7 11-9s7.5-.5 13-5" stroke="#6FA8BC" strokeWidth="2.1" strokeLinecap="round" />
          <circle cx="20" cy="20" r="3.1" fill="#E4B44C" />
        </svg>
        <p style={{ color: '#6E8A82', fontSize: 13, letterSpacing: '.05em' }}>DRC.Geo</p>
      </div>
    </div>
  )
}

function Shell({ data }: { data: DrcData }) {
  const { selection, clearSelection } = useAppState()
  const { mode, selectedPark, setSelectedPark } = useLayer()
  const { t, lang } = useLanguage()
  useUrlSync(data, lang)
  const [quizOpen, setQuizOpen] = useState(false)

  const unit = selection.view === 'unit' ? data.byPcode.get(selection.pcode) : null
  const showFiche = (mode === 'provinces' || mode === 'density') && !!unit
  const park = selectedPark ? data.sanctuaries.find((p) => p.id === selectedPark) : null

  // Esc closes whatever dossier is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (park) setSelectedPark(null)
      else if (unit) clearSelection()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [park, unit, setSelectedPark, clearSelection])

  const showHint = mode === 'provinces' && !unit

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <FleuveMap data={data} />

      <Brand />
      <Breadcrumb data={data} />
      <div className="fl-topright">
        <FleuveSearch data={data} />
        <PwaChrome />
        <button className="fl-pill" onClick={() => setQuizOpen(true)} aria-label={t('play')}>
          🎮
        </button>
        <LangToggle />
      </div>

      <OptionsPanel />

      {mode === 'parks' && <SanctuairesRail parks={data.sanctuaries} selectedPark={selectedPark} onSelect={setSelectedPark} />}
      {(mode === 'parks' || mode === 'density') && <FleuveLegend mode={mode} data={data} />}
      {mode === 'histoire' && <HistoirePanel data={data} />}

      {showFiche && unit && (
        <aside className="fl-fiche">
          <FicheDossier data={data} unit={unit} onClose={clearSelection} />
        </aside>
      )}
      {mode === 'parks' && park && (
        <aside className="fl-pdetail">
          <ParkDossier park={park} onClose={() => setSelectedPark(null)} />
        </aside>
      )}

      {showHint && <div className="fl-hint">{t('hoverHint')}</div>}

      {quizOpen && <QuizMode data={data} onClose={() => setQuizOpen(false)} />}
    </div>
  )
}

function AppContent() {
  const state = useDrcData()
  if (state.status === 'loading') return <LoadingState />
  if (state.status === 'error') {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: 'var(--abyss)', color: '#8FB3A9' }}>
        <p>Erreur : {state.error}</p>
      </div>
    )
  }
  return <Shell data={state.data} />
}

function App() {
  return (
    <LanguageProvider>
      <AppStateProvider>
        <LayerProvider>
          <AppContent />
        </LayerProvider>
      </AppStateProvider>
    </LanguageProvider>
  )
}

export default App
