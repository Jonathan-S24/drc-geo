import { useCallback, useEffect, useRef, useState } from 'react'
import { resolveWallFlag } from './useWallTracker'

/**
 * Exhibition / kiosk touch mode — for a laptop driving a projector with an
 * infrared touch frame on the wall. Turn it on once with `?kiosk=1` (the flag
 * persists in localStorage so a reboot mid-exhibition doesn't need the URL
 * retyped); `?kiosk=0` turns it back into the normal public site.
 *
 * On top of the regular app this adds:
 *  - a full-bleed "touch to begin" gate that requests fullscreen + a screen
 *    wake lock on the first real touch (both need a user gesture, so they
 *    cannot happen on load)
 *  - an idle timer that resets the app to the home map and re-shows the gate
 *    as an attract screen, so the next visitor never inherits a stranger's
 *    quiz-in-progress or selected place
 *  - guards against the things a wall of curious fingers triggers that a
 *    single mouse-and-keyboard visitor never does: pinch/double-tap zoom,
 *    text selection, long-press menus, stray two-finger gestures, and any
 *    outbound link (mailto:, target=_blank) that would strand a fullscreen
 *    kiosk on a page with no address bar and no way back
 */

const KIOSK_KEY = 'drcgeo-kiosk'
/** No touch for this long → reset to the home map and show the attract gate. */
const IDLE_MS = 75_000

/** Reads the `?kiosk=` param without touching anything — safe for a render-time read. */
function readKioskParam(): boolean | null {
  const params = new URLSearchParams(window.location.search)
  if (!params.has('kiosk')) return null
  return params.get('kiosk') !== '0'
}

function readStoredKioskFlag(): boolean {
  try {
    return localStorage.getItem(KIOSK_KEY) === '1'
  } catch {
    return false
  }
}

function resolveKioskFlag(): boolean {
  // Wall tracking (a camera-tracked finger) only makes sense on a kiosk.
  return readKioskParam() ?? (readStoredKioskFlag() || resolveWallFlag())
}

export interface KioskState {
  /** True for the whole session once resolved — kiosk mode never flips mid-visit. */
  active: boolean
  /** The full-bleed "touch to begin" / attract overlay should render on top. */
  showGate: boolean
  /** Call on the gate's own tap: hides it, claims fullscreen + wake lock, arms the idle timer. */
  dismissGate: () => void
}

/**
 * @param onIdleReset called once when the idle timer fires, before the gate
 * reappears — the caller resets its own app state (clear selection, close
 * panels, back to the provinces layer) so the attract screen never covers a
 * live "quiz open" or "place selected" state.
 */
export function useKioskMode(onIdleReset: () => void): KioskState {
  const [active] = useState(resolveKioskFlag)
  const [showGate, setShowGate] = useState(active)
  const idleTimerRef = useRef<number | undefined>(undefined)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const showGateRef = useRef(showGate)
  showGateRef.current = showGate

  const armIdleTimer = useCallback(() => {
    window.clearTimeout(idleTimerRef.current)
    idleTimerRef.current = window.setTimeout(() => {
      onIdleReset()
      setShowGate(true)
    }, IDLE_MS)
  }, [onIdleReset])

  const requestWakeLock = useCallback(async () => {
    try {
      wakeLockRef.current = (await navigator.wakeLock?.request('screen')) ?? null
    } catch {
      // Unsupported, or the browser refused it — the operator disables OS
      // sleep/screensaver by hand as a fallback (see the exhibition notes).
    }
  }, [])

  const dismissGate = useCallback(() => {
    setShowGate(false)
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {
        // Browser chrome can refuse without a "stricter" gesture — not fatal,
        // the app still works windowed, just with the OS chrome visible.
      })
    }
    void requestWakeLock()
    armIdleTimer()
  }, [armIdleTimer, requestWakeLock])

  // The Wake Lock spec releases the lock when the tab is hidden; re-acquire
  // it when it comes back (e.g. a stray alt-tab during setup).
  useEffect(() => {
    if (!active) return
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !showGateRef.current) void requestWakeLock()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [active, requestWakeLock])

  // Idle detection only runs once the gate has been dismissed — no point
  // resetting "activity" while the gate itself is covering the screen.
  useEffect(() => {
    if (!active || showGate) return
    armIdleTimer()
    const bump = () => armIdleTimer()
    window.addEventListener('pointerdown', bump)
    window.addEventListener('touchstart', bump)
    // A hand moving in front of the wall is someone present, even before it
    // settles on anything — the tracker dispatches pointermove for it.
    window.addEventListener('pointermove', bump)
    return () => {
      window.clearTimeout(idleTimerRef.current)
      window.removeEventListener('pointerdown', bump)
      window.removeEventListener('touchstart', bump)
      window.removeEventListener('pointermove', bump)
    }
  }, [active, showGate, armIdleTimer])

  // Persist an explicit `?kiosk=` param to localStorage and strip it from the
  // URL, so it doesn't linger in every path the app pushes afterwards and a
  // reboot mid-exhibition doesn't need it retyped. A real side effect, so it
  // belongs here rather than in the state initializer above.
  useEffect(() => {
    const param = readKioskParam()
    if (param === null) return
    try {
      localStorage.setItem(KIOSK_KEY, param ? '1' : '0')
    } catch {
      // Private/incognito mode — the flag just won't survive a reload; the
      // operator can pass ?kiosk=1 again if that ever happens mid-exhibition.
    }
    const url = new URL(window.location.href)
    url.searchParams.delete('kiosk')
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
  }, [])

  // One-time setup for the whole kiosk session: the CSS hook plus every
  // guard rail against what a wall of fingers does that a single visitor
  // with a mouse never triggers.
  useEffect(() => {
    if (!active) return
    document.documentElement.classList.add('kiosk-mode')

    const meta = document.querySelector('meta[name="viewport"]')
    const prevContent = meta?.getAttribute('content') ?? null
    if (meta && prevContent) meta.setAttribute('content', `${prevContent}, maximum-scale=1, user-scalable=no`)

    // Long-press context menu, and a stray right-click from the trackpad
    // used to set the kiosk up in the first place.
    const stopContext = (e: Event) => e.preventDefault()
    document.addEventListener('contextmenu', stopContext)
    // Safari's own pinch gesture event, separate from touch pinch-zoom.
    document.addEventListener('gesturestart', stopContext as EventListener)

    // Backup to `touch-action: manipulation` for engines that still let a
    // second finger pinch-zoom the whole page.
    const stopMultiTouch = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault()
    }
    document.addEventListener('touchmove', stopMultiTouch, { passive: false })

    // Every outbound link in the app — "report an error" (mailto:), the
    // Wikimedia upload link, the /privacy tab — would strand a fullscreen
    // kiosk with no address bar and no way back. Let the tap register (the
    // ripple still fires) but never actually navigate away.
    const stopOutbound = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest('a')
      if (!a) return
      const href = a.getAttribute('href') ?? ''
      if (a.target === '_blank' || href.startsWith('mailto:') || href.startsWith('tel:')) {
        e.preventDefault()
      }
    }
    document.addEventListener('click', stopOutbound, true)

    return () => {
      document.documentElement.classList.remove('kiosk-mode')
      if (meta && prevContent) meta.setAttribute('content', prevContent)
      document.removeEventListener('contextmenu', stopContext)
      document.removeEventListener('gesturestart', stopContext as EventListener)
      document.removeEventListener('touchmove', stopMultiTouch)
      document.removeEventListener('click', stopOutbound, true)
    }
  }, [active])

  return { active, showGate, dismissGate }
}
