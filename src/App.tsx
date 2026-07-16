import { useEffect, useState } from 'react'
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
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // On mobile, sidebar and detail panel are both full-screen overlays and
  // can't show at once — picking a unit/province/compare closes the drawer.
  useEffect(() => {
    if (hasPanel) setSidebarOpen(false)
  }, [hasPanel])

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header data={data} onToggleSidebar={() => setSidebarOpen((o) => !o)} />
      <CaveatsBanner />
      <main className="relative flex min-h-0 flex-1">
        <div
          className={`fixed inset-0 z-[1100] bg-card transition-transform duration-200 md:static md:z-auto md:w-[340px] md:min-w-[280px] md:translate-x-0 md:border-r md:border-line md:transition-none ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <Sidebar data={data} onClose={() => setSidebarOpen(false)} />
        </div>
        <div className="relative flex-1">
          <MapView data={data} />
        </div>
        {hasPanel && (
          <div className="fixed inset-0 z-[1100] bg-card md:static md:z-auto md:w-[400px] md:min-w-[320px] md:border-l md:border-line">
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
