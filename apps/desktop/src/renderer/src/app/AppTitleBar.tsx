import { BrainCircuit, Copy, Minus, Square, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import type { DesktopUpdateStatus } from '../../../shared/contracts/updates'
import { cn } from '../shared/lib/cn'
import { Tooltip } from '../shared/ui/tooltip'
import './window-layout.css'

function titlebarUpdateLabel(status: DesktopUpdateStatus | null): string | null {
  if (!status) return null

  if (status.phase === 'checking') {
    return 'Проверка обновлений…'
  }

  if (status.phase === 'available') {
    return status.availableVersion ? `Доступна v${status.availableVersion}` : 'Доступно обновление'
  }

  if (status.phase === 'downloading') {
    return `Обновление ${Math.round(status.percent ?? 0)}%`
  }

  if (status.phase === 'downloaded') {
    return 'Обновление готово'
  }

  return null
}

export function AppTitleBar(): React.JSX.Element {
  const [isMaximized, setIsMaximized] = useState(false)
  const [updateStatus, setUpdateStatus] = useState<DesktopUpdateStatus | null>(null)

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

  useEffect(() => {
    let active = true

    void window.api.updates
      .getStatus()
      .then((status) => {
        if (active) {
          setUpdateStatus(status)
        }
      })
      .catch((reason: unknown) => {
        console.error('Failed to read desktop update status', reason)
      })

    const unsubscribe = window.api.updates.onStatusChanged((status) => {
      if (active) {
        setUpdateStatus(status)
      }
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const updateLabel = titlebarUpdateLabel(updateStatus)

  return (
    <header
      data-app-titlebar
      className={cn(
        'app-titlebar relative z-[100] flex shrink-0 items-center overflow-hidden',
        'border-b border-[var(--app-border)] bg-[var(--app-sidebar)]',
        'text-[var(--app-text)] shadow-[0_1px_0_rgb(255_255_255/0.015)]'
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5 px-3">
        <span className="border-accent-500/20 bg-accent-500/10 text-accent-300 shadow-accent-500/5 flex size-6 shrink-0 items-center justify-center rounded-lg border shadow-inner">
          <BrainCircuit aria-hidden="true" className="size-3.5" />
        </span>

        <div className="flex min-w-0 items-baseline gap-1.5">
          <span className="truncate text-xs font-semibold tracking-[-0.01em]">MyMind</span>
          <span
            aria-label={`Версия ${__APP_VERSION__}`}
            className="shrink-0 text-[10px] font-medium text-[var(--app-muted)] opacity-70"
          >
            v{__APP_VERSION__}
          </span>
          {updateLabel && (
            <>
              <span aria-hidden="true" className="text-[10px] text-[var(--app-muted)] opacity-40">
                ·
              </span>
              <span
                aria-live="polite"
                className="text-accent-300 max-w-48 truncate text-[10px] font-medium"
              >
                {updateLabel}
              </span>
            </>
          )}
        </div>
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
