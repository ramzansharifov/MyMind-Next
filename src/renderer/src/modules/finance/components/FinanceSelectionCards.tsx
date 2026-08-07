import type {
  FinanceAccountSummary,
  FinanceTagSummary
} from '../../../../../shared/contracts/finance'
import { cn } from '../../../shared/lib/cn'
import { FinanceIcon } from '../lib/FinanceIcon'

interface AccountPickerProps {
  accounts: FinanceAccountSummary[]
  value: string
  ariaLabel: string
  disabled?: boolean
  onChange: (accountId: string) => void
}

export function FinanceAccountCardPicker({
  accounts,
  value,
  ariaLabel,
  disabled = false,
  onChange
}: AccountPickerProps): React.JSX.Element {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="grid max-h-52 grid-cols-4 gap-2 overflow-y-auto pr-1 max-[620px]:grid-cols-3 max-[460px]:grid-cols-2"
    >
      {accounts.map((account) => {
        const selected = account.id === value
        return (
          <button
            key={account.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${account.name}, ${account.currencyCode}`}
            disabled={disabled}
            className={cn(
              'flex min-h-24 flex-col items-center justify-center rounded-xl border px-2 py-3 text-center outline-none',
              'transition-[background-color,border-color,box-shadow,transform]',
              'focus-visible:ring-2 focus-visible:ring-violet-500/35',
              'disabled:cursor-not-allowed disabled:opacity-45',
              selected
                ? 'border-violet-500/45 bg-violet-500/10 shadow-sm ring-1 ring-violet-500/10'
                : 'border-[var(--app-border)] bg-[var(--app-field)] hover:border-[var(--app-border-strong)] hover:bg-[var(--app-field-hover)]'
            )}
            onClick={() => onChange(account.id)}
          >
            <span
              className="flex size-9 items-center justify-center rounded-xl border border-white/5"
              style={{ backgroundColor: `${account.color}1f`, color: account.color }}
            >
              <FinanceIcon name={account.icon} className="size-4.5" />
            </span>
            <span className="mt-2 max-w-full truncate text-xs font-semibold text-[var(--app-text)]">
              {account.name}
            </span>
            <span className="mt-0.5 text-[10px] font-medium tracking-wide text-[var(--app-muted)] uppercase">
              {account.currencyCode}
            </span>
          </button>
        )
      })}
    </div>
  )
}

interface TagPickerProps {
  tags: FinanceTagSummary[]
  value: string
  ariaLabel: string
  disabled?: boolean
  onChange: (tagId: string) => void
}

export function FinanceTagCardPicker({
  tags,
  value,
  ariaLabel,
  disabled = false,
  onChange
}: TagPickerProps): React.JSX.Element {
  if (tags.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-amber-500/25 bg-amber-500/[0.04] px-4 py-5 text-center text-xs text-amber-200">
        Подходящих тегов пока нет.
      </div>
    )
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="grid max-h-52 grid-cols-5 gap-2 overflow-y-auto pr-1 max-[680px]:grid-cols-4 max-[520px]:grid-cols-3"
    >
      {tags.map((tag) => {
        const selected = tag.id === value
        return (
          <button
            key={tag.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={tag.name}
            disabled={disabled}
            className={cn(
              'flex min-h-20 flex-col items-center justify-center rounded-xl border px-2 py-2.5 text-center outline-none',
              'transition-[background-color,border-color,box-shadow,transform]',
              'focus-visible:ring-2 focus-visible:ring-violet-500/35',
              'disabled:cursor-not-allowed disabled:opacity-45',
              selected
                ? 'border-violet-500/45 bg-violet-500/10 shadow-sm ring-1 ring-violet-500/10'
                : 'border-[var(--app-border)] bg-[var(--app-field)] hover:border-[var(--app-border-strong)] hover:bg-[var(--app-field-hover)]'
            )}
            onClick={() => onChange(tag.id)}
          >
            <span
              className="flex size-8 items-center justify-center rounded-lg border border-white/5"
              style={{ backgroundColor: `${tag.color}1f`, color: tag.color }}
            >
              <FinanceIcon name={tag.icon} className="size-4" />
            </span>
            <span className="mt-1.5 max-w-full truncate text-[11px] font-medium text-[var(--app-text)]">
              {tag.name}
            </span>
          </button>
        )
      })}
    </div>
  )
}
