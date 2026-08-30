import { Bot, RefreshCw, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import type { AiChatBounds } from '../../../shared/contracts/ai-chat'
import { Tooltip } from '../shared/ui/tooltip'

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

export function AiChatOverlay(): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const viewportRef = useRef<HTMLDivElement | null>(null)

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
          className="fixed top-[calc(var(--app-titlebar-offset)+1rem)] right-4 bottom-4 z-[80] flex w-[min(480px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[0_24px_70px_rgb(0_0_0/0.48)]"
        >
          <header className="flex h-12 shrink-0 items-center gap-3 border-b border-[var(--app-border)] bg-[var(--app-surface)] px-3">
            <span className="flex size-8 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--app-accent-500)_24%,transparent)] bg-[color-mix(in_srgb,var(--app-accent-500)_12%,transparent)] text-[var(--app-accent-500)]">
              <Bot aria-hidden="true" className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-[var(--app-text)]">ChatGPT</div>
              <div className="truncate text-[10px] text-[var(--app-muted)]">ИИ-чат MyMind</div>
            </div>

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
            ref={viewportRef}
            data-testid="ai-chat-viewport"
            className="relative min-h-0 flex-1 bg-[#0b0d10]"
          >
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 text-center text-xs text-[var(--app-muted)]">
              Загрузка ChatGPT…
            </div>
          </div>
        </aside>
      )}
    </>
  )
}
