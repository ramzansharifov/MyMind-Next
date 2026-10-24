import type { PointerEvent, PointerEventHandler } from 'react'
export interface DragState {
  dx: number
  dy: number
  vx: number
  numberActiveTouches: number
}
type Handler = (event: PointerEvent<HTMLElement>, state: DragState) => void
/** Pointer capture is acquired only after horizontal intent, so links, fields and vertical scrolling keep their browser behavior. */
export function horizontalDrag(options: {
  shouldStart(event: PointerEvent<HTMLElement>, state: DragState): boolean
  onStart?: Handler
  onMove?: Handler
  onEnd?: Handler
  onCancel?: Handler
}): {
  pointerHandlers: Record<
    'onPointerDown' | 'onPointerMove' | 'onPointerUp' | 'onPointerCancel' | 'onLostPointerCapture',
    PointerEventHandler<HTMLElement>
  >
} {
  let start: {
    id: number
    x: number
    y: number
    t: number
    lastX: number
    lastT: number
    vx: number
    claimed: boolean
  } | null = null
  const state = (event: PointerEvent<HTMLElement>): DragState => ({
    dx: event.clientX - (start?.x ?? event.clientX),
    dy: event.clientY - (start?.y ?? event.clientY),
    vx: start?.vx ?? 0,
    numberActiveTouches: 1
  })
  const end = (event: PointerEvent<HTMLElement>, cancelled = false): void => {
    if (!start || event.pointerId !== start.id) return
    const current = state(event)
    const claimed = start.claimed
    start = null
    if (claimed) {
      if (cancelled) options.onCancel?.(event, current)
      else options.onEnd?.(event, current)
      if (event.currentTarget.hasPointerCapture(event.pointerId))
        event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }
  return {
    pointerHandlers: {
      onPointerDown: (event) => {
        if (
          !event.isPrimary ||
          event.button !== 0 ||
          (event.target instanceof Element &&
            event.target.closest(
              'input,textarea,[contenteditable="true"],video,audio,a,[role="slider"]'
            ))
        )
          return
        start = {
          id: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          t: event.timeStamp,
          lastX: event.clientX,
          lastT: event.timeStamp,
          vx: 0,
          claimed: false
        }
      },
      onPointerMove: (event) => {
        if (!start || start.id !== event.pointerId) return
        const dt = event.timeStamp - start.lastT
        if (dt > 0) start.vx = (event.clientX - start.lastX) / dt
        start.lastX = event.clientX
        start.lastT = event.timeStamp
        const current = state(event)
        if (
          !start.claimed &&
          Math.abs(current.dy) > 10 &&
          Math.abs(current.dy) > Math.abs(current.dx)
        ) {
          start = null
          return
        }
        if (!start.claimed && options.shouldStart(event, current)) {
          start.claimed = true
          event.currentTarget.setPointerCapture(event.pointerId)
          options.onStart?.(event, current)
        }
        if (start.claimed) {
          event.preventDefault()
          options.onMove?.(event, current)
        }
      },
      onPointerUp: (event) => end(event),
      onPointerCancel: (event) => end(event, true),
      onLostPointerCapture: (event) => {
        if (event.target === event.currentTarget) end(event, true)
      }
    }
  }
}
