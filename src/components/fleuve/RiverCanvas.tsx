import { useEffect, useRef } from 'react'

interface RiverSceneInstance {
  start: () => void
  destroy: () => void
}
declare global {
  interface Window {
    RiverScene?: new (canvas: HTMLCanvasElement, opts?: Record<string, unknown>) => RiverSceneInstance
  }
}

let loader: Promise<void> | null = null

/** Loads /river.js (a classic script in public/, not part of the module graph) once. */
function loadRiverScript(): Promise<void> {
  if (window.RiverScene) return Promise.resolve()
  if (loader) return loader
  loader = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = '/river.js'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('failed to load /river.js'))
    document.head.appendChild(s)
  })
  return loader
}

/**
 * The animated Congo — the bottom layer of the stage. The map SVG draws above
 * it, with an opaque land mass so the country reads as land on water.
 * river.js already honours prefers-reduced-motion and pauses on tab hide.
 */
export function RiverCanvas() {
  const ref = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    let scene: RiverSceneInstance | null = null
    let cancelled = false

    // Building the landscape is ~600ms of scripting, and the rAF loop then runs
    // forever — both in front of first paint if started eagerly. Wait until the
    // browser is idle so the map, the header and the hint paint first.
    // Safari only shipped requestIdleCallback in 16.4, so treat it as optional.
    const ric = window.requestIdleCallback as
      | ((cb: IdleRequestCallback, o?: IdleRequestOptions) => number)
      | undefined
    let idle = 0
    const whenIdle = (fn: () => void) => {
      idle = ric ? ric.call(window, fn, { timeout: 2500 }) : window.setTimeout(fn, 300)
    }

    loadRiverScript()
      .then(
        () =>
          new Promise<void>((resolve) => {
            whenIdle(() => resolve())
          }),
      )
      .then(() => {
        if (cancelled || !ref.current || !window.RiverScene) return
        // Per coowork's note: the landscape is ~5200 tree crowns at density 1,
        // which is heavy for low-end phones. Scale it down on small screens
        // rather than dropping the animation.
        const w = window.innerWidth
        const density = w < 600 ? 0.3 : w < 1000 ? 0.7 : 1
        scene = new window.RiverScene(ref.current, { density })
        scene.start()
      })
      .catch((err) => console.warn('[river]', err))

    return () => {
      cancelled = true
      if (ric) window.cancelIdleCallback(idle)
      else clearTimeout(idle)
      scene?.destroy()
    }
  }, [])

  return <canvas id="river" ref={ref} className="fl-river" aria-hidden />
}
