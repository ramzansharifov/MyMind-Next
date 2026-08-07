import { ArrowDownLeft, ArrowRightLeft, ArrowUpRight, type LucideIcon } from 'lucide-react'

import type { FinanceUserTransactionType } from '../../../../../shared/contracts/finance'
import { cn } from '../../../shared/lib/cn'

const options = [
  {
    value: 'income',
    label: 'Доход',
    icon: ArrowDownLeft,
    activeClassName:
      'border-emerald-400/60 bg-emerald-500/22 text-emerald-100 shadow-sm ring-1 ring-emerald-400/15'
  },
  {
    value: 'expense',
    label: 'Расход',
    icon: ArrowUpRight,
    activeClassName:
      'border-red-400/60 bg-red-500/22 text-red-100 shadow-sm ring-1 ring-red-400/15'
  },
  {
    value: 'transfer',
    label: 'Перевод',
    icon: ArrowRightLeft,
    activeClassName:
      'border-violet-400/60 bg-violet-500/22 text-violet-100 shadow-sm ring-1 ring-violet-400/15'
  }
] as const satisfies ReadonlyArray<{
  value: FinanceUserTransactionType
  label: string
  icon: LucideIcon
  activeClassName: string
}>

const idleClassName =
  'border-[var(--app-border)] bg-[var(--app-workspace)] text-[var(--app-muted)] hover:border-[var(--app-border-strong)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'

export function FinanceOperationTypePicker({
  value,
  disabled = false,
  onChange
}: {
  value: FinanceUserTransactionType
  disabled?: boolean
  onChange: (value: FinanceUserTransactionType) => void
}): React.JSX.Element {
  return (
    <div role="radiogroup" aria-label="Тип операции" className="grid grid-cols-3 gap-2">
      {options.map((option) => {
        const Icon = option.icon
        const selected = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            className={cn(
              'flex h-11 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold outline-none',
              'transition-[background-color,border-color,box-shadow,color] focus-visible:ring-2 focus-visible:ring-violet-500/35',
              'disabled:cursor-not-allowed disabled:opacity-45',
              selected ? option.activeClassName : idleClassName
            )}
            onClick={() => onChange(option.value)}
          >
            <Icon aria-hidden="true" className="size-4" />
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
