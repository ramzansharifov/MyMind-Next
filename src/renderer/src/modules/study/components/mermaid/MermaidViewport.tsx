import { CircleAlert, LoaderCircle, Move, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react'
import {
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent
} from 'react'

import { Tooltip } from '../../../../shared/ui/tooltip'

export type MermaidRenderState =
  | {
      status: 'idle' | 'loading'
      svg: null
      diagramType: null
      error: null
    }
  | {
      status: 'success'
      svg: string
      diagramType: string
      error: null
    }
  | {
      status: 'error'
      svg: null
      diagramType: null
      error: string
    }

export interface MermaidViewportOffset {
  x: number
  y: number
}

interface MermaidDragState {
  pointerId: number
  startX: number
  startY: number
  originX: number
  originY: number
}

export const MERMAID_VIEWPORT_MIN_SCALE = 40
export const MERMAID_VIEWPORT_MAX_SCALE = 400
export const MERMAID_VIEWPORT_SCALE_STEP = 20

const headerButtonClassName = [
  'flex size-7 shrink-0 items-center justify-center rounded-md',
  'text-[var(--app-muted)] outline-none',
  'transition-colors',
  'hover:bg-white/[0.06] hover:text-[var(--app-text)]',
  'focus-visible:ring-2 focus-visible:ring-violet-500/35',
  'disabled:cursor-not-allowed disabled:opacity-30'
].join(' ')

export function MermaidViewportControls({
  scale,
  disabled,
  onZoomOut,
  onZoomIn,
  onReset
}: {
  scale: number
  disabled: boolean
  onZoomOut: () => void
  onZoomIn: () => void
  onReset: () => void
}): React.JSX.Element {
  return (
    <div
      data-mermaid-viewport-controls
      className="mr-1 flex h-8 items-center gap-0.5 rounded-lg border border-[var(--app-border)] bg-white/[0.025] px-1"
    >
      <Tooltip content="Перетаскивайте диаграмму мышью или касанием" side="top">
        <span
          aria-label="Диаграмму можно перемещать перетаскиванием"
          className="flex size-7 items-center justify-center text-[var(--app-muted)]"
        >
          <Move aria-hidden="true" className="size-3.5" />
        </span>
      </Tooltip>

      <Tooltip content="Уменьшить масштаб" side="top">
        <button
          type="button"
          aria-label="Уменьшить масштаб Mermaid"
          disabled={disabled || scale <= MERMAID_VIEWPORT_MIN_SCALE}
          className={headerButtonClassName}
          onClick={onZoomOut}
        >
          <ZoomOut aria-hidden="true" className="size-4" />
        </button>
      </Tooltip>

      <span
        aria-live="polite"
        className="min-w-12 text-center text-[11px] font-medium text-[var(--app-muted)] tabular-nums"
      >
        {scale}%
      </span>

      <Tooltip content="Увеличить масштаб" side="top">
        <button
          type="button"
          aria-label="Увеличить масштаб Mermaid"
          disabled={disabled || scale >= MERMAID_VIEWPORT_MAX_SCALE}
          className={headerButtonClassName}
          onClick={onZoomIn}
        >
          <ZoomIn aria-hidden="true" className="size-4" />
        </button>
      </Tooltip>

      <Tooltip content="Сбросить масштаб и положение" side="top">
        <button
          type="button"
          aria-label="Сбросить масштаб и положение Mermaid"
          disabled={disabled}
          className={headerButtonClassName}
          onClick={onReset}
        >
          <RotateCcw aria-hidden="true" className="size-4" />
        </button>
      </Tooltip>
    </div>
  )
}

export function StudyMermaidPreview({
  source,
  state,
  scale,
  interactive = false,
  offset = { x: 0, y: 0 },
  onOffsetChange,
  onScaleChange
}: {
  source: string
  state: MermaidRenderState
  scale: number
  interactive?: boolean
  offset?: MermaidViewportOffset
  onOffsetChange?: (offset: MermaidViewportOffset) => void
  onScaleChange?: (scale: number) => void
}): React.JSX.Element {
  const normalizedScale = interactive ? clampMermaidViewportScale(scale) : clampMermaidScale(scale)
  const dragStateRef = useRef<MermaidDragState | null>(null)
  const [dragging, setDragging] = useState(false)

  function finishDragging(event: ReactPointerEvent<HTMLDivElement>): void {
    if (dragStateRef.current?.pointerId !== event.pointerId) {
      return
    }

    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    dragStateRef.current = null
    setDragging(false)
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>): void {
    if (!interactive || state.status !== 'success' || event.button !== 0) {
      return
    }

    event.preventDefault()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: offset.x,
      originY: offset.y
    }
    setDragging(true)
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    const dragState = dragStateRef.current

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return
    }

    onOffsetChange?.({
      x: dragState.originX + event.clientX - dragState.startX,
      y: dragState.originY + event.clientY - dragState.startY
    })
  }

  function handleWheel(event: ReactWheelEvent<HTMLDivElement>): void {
    if (!interactive || state.status !== 'success') {
      return
    }

    event.preventDefault()
    const delta = event.deltaY < 0 ? MERMAID_VIEWPORT_SCALE_STEP : -MERMAID_VIEWPORT_SCALE_STEP
    onScaleChange?.(clampMermaidViewportScale(normalizedScale + delta))
  }

  return (
    <div
      data-mermaid-interactive={interactive ? 'true' : 'false'}
      data-mermaid-dragging={dragging ? 'true' : 'false'}
      data-pan-x={Math.round(offset.x)}
      data-pan-y={Math.round(offset.y)}
      aria-busy={state.status === 'loading'}
      role={interactive ? 'region' : undefined}
      aria-label={interactive ? 'Интерактивная область Mermaid' : undefined}
      className="study-mermaid-preview"
      style={
        interactive
          ? {
              width: '100%',
              height: '100%',
              minHeight: 0,
              overflow: 'hidden',
              padding: 0,
              cursor: dragging ? 'grabbing' : 'grab',
              touchAction: 'none',
              userSelect: 'none'
            }
          : undefined
      }
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDragging}
      onPointerCancel={finishDragging}
      onWheel={handleWheel}
    >
      {!source.trim() && <p className="text-sm text-[var(--app-muted)]">Пустой Mermaid-блок</p>}

      {source.trim() && (state.status === 'idle' || state.status === 'loading') && (
        <div className="flex items-center gap-2 text-sm text-[var(--app-muted)]">
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          Построение диаграммы…
        </div>
      )}

      {state.status === 'error' && (
        <div
          role="alert"
          className="flex max-w-xl items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.06] p-4 text-left"
        >
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-red-300" />

          <div className="min-w-0">
            <p className="text-sm font-medium text-red-200">Ошибка в диаграмме</p>
            <pre className="mt-1 max-h-44 overflow-auto font-mono text-xs leading-5 whitespace-pre-wrap text-red-300/80">
              {state.error}
            </pre>
          </div>
        </div>
      )}

      {state.status === 'success' && (
        <div
          className="study-mermaid-viewport"
          style={
            interactive
              ? {
                  width: '100%',
                  height: '100%',
                  minHeight: 0,
                  alignItems: 'center',
                  overflow: 'hidden',
                  padding: '1.5rem'
                }
              : undefined
          }
        >
          <div
            data-mermaid-transform-layer
            className="study-mermaid-svg"
            style={{
              width: `${normalizedScale}%`,
              transform: interactive ? `translate3d(${offset.x}px, ${offset.y}px, 0)` : undefined,
              transition: dragging ? 'none' : 'width 160ms ease-out, transform 120ms ease-out',
              willChange: interactive ? 'width, transform' : undefined
            }}
            dangerouslySetInnerHTML={{
              __html: state.svg
            }}
          />
        </div>
      )}
    </div>
  )
}

function clampMermaidScale(value: number): number {
  return Math.max(60, Math.min(180, value))
}

function clampMermaidViewportScale(value: number): number {
  return Math.max(MERMAID_VIEWPORT_MIN_SCALE, Math.min(MERMAID_VIEWPORT_MAX_SCALE, value))
}
