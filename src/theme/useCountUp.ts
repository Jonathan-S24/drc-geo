import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from './useReducedMotion'

/** Animates a figure up from 0 (cubic ease) on mount / value change.
 *  Reduced-motion shows the final value immediately. */
export function useCountUp(target: number | null, locale: string, durationMs = 900): string {
  const reduced = useReducedMotion()
  const [value, setValue] = useState(target ?? 0)
  const rafRef = useRef(0)

  useEffect(() => {
    if (target == null) return
    if (reduced) {
      setValue(target)
      return
    }
    const start = performance.now()
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / durationMs)
      const eased = 1 - Math.pow(1 - k, 3)
      setValue(Math.round(target * eased))
      if (k < 1) rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, reduced, durationMs])

  if (target == null) return '—'
  return value.toLocaleString(locale)
}
