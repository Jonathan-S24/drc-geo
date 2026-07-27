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

    loadRiverScript()
      .then(() => {
        if (cancelled || !ref.current || !window.RiverScene) return
        scene = new window.RiverScene(ref.current)
        scene.start()
      })
      .catch((err) => console.warn('[river]', err))

    return () => {
      cancelled = true
      scene?.destroy()
    }
  }, [])

  return <canvas id="river" ref={ref} className="fl-river" aria-hidden />
}
