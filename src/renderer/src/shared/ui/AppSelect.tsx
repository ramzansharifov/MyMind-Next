import * as Select from '@radix-ui/react-select'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'

import { cn } from '../lib/cn'
import './AppSelect.css'

export interface AppSelectOption {
  value: string
  label: string
}

interface AppSelectProps {
  value: string
  options: readonly AppSelectOption[]
  ariaLabel: string
  placeholder?: string
  disabled?: boolean
  triggerClassName?: string
  contentClassName?: string
  onValueChange: (value: string) => void
}

export function AppSelect({
  value,
  options,
  ariaLabel,
  placeholder,
  disabled = false,
  triggerClassName,
  contentClassName,
  onValueChange
}: AppSelectProps): React.JSX.Element {
  return (
    <Select.Root value={value} disabled={disabled} onValueChange={onValueChange}>
      <Select.Trigger
        aria-label={ariaLabel}
        className={cn(
          'app-select-trigger flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-xl',
          'bg-[var(--app-workspace)] px-3 text-sm text-[var(--app-text)] outline-none',
          'transition-[background-color,border-color,box-shadow]',
          'hover:bg-[var(--app-control-hover)]',
          'focus-visible:ring-accent-500/15 focus-visible:bg-[var(--app-surface)] focus-visible:ring-2',
          'disabled:cursor-not-allowed disabled:opacity-45',
          triggerClassName
        )}
      >
        <Select.Value placeholder={placeholder} className="min-w-0 flex-1 truncate text-left" />
        <Select.Icon asChild>
          <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-[var(--app-muted)]" />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={6}
          collisionPadding={10}
          className={cn(
            'z-[90] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl',
            'border border-[var(--app-border)] bg-[var(--app-menu)] text-sm text-[var(--app-text)]',
            'shadow-[var(--app-shadow-menu)]',
            contentClassName
          )}
        >
          <Select.ScrollUpButton className="flex h-7 items-center justify-center text-[var(--app-muted)]">
            <ChevronUp aria-hidden="true" className="size-4" />
          </Select.ScrollUpButton>

          <Select.Viewport className="max-h-[min(18rem,var(--radix-select-content-available-height))] p-1">
            {options.map((option) => (
              <Select.Item
                key={option.value}
                value={option.value}
                className={cn(
                  'relative flex min-h-9 cursor-default items-center rounded-lg py-2 pr-8 pl-3 outline-none select-none',
                  'data-[highlighted]:bg-[var(--app-control-hover)] data-[highlighted]:text-[var(--app-text)]',
                  'data-[state=checked]:text-accent-200'
                )}
              >
                <Select.ItemText>{option.label}</Select.ItemText>
                <Select.ItemIndicator className="absolute right-2 inline-flex items-center">
                  <Check aria-hidden="true" className="text-accent-300 size-4" />
                </Select.ItemIndicator>
              </Select.Item>
            ))}
          </Select.Viewport>

          <Select.ScrollDownButton className="flex h-7 items-center justify-center text-[var(--app-muted)]">
            <ChevronDown aria-hidden="true" className="size-4" />
          </Select.ScrollDownButton>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}
