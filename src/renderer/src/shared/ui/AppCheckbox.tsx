import * as Checkbox from '@radix-ui/react-checkbox'
import { Check } from 'lucide-react'

import { cn } from '../lib/cn'

interface AppCheckboxProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  ariaLabel: string
  disabled?: boolean
  className?: string
}

export function AppCheckbox({
  checked,
  onCheckedChange,
  ariaLabel,
  disabled = false,
  className
}: AppCheckboxProps): React.JSX.Element {
  return (
    <Checkbox.Root
      checked={checked}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        'flex size-4 shrink-0 items-center justify-center rounded-[5px] border outline-none transition-colors',
        'border-[var(--app-border-strong)] bg-[var(--app-workspace)] text-white',
        'hover:border-violet-400/45 hover:bg-[var(--app-control-hover)]',
        'focus-visible:ring-2 focus-visible:ring-violet-500/35',
        'data-[state=checked]:border-violet-500 data-[state=checked]:bg-violet-500',
        'disabled:cursor-not-allowed disabled:opacity-45',
        className
      )}
      onCheckedChange={(value) => onCheckedChange(value === true)}
    >
      <Checkbox.Indicator className="flex items-center justify-center">
        <Check aria-hidden="true" className="size-3" strokeWidth={2.5} />
      </Checkbox.Indicator>
    </Checkbox.Root>
  )
}
