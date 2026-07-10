import * as ToggleGroup from '@radix-ui/react-toggle-group'

import { cn } from '../../../../shared/lib/cn'

export interface SegmentedChoiceOption {
  value: string
  label: string
  ariaLabel?: string
}

interface SegmentedChoiceProps {
  value: string
  options: SegmentedChoiceOption[]
  ariaLabel: string
  columns?: 3 | 4
  disabled?: boolean
  onValueChange: (value: string) => void
}

export function SegmentedChoice({
  value,
  options,
  ariaLabel,
  columns = 3,
  disabled = false,
  onValueChange
}: SegmentedChoiceProps): React.JSX.Element {
  return (
    <ToggleGroup.Root
      type="single"
      value={value}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn('grid gap-2', columns === 4 ? 'grid-cols-4' : 'grid-cols-3')}
      onValueChange={(nextValue) => {
        if (nextValue) {
          onValueChange(nextValue)
        }
      }}
    >
      {options.map((option) => (
        <ToggleGroup.Item
          key={option.value}
          value={option.value}
          aria-label={option.ariaLabel ?? option.label}
          className={cn(
            'flex h-9 min-w-0 items-center justify-center rounded-lg border px-2',
            'border-(--app-border) bg-(--app-workspace)',
            'text-xs font-semibold text-(--app-muted)',
            'transition-colors outline-none',
            'hover:border-(--app-border-strong) hover:text-(--app-text)',
            'focus-visible:ring-2 focus-visible:ring-violet-500/35',
            'data-[state=on]:border-violet-500/45',
            'data-[state=on]:bg-violet-500/15',
            'data-[state=on]:text-violet-200',
            'disabled:cursor-not-allowed disabled:opacity-40'
          )}
        >
          {option.label}
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  )
}
