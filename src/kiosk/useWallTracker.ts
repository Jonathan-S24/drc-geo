import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Browser half of the wall tracker (see wall/tracker.py). The Python process
 * watches the webcam and streams the fingertip's position — already mapped
 * into the unit square of the projected image — at ~30 Hz over a local
 * WebSocket. This hook turns that stream into something the app already
 * understands: hover (so tooltips appear as the hand moves), and a click
 * when the tracker says the finger has dwelt long enough.
 *
 * It never touches the OS cursor. The tracker needs no Accessibility
 * permission, and the app keeps `cursor: none` from kiosk mode — the cursor
 * people see is drawn by <WallOverlay/> from this hook's state.
 *
 * Turn on with `?wall=1` (which also turns kiosk mode on, since one without
 * the other makes no sense); `?wall=0` turns it off again.
 *
 * Own this hook from a small leaf component (<WallOverlay/>), never from the
 * Shell: position updates land 30 times a second, and each one re-renders
 * whatever component holds the state.
 */

const WALL_KEY = 'drcgeo-wall'
const KIOSK_KEY = 'drcgeo-kiosk'
const WS_URL = 'ws://127.0.0.1:8765'
/** Edge band of a scrollable panel (fraction of its height) that auto-scrolls. */
const SCROLL_EDGE = 0.2
const SCROLL_PX_PER_FRAME = 6

function readWallParam(): boolean | null {
  const params = new URLSearchParams(window.location.search)
  if (!params.has('wall')) return null
  return params.get('wall') !== '0'
}

function readStoredWallFlag(): boolean {
  try {
    return localStorage.getItem(WALL_KEY) === '1'
  } catch {
    return false
  }
}

/** Also read by useKioskMode: wall mode implies kiosk mode. */
export function resolveWallFlag(): boolean {
  return readWallParam() ?? readStoredWallFlag()
}

export interface WallState {
  active: boolean
  /** WebSocket to the tracker is open. */
  connected: boolean
  /** The tracker has a homography (or is simulating). */
  calibrated: boolean
  /** Fingertip in unit coordinates of the viewport, or null when no hand. */
  pos: { x: number; y: number } | null
  /** 0..1 progress towards a dwell click. */
  dwell: number
  /** The finger is in an edge band that is auto-scrolling a panel. */
  scrolling: boolean
  /** Calibration in progress: which target (0-3) and how far into the hold. */
  cal: { step: number; total: number; progress: number; present: boolean; phase: 'hold' | 'move'; restarted: boolean } | null
  startCalibration: () => void
}

type Msg =
  | { t: 'hello'; calibrated: boolean; simulate: boolean }
  | { t: 'pos'; present: false; uncalibrated?: boolean }
  | { t: 'pos'; present: true; x: number; y: number; dwell: number }
  | { t: 'click'; x: number; y: number }
  | { t: 'cal'; step: number; total: number; progress: number; present: boolean; phase: 'hold' | 'move'; restarted?: boolean }
  | { t: 'cal_done' }

const POINTER_ID = 7

function fire(target: Element, type: string, x: number, y: number, related: Element | null = null) {
  const base: MouseEventInit = {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
    view: window,
    button: 0,
    buttons: type.endsWith('down') ? 1 : 0,
    relatedTarget: related,
  }
  if (type.startsWith('pointer')) {
    target.dispatchEvent(new PointerEvent(type, { ...base, pointerId: POINTER_ID, pointerType: 'touch', isPrimary: true }))
  } else {
    target.dispatchEvent(new MouseEvent(type, base))
  }
}

/** The nearest ancestor that can actually scroll vertically, if any. */
function scrollableAncestor(el: Element | null): HTMLElement | null {
  let node: Element | null = el
  while (node && node !== document.body) {
    if (node instanceof HTMLElement && node.scrollHeight > node.clientHeight + 2) {
      const oy = getComputedStyle(node).overflowY
      if (oy === 'auto' || oy === 'scroll') return node
    }
    node = node.parentElement
  }
  return null
}

export function useWallTracker(): WallState {
  const [active] = useState(resolveWallFlag)
  const [connected, setConnected] = useState(false)
  const [calibrated, setCalibrated] = useState(false)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const [dwell, setDwell] = useState(0)
  const [scrolling, setScrolling] = useState(false)
  const [cal, setCal] = useState<WallState['cal']>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const hoverRef = useRef<Element | null>(null)
  const scrollingRef = useRef(false)
  const calRef = useRef<WallState['cal']>(null)
  calRef.current = cal

  // Persist an explicit ?wall= param (and switch kiosk on with it), then strip it.
  useEffect(() => {
    const param = readWallParam()
    if (param === null) return
    try {
      localStorage.setItem(WALL_KEY, param ? '1' : '0')
      if (param) localStorage.setItem(KIOSK_KEY, '1')
    } catch {
      /* private mode */
    }
    const url = new URL(window.location.href)
    url.searchParams.delete('wall')
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
  }, [])

  /** Hover: tell the element under the finger it is being pointed at. */
  const hoverAt = useCallback((x: number, y: number) => {
    const el = document.elementFromPoint(x, y)
    const prev = hoverRef.current
    if (el !== prev) {
      if (prev) {
        fire(prev, 'pointerout', x, y, el)
        fire(prev, 'mouseout', x, y, el)
      }
      if (el) {
        fire(el, 'pointerover', x, y, prev)
        fire(el, 'mouseover', x, y, prev)
      }
      hoverRef.current = el
    }
    if (el) {
      fire(el, 'pointermove', x, y)
      fire(el, 'mousemove', x, y)
    }

    // Edge auto-scroll: the only way a finger can reach content below the
    // fold of a dossier. While a panel is scrolling, dwell clicks are dropped —
    // whatever is under a still finger is moving.
    const panel = scrollableAncestor(el)
    let didScroll = false
    if (panel) {
      const r = panel.getBoundingClientRect()
      const band = r.height * SCROLL_EDGE
      if (y > r.bottom - band && panel.scrollTop + panel.clientHeight < panel.scrollHeight - 1) {
        panel.scrollTop += SCROLL_PX_PER_FRAME
        didScroll = true
      } else if (y < r.top + band && panel.scrollTop > 0) {
        panel.scrollTop -= SCROLL_PX_PER_FRAME
        didScroll = true
      }
    }
    if (didScroll !== scrollingRef.current) {
      scrollingRef.current = didScroll
      setScrolling(didScroll)
    }
  }, [])

  const clearHover = useCallback(() => {
    const prev = hoverRef.current
    if (prev) {
      fire(prev, 'pointerout', -1, -1)
      fire(prev, 'mouseout', -1, -1)
      hoverRef.current = null
    }
    if (scrollingRef.current) {
      scrollingRef.current = false
      setScrolling(false)
    }
  }, [])

  const clickAt = useCallback((x: number, y: number) => {
    if (scrollingRef.current) return
    const el = document.elementFromPoint(x, y)
    if (!el) return
    // The same sequence a real tap produces, so every existing handler —
    // onClick on buttons and map shapes, onPointerUp on the kiosk gate, the
    // ripple's pointerdown, the idle timer — sees an ordinary tap.
    fire(el, 'pointerdown', x, y)
    fire(el, 'mousedown', x, y)
    fire(el, 'pointerup', x, y)
    fire(el, 'mouseup', x, y)
    fire(el, 'click', x, y)
    if (el instanceof HTMLElement && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) el.focus()
  }, [])

  useEffect(() => {
    if (!active) return
    let ws: WebSocket | null = null
    let retry = 0
    let closed = false

    const connect = () => {
      if (closed) return
      ws = new WebSocket(WS_URL)
      wsRef.current = ws
      ws.onopen = () => {
        retry = 0
        setConnected(true)
      }
      ws.onmessage = (ev) => {
        let msg: Msg
        try {
          msg = JSON.parse(ev.data as string) as Msg
        } catch {
          return
        }
        const W = window.innerWidth
        const H = window.innerHeight
        switch (msg.t) {
          case 'hello':
            setCalibrated(msg.calibrated)
            break
          case 'pos':
            if (msg.present) {
              const x = msg.x * W
              const y = msg.y * H
              setPos({ x: msg.x, y: msg.y })
              setDwell(msg.dwell)
              hoverAt(x, y)
            } else {
              setPos(null)
              setDwell(0)
              clearHover()
              if (msg.uncalibrated) setCalibrated(false)
            }
            break
          case 'click':
            clickAt(msg.x * W, msg.y * H)
            break
          case 'cal':
            setCal((prev) => ({
              step: msg.step,
              total: msg.total,
              progress: msg.progress,
              present: msg.present,
              phase: msg.phase,
              // Latch the restart notice until the next corner is captured.
              restarted: msg.restarted || (prev?.restarted === true && msg.step === 0),
            }))
            setPos(null)
            setDwell(0)
            break
          case 'cal_done':
            setCal(null)
            setCalibrated(true)
            break
        }
      }
      ws.onclose = () => {
        setConnected(false)
        setPos(null)
        setDwell(0)
        clearHover()
        wsRef.current = null
        // The tracker may simply not be running yet; keep trying, gently.
        const delay = Math.min(5000, 500 * 2 ** retry++)
        window.setTimeout(connect, delay)
      }
      ws.onerror = () => ws?.close()
    }
    connect()

    return () => {
      closed = true
      ws?.close()
    }
  }, [active, hoverAt, clearHover, clickAt])

  const startCalibration = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ t: 'calibrate' }))
  }, [])

  // C starts (or restarts) calibration; Esc cancels it. Operator keys only.
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return
      if (e.repeat) return // a held key auto-repeats; one press is one press
      if (e.key === 'c' || e.key === 'C') startCalibration()
      else if (e.key === 'Escape' && calRef.current) wsRef.current?.send(JSON.stringify({ t: 'cancel' }))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, startCalibration])

  return { active, connected, calibrated, pos, dwell, scrolling, cal, startCalibration }
}
