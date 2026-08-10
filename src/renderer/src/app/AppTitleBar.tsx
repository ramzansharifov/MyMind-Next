import { BrainCircuit, Copy, Minus, Square, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import { cn } from '../shared/lib/cn'
import { Tooltip } from '../shared/ui/tooltip'

export function AppTitleBar(): React.JSX.Element {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    let active = true

    void window.api.system
      .getWindowState()
      .then((state) => {
        if (active) {
          setIsMaximized(state.maximized)
        }
      })
      .catch((reason: unknown) => {
        console.error('Failed to read window state', reason)
      })

    const unsubscribe = window.api.system.onWindowStateChanged((state) => {
      if (active) {
        setIsMaximized(state.maximized)
      }
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  return (
    <header
      data-app-titlebar
      className={cn(
        'relative z-[100] flex h-9 shrink-0 items-center overflow-hidden',
        'border-b border-[var(--app-border)] bg-[var(--app-sidebar)]',
        'text-[var(--app-text)] shadow-[0_1px_0_rgb(255_255_255/0.015)]'
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5 px-3">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-lg border border-violet-500/20 bg-violet-500/10 text-violet-300 shadow-inner shadow-violet-500/5">
          <BrainCircuit aria-hidden="true" className="size-3.5" />
        </span>

        <span className="truncate text-xs font-semibold tracking-[-0.01em]">MyMind</span>
      </div>

      <div data-titlebar-controls className="ml-auto flex h-full shrink-0 items-stretch">
        <Tooltip content="Свернуть" side="bottom">
          <button
            type="button"
            aria-label="Свернуть окно"
            className="flex h-full w-11 items-center justify-center text-[var(--app-muted)] transition-colors outline-none hover:bg-white/[0.055] hover:text-[var(--app-text)] focus-visible:bg-white/[0.07] focus-visible:text-[var(--app-text)]"
            onClick={() => {
              void window.api.system.minimizeWindow()
            }}
          >
            <Minus aria-hidden="true" className="size-4" strokeWidth={1.75} />
          </button>
        </Tooltip>

        <Tooltip content={isMaximized ? 'Восстановить' : 'Развернуть'} side="bottom">
          <button
            type="button"
            aria-label={isMaximized ? 'Восстановить окно' : 'Развернуть окно'}
            className="flex h-full w-11 items-center justify-center text-[var(--app-muted)] transition-colors outline-none hover:bg-white/[0.055] hover:text-[var(--app-text)] focus-visible:bg-white/[0.07] focus-visible:text-[var(--app-text)]"
            onClick={() => {
              void window.api.system
                .toggleMaximizeWindow()
                .then((state) => setIsMaximized(state.maximized))
            }}
          >
            {isMaximized ? (
              <Copy aria-hidden="true" className="size-3.5" strokeWidth={1.6} />
            ) : (
              <Square aria-hidden="true" className="size-3.5" strokeWidth={1.6} />
            )}
          </button>
        </Tooltip>

        <Tooltip content="Закрыть" side="bottom">
          <button
            type="button"
            aria-label="Закрыть окно"
            className="flex h-full w-11 items-center justify-center text-[var(--app-muted)] transition-colors outline-none hover:bg-red-500/90 hover:text-white focus-visible:bg-red-500/90 focus-visible:text-white"
            onClick={() => {
              void window.api.system.closeWindow()
            }}
          >
            <X aria-hidden="true" className="size-4" strokeWidth={1.75} />
          </button>
        </Tooltip>
      </div>
    </header>
  )
}
