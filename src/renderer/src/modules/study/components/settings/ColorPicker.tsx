import * as Popover from '@radix-ui/react-popover'
import { Check, Eraser, Palette, X } from 'lucide-react'

import { cn } from '../../../../shared/lib/cn'

const defaultColors = [
  '#f2f3f5',
  '#a1a1aa',
  '#a78bfa',
  '#60a5fa',
  '#34d399',
  '#fbbf24',
  '#fb7185',
  '#f87171'
]

interface ColorPickerProps {
  value: string
  displayColor?: string
  displayLabel?: string
  ariaLabel: string
  disabled?: boolean
  colors?: string[]
  clearLabel?: string
  onChange: (value: string) => void
  onClear?: () => void
}

export function ColorPicker({
  value,
  displayColor = value,
  displayLabel = value.toUpperCase(),
  ariaLabel,
  disabled = false,
  colors = defaultColors,
  clearLabel = 'Убрать цвет',
  onChange,
  onClear
}: ColorPickerProps): React.JSX.Element {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label={ariaLabel}
          className={cn(
            'flex h-10 w-full min-w-0 items-center gap-3 rounded-lg',
            'border border-(--app-border) bg-(--app-workspace) px-3',
            'text-sm text-(--app-text)',
            'hover:border-(--app-border-strong)',
            'focus-visible:ring-2 focus-visible:ring-violet-500/25',
            'focus-visible:outline-none',
            'disabled:cursor-not-allowed disabled:opacity-45'
          )}
        >
          <span
            aria-hidden="true"
            className="size-5 shrink-0 rounded-md border border-white/15"
            style={{
              backgroundColor: displayColor
            }}
          />

          <span className="min-w-0 flex-1 truncate text-left text-xs text-(--app-muted)">
            {displayLabel}
          </span>

          <Palette aria-hidden="true" className="size-4 shrink-0 text-(--app-muted)" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className={cn(
            'z-[90] w-60 rounded-xl border border-(--app-border)',
            'bg-(--app-surface-raised) p-3 text-(--app-text)',
            'outline-none'
          )}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Выбор цвета</p>

            <Popover.Close asChild>
              <button
                type="button"
                aria-label="Закрыть выбор цвета"
                className="flex size-7 items-center justify-center rounded-md text-(--app-muted) hover:bg-white/[0.06] hover:text-(--app-text)"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </Popover.Close>
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2">
            {colors.map((color) => (
              <Popover.Close key={color} asChild>
                <button
                  type="button"
                  aria-label={`Цвет ${color}`}
                  className={cn(
                    'relative flex aspect-square items-center justify-center',
                    'rounded-lg border border-white/10 outline-none',
                    'transition-transform hover:scale-105',
                    'focus-visible:ring-2 focus-visible:ring-violet-400'
                  )}
                  style={{
                    backgroundColor: color
                  }}
                  onClick={() => {
                    onChange(color)
                  }}
                >
                  {color.toLowerCase() === value.toLowerCase() && (
                    <Check aria-hidden="true" className="size-4 text-white drop-shadow" />
                  )}
                </button>
              </Popover.Close>
            ))}
          </div>

          <label className="mt-4 grid gap-2">
            <span className="text-xs font-medium text-(--app-muted)">Произвольный цвет</span>

            <div className="flex h-10 items-center gap-3 rounded-lg border border-(--app-border) bg-(--app-workspace) px-2">
              <input
                type="color"
                value={value}
                aria-label={ariaLabel}
                className="size-7 cursor-pointer border-0 bg-transparent p-0"
                onChange={(event) => {
                  onChange(event.target.value)
                }}
              />

              <span className="text-xs text-(--app-muted)">{value.toUpperCase()}</span>
            </div>
          </label>

          {onClear && (
            <Popover.Close asChild>
              <button
                type="button"
                className={cn(
                  'mt-3 flex h-9 w-full items-center justify-center gap-2',
                  'rounded-lg border border-(--app-border)',
                  'text-xs font-medium text-(--app-muted)',
                  'hover:bg-white/[0.05] hover:text-(--app-text)'
                )}
                onClick={onClear}
              >
                <Eraser aria-hidden="true" className="size-4" />

                {clearLabel}
              </button>
            </Popover.Close>
          )}

          <Popover.Arrow className="fill-(--app-border)" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
