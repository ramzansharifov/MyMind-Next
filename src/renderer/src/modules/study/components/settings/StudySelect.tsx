import * as Select from '@radix-ui/react-select'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'

import { cn } from '../../../../shared/lib/cn'

export interface StudySelectOption {
  value: string
  label: string
}

interface StudySelectProps {
  value: string
  options: StudySelectOption[]
  ariaLabel: string
  placeholder?: string
  disabled?: boolean
  onValueChange: (value: string) => void
}

export function StudySelect({
  value,
  options,
  ariaLabel,
  placeholder,
  disabled = false,
  onValueChange
}: StudySelectProps): React.JSX.Element {
  return (
    <Select.Root value={value} disabled={disabled} onValueChange={onValueChange}>
      <Select.Trigger
        aria-label={ariaLabel}
        className={cn(
          'flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-lg',
          'border border-(--app-border) bg-(--app-workspace) px-3',
          'text-sm text-(--app-text) outline-none',
          'hover:border-(--app-border-strong)',
          'focus-visible:border-violet-500/50 focus-visible:ring-2 focus-visible:ring-violet-500/15',
          'disabled:cursor-not-allowed disabled:opacity-45'
        )}
      >
        <Select.Value placeholder={placeholder} className="min-w-0 flex-1 truncate text-left" />

        <Select.Icon asChild>
          <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-(--app-muted)" />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={6}
          className={cn(
            'z-[80] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl',
            'border border-(--app-border) bg-(--app-surface-raised) p-1',
            'text-sm text-(--app-text)'
          )}
        >
          <Select.ScrollUpButton className="flex h-7 items-center justify-center text-(--app-muted)">
            <ChevronUp aria-hidden="true" className="size-4" />
          </Select.ScrollUpButton>

          <Select.Viewport>
            {options.map((option) => (
              <Select.Item
                key={option.value}
                value={option.value}
                className={cn(
                  'relative flex h-9 cursor-default items-center rounded-lg select-none',
                  'pr-8 pl-3 outline-none',
                  'data-[highlighted]:bg-white/[0.06]',
                  'data-[highlighted]:text-(--app-text)'
                )}
              >
                <Select.ItemText>{option.label}</Select.ItemText>

                <Select.ItemIndicator className="absolute right-2 inline-flex items-center">
                  <Check aria-hidden="true" className="size-4 text-violet-300" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>

          <Select.ScrollDownButton className="flex h-7 items-center justify-center text-(--app-muted)">
            <ChevronDown aria-hidden="true" className="size-4" />
          </Select.ScrollDownButton>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}
