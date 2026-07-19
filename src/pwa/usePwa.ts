import { useEffect, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// Registered once at module load; autoUpdate applies new SWs on next navigation.
const updateSW = registerSW({ immediate: true })
void updateSW

let deferredPrompt: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredPrompt = e as BeforeInstallPromptEvent
  listeners.forEach((l) => l())
})
window.addEventListener('appinstalled', () => {
  deferredPrompt = null
  listeners.forEach((l) => l())
})

export interface PwaState {
  online: boolean
  canInstall: boolean
  promptInstall: () => Promise<void>
}

export function usePwa(): PwaState {
  const [online, setOnline] = useState(navigator.onLine)
  const [canInstall, setCanInstall] = useState(deferredPrompt !== null)

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    const sync = () => setCanInstall(deferredPrompt !== null)
    listeners.add(sync)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
      listeners.delete(sync)
    }
  }, [])

  const promptInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    deferredPrompt = null
    listeners.forEach((l) => l())
  }

  return { online, canInstall, promptInstall }
}
