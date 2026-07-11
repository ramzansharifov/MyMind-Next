import { FileText, Heading, LoaderCircle, Search } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

import type { StudyInternalLinkTarget } from '../../../../../../shared/contracts/study'
import { cn } from '../../../../shared/lib/cn'

export interface StudyInternalLinkPickerState {
  mode: 'trigger' | 'toolbar'
  from: number
  to: number
  query: string
  selectedText: string
  selectedIndex: number
  left: number
  top: number
}

interface StudyInternalLinkPickerProps {
  state: StudyInternalLinkPickerState
  targets: StudyInternalLinkTarget[]
  isLoading: boolean
  onQueryChange: (query: string) => void
  onSelectedIndexChange: (index: number) => void
  onSelect: (target: StudyInternalLinkTarget) => void
  onClose: () => void
}

export function StudyInternalLinkPicker({
  state,
  targets,
  isLoading,
  onQueryChange,
  onSelectedIndexChange,
  onSelect,
  onClose
}: StudyInternalLinkPickerProps): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (state.mode !== 'toolbar') {
      return
    }

    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })

    return () => {
      window.cancelAnimationFrame(frame)
    }
  }, [state.mode])

  function handlePickerKeyDown(event: React.KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()

      onSelectedIndexChange(targets.length === 0 ? 0 : (state.selectedIndex + 1) % targets.length)

      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()

      onSelectedIndexChange(
        targets.length === 0 ? 0 : (state.selectedIndex - 1 + targets.length) % targets.length
      )

      return
    }

    if (event.key === 'Enter') {
      const target = targets[state.selectedIndex]

      if (!target) {
        return
      }

      event.preventDefault()
      onSelect(target)
    }
  }

  return createPortal(
    <div
      role="dialog"
      aria-label="Выбор внутренней ссылки"
      className="fixed z-[120] w-[min(430px,calc(100vw-24px))] overflow-hidden rounded-xl border border-[var(--app-border-strong)] bg-[var(--app-surface-raised)] shadow-2xl shadow-black/45"
      style={{
        left: state.left,
        top: state.top
      }}
      onMouseDown={(event) => {
        if (state.mode === 'trigger') {
          event.preventDefault()
        }
      }}
      onKeyDown={handlePickerKeyDown}
    >
      <div className="border-b border-[var(--app-border)] p-2">
        {state.mode === 'toolbar' ? (
          <label className="flex h-10 items-center gap-2 rounded-lg border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 focus-within:border-violet-500/45">
            <Search aria-hidden="true" className="size-4 shrink-0 text-[var(--app-muted)]" />

            <input
              ref={inputRef}
              value={state.query}
              aria-label="Поиск цели внутренней ссылки"
              placeholder="Материал, папка или заголовок"
              className="min-w-0 flex-1 bg-transparent text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/65"
              onChange={(event) => {
                onQueryChange(event.target.value)
              }}
            />
          </label>
        ) : (
          <div className="flex h-10 items-center gap-2 rounded-lg bg-[var(--app-workspace)] px-3">
            <Search aria-hidden="true" className="size-4 shrink-0 text-violet-300" />

            <span className="min-w-0 flex-1 truncate text-sm text-[var(--app-text)]">
              [[
              {state.query || 'Поиск материала или заголовка'}
            </span>

            <kbd className="rounded border border-[var(--app-border)] px-1.5 py-0.5 text-[10px] text-[var(--app-muted)]">
              Esc
            </kbd>
          </div>
        )}
      </div>

      <div className="max-h-80 overflow-y-auto p-1.5">
        {isLoading && targets.length === 0 ? (
          <div className="flex min-h-28 items-center justify-center gap-2 text-sm text-[var(--app-muted)]">
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            Поиск…
          </div>
        ) : targets.length === 0 ? (
          <div className="flex min-h-28 flex-col items-center justify-center px-6 text-center">
            <Search aria-hidden="true" className="size-5 text-[var(--app-muted)]/60" />

            <p className="mt-2 text-sm font-medium text-[var(--app-text)]">Ничего не найдено</p>

            <p className="mt-1 text-xs leading-5 text-[var(--app-muted)]">
              Проверь название материала, папки или заголовка.
            </p>
          </div>
        ) : (
          targets.map((target, index) => {
            const selected = index === state.selectedIndex

            const materialLocation = [...target.folderPath, target.materialTitle]
              .filter(Boolean)
              .join(' / ')

            return (
              <button
                key={`${target.kind}:${target.materialId}:${target.headingId ?? ''}`}
                type="button"
                aria-selected={selected}
                className={cn(
                  'flex w-full min-w-0 items-center gap-3 rounded-lg px-3 py-2.5 text-left outline-none',
                  selected
                    ? 'bg-violet-500/14 text-violet-100'
                    : 'text-[var(--app-text)] hover:bg-white/[0.04]'
                )}
                onMouseEnter={() => {
                  onSelectedIndexChange(index)
                }}
                onMouseDown={(event) => {
                  event.preventDefault()
                }}
                onClick={() => {
                  onSelect(target)
                }}
              >
                <span
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-lg',
                    selected
                      ? 'bg-violet-500/20 text-violet-200'
                      : 'bg-white/[0.035] text-[var(--app-muted)]'
                  )}
                >
                  {target.kind === 'heading' ? (
                    <Heading aria-hidden="true" className="size-4" />
                  ) : (
                    <FileText aria-hidden="true" className="size-4" />
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{target.title}</span>

                  <span className="mt-1 block truncate text-[11px] text-[var(--app-muted)]">
                    {target.kind === 'heading'
                      ? `H${target.headingLevel ?? ''} · ${materialLocation}`
                      : target.folderPath.length > 0
                        ? target.folderPath.join(' / ')
                        : 'Корень библиотеки'}
                  </span>
                </span>
              </button>
            )
          })
        )}
      </div>

      <footer className="flex items-center justify-between gap-3 border-t border-[var(--app-border)] px-3 py-2 text-[10px] text-[var(--app-muted)]">
        <span>↑↓ выбор · Enter вставить</span>

        <span>Материалы и H1–H3</span>
      </footer>
    </div>,
    document.body
  )
}
