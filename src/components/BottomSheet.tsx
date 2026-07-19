import { useEffect, useRef, useState, type ReactNode } from 'react'

interface BottomSheetProps {
  children: ReactNode
  /** Reset the sheet to peek when the selected place changes. */
  resetKey: string
}

const PEEK_VH = 42
const FULL_VH = 88

/**
 * Mobile bottom sheet with two snap points (peek / full). Drag the handle —
 * or the hero area — up and down; taps pass through to the card content.
 */
export function BottomSheet({ children, resetKey }: BottomSheetProps) {
  const [expanded, setExpanded] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const drag = useRef<{ startY: number; startOffset: number } | null>(null)

  useEffect(() => {
    setExpanded(false)
    setDragOffset(0)
  }, [resetKey])

  const heightVh = (expanded ? FULL_VH : PEEK_VH) - (dragOffset / window.innerHeight) * 100

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { startY: e.clientY, startOffset: 0 }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return
    setDragOffset(e.clientY - drag.current.startY)
  }
  const onPointerUp = () => {
    if (!drag.current) return
    const moved = dragOffset
    drag.current = null
    setDragOffset(0)
    if (moved < -60) setExpanded(true)
    else if (moved > 60) setExpanded(false)
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[1100] md:hidden"
      style={{
        height: `${Math.max(24, Math.min(FULL_VH + 4, heightVh))}vh`,
        transition: drag.current ? 'none' : 'height 250ms cubic-bezier(0.2, 0.8, 0.3, 1)',
      }}
    >
      <div className="flex h-full flex-col">
        <div
          className="flex shrink-0 cursor-grab touch-none items-center justify-center rounded-t-2xl bg-card pb-1 pt-2 active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          role="slider"
          aria-label="Resize panel"
          aria-valuenow={expanded ? 100 : 50}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') setExpanded(true)
            if (e.key === 'ArrowDown') setExpanded(false)
          }}
        >
          <span className="h-1 w-10 rounded-full bg-ink/20" />
        </div>
        <div className="min-h-0 flex-1 [&>div]:rounded-t-none">{children}</div>
      </div>
    </div>
  )
}
