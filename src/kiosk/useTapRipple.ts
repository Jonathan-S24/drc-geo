import { useEffect } from 'react'

const LAYER_ID = 'kiosk-ripple-layer'
/** Matches the CSS animation duration in index.css (.kiosk-ripple). */
const RIPPLE_MS = 550

/**
 * The instant-feedback layer kiosk mode asked for: a small ripple appears at
 * the exact point of contact on `pointerdown` — before any click, hover or
 * CSS transition — so a touch on the wall reads as felt immediately, the way
 * a keypad does. Fires for every pointer type (not just touch) so it also
 * shows up during setup with a mouse or trackpad.
 */
export function useTapRipple(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return

    let layer = document.getElementById(LAYER_ID)
    if (!layer) {
      layer = document.createElement('div')
      layer.id = LAYER_ID
      document.body.appendChild(layer)
    }
    const layerEl = layer

    const onPointerDown = (e: PointerEvent) => {
      const ripple = document.createElement('span')
      ripple.className = 'kiosk-ripple'
      ripple.style.left = `${e.clientX}px`
      ripple.style.top = `${e.clientY}px`
      layerEl.appendChild(ripple)
      window.setTimeout(() => ripple.remove(), RIPPLE_MS)
    }

    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      layerEl.remove()
    }
  }, [enabled])
}
