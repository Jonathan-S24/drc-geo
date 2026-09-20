import { useReducedMotion } from '../theme/useReducedMotion'

/**
 * The exhibition's "attract" screen. Shown before the first touch (where it
 * also doubles as the user gesture that claims fullscreen + a wake lock —
 * both require one, so they can't happen on page load), and again after any
 * stretch of idle time between visitors.
 *
 * Bilingual by design, not by the app's FR/EN toggle: a passerby who hasn't
 * touched anything yet hasn't chosen a language, so both are shown at once,
 * French first to match the rest of the app's convention.
 */
export function KioskGate({ onBegin }: { onBegin: () => void }) {
  const reduced = useReducedMotion()
  return (
    <div className="kiosk-gate" onPointerUp={onBegin} role="button" aria-label="Touchez l'écran pour commencer · Touch the screen to begin">
      <div className="kiosk-gate-band" />
      <svg
        className={`kiosk-gate-mark${reduced ? '' : ' pulse'}`}
        width="120"
        height="120"
        viewBox="0 0 40 40"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="20" cy="20" r="18.5" stroke="#C87941" strokeWidth="1" opacity=".55" />
        <path d="M8 27c5-1.5 6.5-7 11-9s7.5-.5 13-5" stroke="#6FA8BC" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="20" cy="20" r="2.6" fill="#E4B44C" />
      </svg>
      <h1 className="kiosk-gate-title">DRC&#8202;Geo</h1>
      <p className="kiosk-gate-line kiosk-gate-line--fr">Touchez l&rsquo;écran pour explorer la RDC</p>
      <p className="kiosk-gate-line kiosk-gate-line--en">Touch the screen to explore the DRC</p>
      <div className="kiosk-gate-stats">26 provinces · 145 territoires · 44 villes</div>
    </div>
  )
}
