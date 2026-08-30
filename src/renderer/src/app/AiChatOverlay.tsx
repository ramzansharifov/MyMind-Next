import { Bot, Maximize2, Minimize2, RefreshCw, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import type { AiChatBounds } from '../../../shared/contracts/ai-chat'
import { Tooltip } from '../shared/ui/tooltip'

const DEFAULT_PANEL_WIDTH = 480
const EXPANDED_PANEL_WIDTH = 800
const MIN_PANEL_WIDTH = 360
const MAX_PANEL_WIDTH = 960
const PANEL_WINDOW_GUTTER = 48
const RESIZE_STEP = 32

interface ResizeDragState {
  startX: number
  startWidth: number
}

function elementBounds(element: HTMLElement): AiChatBounds | null {
  const rect = element.getBoundingClientRect()
  const width = Math.round(rect.width)
  const height = Math.round(rect.height)
  if (width < 1 || height < 1) return null

  return {
    x: Math.max(0, Math.round(rect.left)),
    y: Math.max(0, Math.round(rect.top)),
    width,
    height
  }
}

function maxPanelWidth(viewportWidth: number): number {
  return Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, viewportWidth - PANEL_WINDOW_GUTTER))
}

function clampPanelWidth(width: number, viewportWidth: number): number {
  return Math.max(MIN_PANEL_WIDTH, Math.min(Math.round(width), maxPanelWidth(viewportWidth)))
}

export function AiChatOverlay(): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH)
  const [resizing, setResizing] = useState(false)
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const resizeDragRef = useRef<ResizeDragState | null>(null)

  useEffect(() => {
    const handleWindowResize = (): void => {
      setPanelWidth((current) => clampPanelWidth(current, window.innerWidth))
    }

    window.addEventListener('resize', handleWindowResize)
    return () => window.removeEventListener('resize', handleWindowResize)
  }, [])

  useEffect(() => {
    if (!resizing) return

    const handlePointerMove = (event: PointerEvent): void => {
      const drag = resizeDragRef.current
      if (!drag) return

      setPanelWidth(
        clampPanelWidth(drag.startWidth + drag.startX - event.clientX, window.innerWidth)
      )
    }

    const finishResize = (): void => {
      resizeDragRef.current = null
      setResizing(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', finishResize)
    window.addEventListener('pointercancel', finishResize)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', finishResize)
      window.removeEventListener('pointercancel', finishResize)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [resizing])

  useEffect(() => {
    if (!open) return

    const viewport = viewportRef.current
    if (!viewport) return

    let openedNativeView = false
    let animationFrame = 0

    const syncBounds = (): void => {
      const bounds = elementBounds(viewport)
      if (!bounds) return

      const request = openedNativeView
        ? window.api.aiChat.setBounds(bounds)
        : window.api.aiChat.setOpen({ open: true, bounds })

      openedNativeView = true
      void request.catch((reason: unknown) => {
        console.error('Failed to synchronize AI chat panel', reason)
      })
    }

    animationFrame = window.requestAnimationFrame(syncBounds)
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => syncBounds())
    observer?.observe(viewport)
    window.addEventListener('resize', syncBounds)

    return () => {
      window.cancelAnimationFrame(animationFrame)
      observer?.disconnect()
      window.removeEventListener('resize', syncBounds)
      void window.api.aiChat.setOpen({ open: false }).catch((reason: unknown) => {
        console.error('Failed to close AI chat panel', reason)
      })
    }
  }, [open])

  const expanded = panelWidth > (DEFAULT_PANEL_WIDTH + EXPANDED_PANEL_WIDTH) / 2
  const resizeMaximum = maxPanelWidth(window.innerWidth)

  return (
    <>
      {!open && (
        <Tooltip content="Открыть ИИ-чат" side="left">
          <button
            type="button"
            aria-label="Открыть ИИ-чат"
            className="fixed right-5 bottom-5 z-[80] flex size-12 items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--app-accent-500)_35%,transparent)] bg-[var(--app-accent-500)] text-white shadow-[0_12px_34px_rgb(0_0_0/0.38)] transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-[var(--app-accent-500)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-workspace)] focus-visible:outline-none motion-reduce:transition-none"
            onClick={() => setOpen(true)}
          >
            <Bot aria-hidden="true" className="size-5" />
          </button>
        </Tooltip>
      )}

      {open && (
        <aside
          aria-label="ИИ-чат"
          data-testid="ai-chat-panel"
          className="fixed top-[calc(var(--app-titlebar-offset)+1rem)] right-4 bottom-4 z-[80] flex flex-col overflow-visible rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[0_24px_70px_rgb(0_0_0/0.48)]"
          style={{ width: panelWidth }}
        >
          <div
            role="separator"
            aria-label="Изменить ширину ИИ-чата"
            aria-orientation="vertical"
            aria-valuemin={MIN_PANEL_WIDTH}
            aria-valuemax={resizeMaximum}
            aria-valuenow={panelWidth}
            tabIndex={0}
            className="group absolute top-3 bottom-3 -left-3 z-[90] w-3 cursor-ew-resize outline-none"
            onPointerDown={(event) => {
              if (event.button !== 0) return
              resizeDragRef.current = {
                startX: event.clientX,
                startWidth: panelWidth
              }
              setResizing(true)
              document.body.style.cursor = 'ew-resize'
              document.body.style.userSelect = 'none'
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowLeft') {
                event.preventDefault()
                setPanelWidth((current) =>
                  clampPanelWidth(current + RESIZE_STEP, window.innerWidth)
                )
              } else if (event.key === 'ArrowRight') {
                event.preventDefault()
                setPanelWidth((current) =>
                  clampPanelWidth(current - RESIZE_STEP, window.innerWidth)
                )
              } else if (event.key === 'Home') {
                event.preventDefault()
                setPanelWidth(clampPanelWidth(DEFAULT_PANEL_WIDTH, window.innerWidth))
              } else if (event.key === 'End') {
                event.preventDefault()
                setPanelWidth(maxPanelWidth(window.innerWidth))
              }
            }}
          >
            <span
              aria-hidden="true"
              className="absolute top-1/2 right-0 h-16 w-0.5 -translate-y-1/2 rounded-full bg-[var(--app-border)] opacity-0 transition-[opacity,background-color] group-hover:bg-[var(--app-accent-500)] group-hover:opacity-100 group-focus-visible:bg-[var(--app-accent-500)] group-focus-visible:opacity-100"
            />
          </div>

          <header className="flex h-12 shrink-0 items-center gap-3 rounded-t-[15px] border-b border-[var(--app-border)] bg-[var(--app-surface)] px-3">
            <span className="flex size-8 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--app-accent-500)_24%,transparent)] bg-[color-mix(in_srgb,var(--app-accent-500)_12%,transparent)] text-[var(--app-accent-500)]">
              <Bot aria-hidden="true" className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-[var(--app-text)]">ChatGPT</div>
              <div className="truncate text-[10px] text-[var(--app-muted)]">ИИ-чат MyMind</div>
            </div>

            <Tooltip content={expanded ? 'Сузить ИИ-чат' : 'Расширить ИИ-чат'} side="bottom">
              <button
                type="button"
                aria-label={expanded ? 'Сузить ИИ-чат' : 'Расширить ИИ-чат'}
                className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
                onClick={() => {
                  setPanelWidth(
                    clampPanelWidth(
                      expanded ? DEFAULT_PANEL_WIDTH : EXPANDED_PANEL_WIDTH,
                      window.innerWidth
                    )
                  )
                }}
              >
                {expanded ? (
                  <Minimize2 aria-hidden="true" className="size-4" />
                ) : (
                  <Maximize2 aria-hidden="true" className="size-4" />
                )}
              </button>
            </Tooltip>

            <Tooltip content="Перезагрузить ChatGPT" side="bottom">
              <button
                type="button"
                aria-label="Перезагрузить ChatGPT"
                className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
                onClick={() => {
                  void window.api.aiChat.reload().catch((reason: unknown) => {
                    console.error('Failed to reload ChatGPT', reason)
                  })
                }}
              >
                <RefreshCw aria-hidden="true" className="size-4" />
              </button>
            </Tooltip>

            <Tooltip content="Закрыть ИИ-чат" side="bottom">
              <button
                type="button"
                aria-label="Закрыть ИИ-чат"
                className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
                onClick={() => setOpen(false)}
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </Tooltip>
          </header>

          <div
            data-testid="ai-chat-frame"
            className="relative min-h-0 flex-1 rounded-b-[15px] bg-[var(--app-border)] pr-px pb-px"
          >
            <div
              ref={viewportRef}
              data-testid="ai-chat-viewport"
              className="relative h-full min-h-0 rounded-b-[14px] bg-[#0b0d10]"
            >
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-b-[14px] p-6 text-center text-xs text-[var(--app-muted)]">
                Загрузка ChatGPT…
              </div>
            </div>
          </div>
        </aside>
      )}
    </>
  )
}
