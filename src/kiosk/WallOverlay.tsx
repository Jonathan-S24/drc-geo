import { useWallTracker } from './useWallTracker'

const RING_R = 26
const RING_C = 2 * Math.PI * RING_R

/**
 * Everything the visitor sees of the wall tracker: a cursor that follows the
 * fingertip, a ring that fills while they hold still, and — for the operator —
 * the four-corner calibration screen and a status chip when the tracker
 * isn't running. Owns the tracker hook so its 30 Hz updates re-render only
 * this leaf, never the map.
 *
 * With a real touch surface a finger *is* the cursor; with a camera, people
 * need to see where the system thinks they are pointing, or every miss feels
 * like the app is broken.
 */
export function WallOverlay() {
  const { active, connected, calibrated, pos, dwell, scrolling, cal } = useWallTracker()
  if (!active) return null

  return (
    <>
      {pos && !cal && (
        <div
          className={`wall-cursor${scrolling ? ' scroll' : ''}${dwell > 0 ? ' dwelling' : ''}`}
          style={{ transform: `translate3d(${pos.x * 100}vw, ${pos.y * 100}vh, 0)` }}
          aria-hidden
        >
          <svg viewBox="0 0 64 64" width="64" height="64">
            <circle cx="32" cy="32" r={RING_R} className="wall-ring-track" />
            <circle
              cx="32"
              cy="32"
              r={RING_R}
              className="wall-ring-fill"
              strokeDasharray={RING_C}
              strokeDashoffset={RING_C * (1 - dwell)}
              transform="rotate(-90 32 32)"
            />
            {scrolling ? (
              <path d="M24 28l8 8 8-8M24 20l8 8 8-8" className="wall-scroll-glyph" />
            ) : (
              <circle cx="32" cy="32" r="5" className="wall-dot" />
            )}
          </svg>
        </div>
      )}

      {cal && (
        <div className="wall-cal" aria-live="polite">
          <div className="wall-cal-band" />
          {[0, 1, 2, 3].map((i) => {
            const inset = 8
            const x = i === 0 || i === 3 ? inset : 100 - inset
            const y = i < 2 ? inset : 100 - inset
            const current = i === cal.step
            const done = i < cal.step
            return (
              <div
                key={i}
                className={`wall-cal-target${current ? ' current' : ''}${done ? ' done' : ''}`}
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                <svg viewBox="0 0 64 64" width="120" height="120">
                  <circle cx="32" cy="32" r="29" className="wall-cal-outer" />
                  <circle cx="32" cy="32" r={RING_R} className="wall-ring-track" />
                  {current && (
                    <circle
                      cx="32"
                      cy="32"
                      r={RING_R}
                      className="wall-ring-fill"
                      strokeDasharray={RING_C}
                      strokeDashoffset={RING_C * (1 - cal.progress)}
                      transform="rotate(-90 32 32)"
                    />
                  )}
                  <path d="M32 14v10M32 40v10M14 32h10M40 32h10" className="wall-cal-cross" />
                  {done && <path d="M22 33l7 7 13-14" className="wall-cal-check" />}
                </svg>
                <span className="wall-cal-num">{i + 1}</span>
              </div>
            )
          })}
          <div className="wall-cal-text">
            <h2>Calibrage · Calibration</h2>
            <p className="fr">
              Posez l&rsquo;index sur la cible <b>{cal.step + 1}</b> et gardez-le immobile jusqu&rsquo;à ce que l&rsquo;anneau se remplisse.
            </p>
            <p className="en">
              Hold your index finger on target <b>{cal.step + 1}</b> and keep it still until the ring fills.
            </p>
            {cal.phase === 'move' && (
              <p className="move">Corner {cal.step} captured — now <b>move your finger away</b> to the next target · Cible {cal.step} enregistrée — <b>déplacez le doigt</b> vers la suivante</p>
            )}
            {cal.restarted && (
              <p className="warn">Deux cibles au même endroit — on recommence · Two targets landed on the same spot — starting over</p>
            )}
            <p className="hint">{cal.present ? 'Main détectée · Hand detected' : 'Aucune main détectée · No hand detected'} — Échap pour annuler · Esc to cancel</p>
          </div>
        </div>
      )}

      {(!connected || !calibrated) && !cal && (
        <div className="wall-chip" role="status">
          {!connected ? (
            <>
              <span className="wall-chip-dot off" />
              Caméra non connectée — lancez <code>wall/run.sh</code>
            </>
          ) : (
            <>
              <span className="wall-chip-dot warn" />
              Non calibré — appuyez sur <kbd>C</kbd> · Not calibrated — press <kbd>C</kbd>
            </>
          )}
        </div>
      )}
    </>
  )
}
