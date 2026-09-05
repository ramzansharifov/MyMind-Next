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
  columns?: 2 | 3 | 4
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
      className={cn(
        'grid min-w-0 gap-2',
        columns === 4 ? 'grid-cols-4' : columns === 2 ? 'grid-cols-2' : 'grid-cols-3'
      )}
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
            'flex h-9 min-w-0 items-center justify-center overflow-hidden rounded-lg border px-2',
            'border-(--app-border) bg-(--app-workspace) text-(--app-muted)',
            'text-xs font-semibold',
            'transition-[background-color,border-color,color,box-shadow] outline-none',
            'hover:border-(--app-border-strong) hover:bg-white/[0.05] hover:text-(--app-text)',
            'focus-visible:ring-2 focus-visible:ring-(--app-accent-500)/40',
            'data-[state=on]:border-[color-mix(in_srgb,var(--app-accent-500)_72%,white_8%)]',
            'data-[state=on]:bg-[color-mix(in_srgb,var(--app-accent-500)_24%,var(--app-workspace))]',
            'data-[state=on]:text-[color-mix(in_srgb,var(--app-accent-400)_88%,white)]',
            'data-[state=on]:shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--app-accent-500)_22%,transparent),0_0_14px_color-mix(in_srgb,var(--app-accent-500)_14%,transparent)]',
            'disabled:cursor-not-allowed disabled:opacity-40'
          )}
        >
          <span className="min-w-0 truncate">{option.label}</span>
        </ToggleGroup.Item>
      ))}
    </ToggleGroup.Root>
  )
}
