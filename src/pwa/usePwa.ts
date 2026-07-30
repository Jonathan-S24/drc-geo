import { useEffect, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const VISITS_KEY = 'drcgeo-visits'
const DISMISS_KEY = 'drcgeo-install-dismissed'
/** Show the pill from the 2nd visit, or after this long on the first. */
const FIRST_VISIT_DELAY_MS = 30_000

let deferredPrompt: BeforeInstallPromptEvent | null = null
let updateReady = false
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

// autoUpdate installs the new SW; onNeedRefresh lets us surface a toast first.
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateReady = true
    notify()
  },
})

window.addEventListener('beforeinstallprompt', (e) => {
  // Fires in Chrome/Edge on Android AND on desktop — never gate this by width.
  e.preventDefault()
  deferredPrompt = e as BeforeInstallPromptEvent
  notify()
})
window.addEventListener('appinstalled', () => {
  deferredPrompt = null
  try {
    localStorage.setItem(DISMISS_KEY, '1')
  } catch {
    /* private mode */
  }
  notify()
})

/** Standalone = already installed, so never nag. */
export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/** iOS Safari has no beforeinstallprompt — it needs share-sheet instructions. */
export function isIos(): boolean {
  const ua = navigator.userAgent
  const iOSDevice = /iPad|iPhone|iPod/.test(ua)
  // iPadOS 13+ reports as Mac; the touch points give it away.
  const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  return iOSDevice || iPadOS
}

function bumpVisits(): number {
  try {
    const n = Number(localStorage.getItem(VISITS_KEY) || 0) + 1
    localStorage.setItem(VISITS_KEY, String(n))
    return n
  } catch {
    return 1
  }
}
const visitCount = bumpVisits()

export interface PwaState {
  online: boolean
  /** Chrome/Edge (desktop + Android) captured an install event. */
  canInstall: boolean
  /** iOS Safari, not yet installed — show share-sheet instructions instead. */
  showIosHint: boolean
  /** Timing + dismissal have been satisfied. */
  promptVisible: boolean
  dismissPrompt: () => void
  promptInstall: () => Promise<void>
  updateReady: boolean
  applyUpdate: () => void
}

export function usePwa(): PwaState {
  const [online, setOnline] = useState(navigator.onLine)
  const [canInstall, setCanInstall] = useState(deferredPrompt !== null)
  const [update, setUpdate] = useState(updateReady)
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      return false
    }
  })
  // Second visit onwards it can appear immediately; on a first visit we wait.
  const [timeElapsed, setTimeElapsed] = useState(visitCount >= 2)

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    const sync = () => {
      setCanInstall(deferredPrompt !== null)
      setUpdate(updateReady)
    }
    listeners.add(sync)
    const timer = timeElapsed ? undefined : window.setTimeout(() => setTimeElapsed(true), FIRST_VISIT_DELAY_MS)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
      listeners.delete(sync)
      if (timer) clearTimeout(timer)
    }
  }, [timeElapsed])

  const installed = isStandalone()
  const showIosHint = !installed && !dismissed && isIos() && !canInstall
  const promptVisible = !installed && !dismissed && timeElapsed && (canInstall || showIosHint)

  const dismissPrompt = () => {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* private mode */
    }
  }

  const promptInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    deferredPrompt = null
    if (outcome === 'dismissed') dismissPrompt()
    notify()
  }

  return {
    online,
    canInstall,
    showIosHint,
    promptVisible,
    dismissPrompt,
    promptInstall,
    updateReady: update,
    applyUpdate: () => updateSW(true),
  }
}
