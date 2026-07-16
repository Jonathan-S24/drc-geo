import { LanguageProvider } from './i18n/LanguageContext'
import { AppStateProvider, useAppState } from './state/AppStateContext'
import { useDrcData } from './data/useDrcData'
import { Header } from './components/Header'
import { CaveatsBanner } from './components/CaveatsBanner'
import { Sidebar } from './components/Sidebar'
import { MapView } from './components/MapView'
import { DetailPanel } from './components/DetailPanel'
import { ProvinceDetailPanel } from './components/ProvinceDetailPanel'
import { CompareView } from './components/CompareView'
import type { DrcData } from './data/useDrcData'

function AppShell({ data }: { data: DrcData }) {
  const { selection } = useAppState()
  const hasPanel = selection.view !== 'none'

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header data={data} />
      <CaveatsBanner />
      <main className="flex min-h-0 flex-1">
        <div className="w-[340px] min-w-[280px] border-r border-line">
          <Sidebar data={data} />
        </div>
        <div className="relative flex-1">
          <MapView data={data} />
        </div>
        {hasPanel && (
          <div className="w-[400px] min-w-[320px] border-l border-line bg-card">
            {selection.view === 'unit' && <DetailPanel data={data} pcode={selection.pcode} />}
            {selection.view === 'province' && <ProvinceDetailPanel data={data} name={selection.name} />}
            {selection.view === 'compare' && <CompareView data={data} />}
          </div>
        )}
      </main>
    </div>
  )
}

function AppContent() {
  const state = useDrcData()

  if (state.status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center text-ink/60">
        <p>Chargement des données…</p>
      </div>
    )
  }
  if (state.status === 'error') {
    return (
      <div className="flex h-screen items-center justify-center text-ink/60">
        <p>Erreur de chargement des données : {state.error}</p>
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
