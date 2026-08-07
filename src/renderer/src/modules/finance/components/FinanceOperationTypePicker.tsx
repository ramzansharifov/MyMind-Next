import { ArrowDownLeft, ArrowRightLeft, ArrowUpRight, type LucideIcon } from 'lucide-react'

import type { FinanceUserTransactionType } from '../../../../../shared/contracts/finance'
import { cn } from '../../../shared/lib/cn'

const options = [
  {
    value: 'income',
    label: 'Доход',
    icon: ArrowDownLeft,
    activeClassName: 'border-emerald-500/40 bg-emerald-500/16 text-emerald-100 shadow-sm',
    idleClassName: 'border-emerald-500/20 bg-emerald-500/[0.05] text-emerald-300/85 hover:bg-emerald-500/10'
  },
  {
    value: 'expense',
    label: 'Расход',
    icon: ArrowUpRight,
    activeClassName: 'border-red-500/40 bg-red-500/16 text-red-100 shadow-sm',
    idleClassName: 'border-red-500/20 bg-red-500/[0.05] text-red-300/85 hover:bg-red-500/10'
  },
  {
    value: 'transfer',
    label: 'Перевод',
    icon: ArrowRightLeft,
    activeClassName: 'border-violet-500/40 bg-violet-500/16 text-violet-100 shadow-sm',
    idleClassName: 'border-violet-500/20 bg-violet-500/[0.05] text-violet-300/85 hover:bg-violet-500/10'
  }
] as const satisfies ReadonlyArray<{
  value: FinanceUserTransactionType
  label: string
  icon: LucideIcon
  activeClassName: string
  idleClassName: string
}>

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
              'transition-[background-color,border-color,box-shadow] focus-visible:ring-2 focus-visible:ring-violet-500/35',
              'disabled:cursor-not-allowed disabled:opacity-45',
              selected ? option.activeClassName : option.idleClassName
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
