import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import type { ReactElement, ReactNode } from 'react'

import { cn } from '../lib/cn'
import { Tooltip } from './tooltip'

export interface IconPickerOption<Value extends string> {
  value: Value
  label: string
}

interface IconPickerProps<Value extends string> {
  value: Value
  onChange: (value: Value) => void
  trigger: ReactElement
  triggerTooltip?: ReactNode
  options: readonly IconPickerOption<Value>[]
  renderIcon: (value: Value) => ReactNode
  align?: 'start' | 'center' | 'end'
  label: string
  optionDataAttribute?: `data-${string}`
}

export function IconPicker<Value extends string>({
  value,
  onChange,
  trigger,
  triggerTooltip,
  options,
  renderIcon,
  align = 'end',
  label,
  optionDataAttribute
}: IconPickerProps<Value>): React.JSX.Element {
  const menuTrigger = <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>

  return (
    <DropdownMenu.Root>
      {triggerTooltip ? (
        <Tooltip content={triggerTooltip} side="top">
          {menuTrigger}
        </Tooltip>
      ) : (
        menuTrigger
      )}

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          data-icon-picker-content
          sideOffset={8}
          align={align}
          collisionPadding={12}
          className="z-[120] w-72 rounded-2xl border border-[var(--app-border)] bg-[var(--app-menu)] p-2 shadow-[var(--app-shadow-menu)]"
        >
          <DropdownMenu.Label className="px-2 py-2 text-xs font-medium text-[var(--app-muted)]">
            {label}
          </DropdownMenu.Label>

          <div className="grid max-h-[28rem] grid-cols-5 gap-1 overflow-y-auto pr-1">
            {options.map((option) => {
              const dataAttributeProps: Record<string, string> = {
                'data-icon-option': option.value
              }

              if (optionDataAttribute) {
                dataAttributeProps[optionDataAttribute] = option.value
              }

              return (
                <DropdownMenu.Item
                  key={option.value}
                  {...dataAttributeProps}
                  aria-label={option.label}
                  className={cn(
                    'flex aspect-square cursor-default items-center justify-center rounded-xl border outline-none',
                    'border-transparent text-[var(--app-muted)] transition-colors',
                    'hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]',
                    'focus:bg-[var(--app-control-hover)] focus:text-[var(--app-text)]',
                    option.value === value &&
                      '[border-color:color-mix(in_srgb,var(--app-accent-500)_25%,transparent)] text-[var(--app-accent-500)] shadow-sm [background:color-mix(in_srgb,var(--app-accent-500)_15%,transparent)]'
                  )}
                  onSelect={() => onChange(option.value)}
                >
                  <Tooltip content={option.label} side="top">
                    <span className="flex size-full items-center justify-center">
                      {renderIcon(option.value)}
                    </span>
                  </Tooltip>
                </DropdownMenu.Item>
              )
            })}
          </div>

          <DropdownMenu.Arrow className="fill-[var(--app-menu)]" />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
