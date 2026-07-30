import { useEffect, useState } from 'react'
import { LanguageProvider, useLanguage } from './i18n/LanguageContext'
import { AppStateProvider, useAppState } from './state/AppStateContext'
import { LayerProvider, useLayer, type MapMode } from './state/LayerContext'
import { useDrcData, type DrcData } from './data/useDrcData'
import { useUrlSync } from './routing/useUrlSync'
import { FleuveMap } from './components/FleuveMap'
import { RiverCanvas } from './components/fleuve/RiverCanvas'
import { Brand, Breadcrumb, LangToggle, FleuveSearch, OptionsPanel } from './components/fleuve/FleuveChrome'
import { FicheDossier } from './components/fleuve/FicheDossier'
import { ParkDossier } from './components/fleuve/ParkDossier'
import { SanctuairesRail } from './components/fleuve/SanctuairesRail'
import { FleuveLegend } from './components/fleuve/FleuveLegend'
import { HistoirePanel } from './components/fleuve/HistoirePanel'
import { PwaChrome, PwaPrompts } from './components/PwaChrome'
import { QuizMode } from './components/QuizMode'

/**
 * Fades out and removes the boot splash that index.html painted straight from
 * the HTML. It lives outside #root deliberately: React mounting must not wipe
 * it, because it is what the first paint (and the LCP measurement) sees.
 */
function dismissBootSplash() {
  const boot = document.getElementById('boot')
  if (!boot || boot.classList.contains('gone')) return
  boot.classList.add('gone')
  boot.addEventListener('transitionend', () => boot.remove(), { once: true })
  // Belt and braces if the transition never fires (reduced motion, hidden tab).
  window.setTimeout(() => boot.remove(), 900)
}

function Shell({ data }: { data: DrcData }) {
  const { selection, clearSelection } = useAppState()
  const { mode, setMode, selectedPark, setSelectedPark, eraIndex } = useLayer()
  const { t, lang } = useLanguage()
  useUrlSync(data, lang)
  const [quizOpen, setQuizOpen] = useState(false)
  // The legend is dismissable; reopening a layer brings it back.
  const [legendClosed, setLegendClosed] = useState(false)
  useEffect(() => setLegendClosed(false), [mode])

  const legendVisible = mode !== 'provinces' && !legendClosed
  const unit = selection.view === 'unit' ? data.byPcode.get(selection.pcode) : null
  const showFiche = (mode === 'provinces' || mode === 'sante') && !!unit
  const park = selectedPark ? data.sanctuaries.find((p) => p.id === selectedPark) : null

  // Keyboard: Esc closes panels, 1–4 switch layers, Space plays/pauses the
  // anthem. ("/" for search lives in FleuveSearch, arrows in its result list.)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement
      const typing = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
      if (e.key === 'Escape') {
        if (quizOpen) setQuizOpen(false)
        else if (park) setSelectedPark(null)
        else if (unit) clearSelection()
        return
      }
      if (typing || quizOpen || e.metaKey || e.ctrlKey || e.altKey) return
      if ((e.key === ' ' || e.code === 'Space') && mode === 'histoire') {
        // Space toggles the era's anthem without scrolling the page. A focused
        // <button> already activates on Space, so don't double-fire it.
        const play = document.querySelector<HTMLButtonElement>('.fl-hist button[aria-label]')
        if (play && el !== play) {
          e.preventDefault()
          play.click()
        }
        return
      }
      const layer = { '1': 'provinces', '2': 'parks', '3': 'sante', '4': 'histoire' }[e.key] as
        | MapMode
        | undefined
      if (layer) {
        e.preventDefault()
        setMode(layer)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [park, unit, setSelectedPark, clearSelection, mode, setMode, quizOpen])

  const showHint = mode === 'provinces' && !unit

  return (
    <div
      className={`relative h-screen w-screen overflow-hidden${mode === 'parks' ? ' rail-on' : ''}${
        mode === 'histoire' ? ' tl-on' : ''
      }${showFiche ? ' fiche-on' : ''}${legendVisible ? ' legend-on' : ''}`}
    >
      <RiverCanvas />
      <FleuveMap
        data={data}
        fitKey={`${mode}|${showFiche ? unit?.pcode : ''}|${selectedPark ?? ''}|${eraIndex}|${legendVisible}`}
      />

      <Brand />
      <Breadcrumb data={data} />
      <div className="fl-topright">
        <FleuveSearch data={data} />
        <PwaChrome />
        <LangToggle />
      </div>

      <OptionsPanel onOpenQuiz={() => setQuizOpen(true)} />

      {mode === 'parks' && <SanctuairesRail parks={data.sanctuaries} selectedPark={selectedPark} onSelect={setSelectedPark} />}
      {legendVisible && (
        <FleuveLegend mode={mode} data={data} onClose={() => setLegendClosed(true)} />
      )}
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

      <PwaPrompts />

      {quizOpen && <QuizMode data={data} onClose={() => setQuizOpen(false)} />}
    </div>
  )
}

function AppContent() {
  const state = useDrcData()
  const ready = state.status !== 'loading'
  useEffect(() => {
    if (ready) dismissBootSplash()
  }, [ready])
  if (state.status === 'loading') return null
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
