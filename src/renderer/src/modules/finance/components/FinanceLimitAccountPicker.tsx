import { Layers3 } from 'lucide-react'

import type { FinanceAccountSummary } from '../../../../../shared/contracts/finance'
import { cn } from '../../../shared/lib/cn'
import { FinanceIcon } from '../lib/FinanceIcon'

interface Props {
  accounts: FinanceAccountSummary[]
  accountIds: string[]
  allAccounts: boolean
  disabled?: boolean
  onChange: (selection: { accountIds: string[]; allAccounts: boolean }) => void
}

export function FinanceLimitAccountPicker({
  accounts,
  accountIds,
  allAccounts,
  disabled = false,
  onChange
}: Props): React.JSX.Element {
  const currencies = [...new Set(accounts.map((account) => account.currencyCode))]
  const canSelectAll = accounts.length > 0 && currencies.length === 1
  const selectedCurrency = allAccounts
    ? canSelectAll
      ? currencies[0]
      : null
    : accounts.find((account) => account.id === accountIds[0])?.currencyCode ?? null

  if (accounts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-amber-500/25 bg-amber-500/[0.04] px-4 py-5 text-center text-xs text-amber-200">
        Сначала создайте хотя бы один счёт.
      </div>
    )
  }

  function toggleAccount(account: FinanceAccountSummary): void {
    if (disabled) return

    if (allAccounts) {
      onChange({ accountIds: [account.id], allAccounts: false })
      return
    }

    if (accountIds.includes(account.id)) {
      onChange({
        accountIds: accountIds.filter((id) => id !== account.id),
        allAccounts: false
      })
      return
    }

    if (selectedCurrency && selectedCurrency !== account.currencyCode) {
      onChange({ accountIds: [account.id], allAccounts: false })
      return
    }

    onChange({ accountIds: [...accountIds, account.id], allAccounts: false })
  }

  return (
    <div role="group" aria-label="Счета лимита" className="space-y-2">
      {!canSelectAll && currencies.length > 1 && (
        <p className="text-xs leading-5 text-[var(--app-muted)]">
          Можно выбрать несколько счетов, если у них одинаковая валюта. Выбор счёта другой валюты
          переключит группу на эту валюту.
        </p>
      )}
      <div className="grid max-h-56 grid-cols-4 gap-2 overflow-y-auto pr-1 max-[680px]:grid-cols-3 max-[500px]:grid-cols-2">
        {canSelectAll && (
          <button
            type="button"
            role="checkbox"
            aria-checked={allAccounts}
            aria-label={`Все счета, ${currencies[0]}`}
            disabled={disabled}
            className={cn(
              'flex min-h-24 flex-col items-center justify-center rounded-xl border px-2 py-3 text-center outline-none',
              'transition-[background-color,border-color,box-shadow] focus-visible:ring-2 focus-visible:ring-violet-500/35',
              'disabled:cursor-not-allowed disabled:opacity-45',
              allAccounts
                ? 'border-violet-500/50 bg-violet-500/12 shadow-sm ring-1 ring-violet-500/15'
                : 'border-[var(--app-border)] bg-[var(--app-field)] hover:border-[var(--app-border-strong)] hover:bg-[var(--app-field-hover)]'
            )}
            onClick={() => onChange({ accountIds: [], allAccounts: true })}
          >
            <span className="flex size-9 items-center justify-center rounded-xl border border-violet-500/15 bg-violet-500/10 text-violet-300">
              <Layers3 aria-hidden="true" className="size-4.5" />
            </span>
            <span className="mt-2 text-xs font-semibold text-[var(--app-text)]">Все счета</span>
            <span className="mt-0.5 text-[10px] font-medium tracking-wide text-[var(--app-muted)] uppercase">
              {currencies[0]}
            </span>
          </button>
        )}

        {accounts.map((account) => {
          const selected = !allAccounts && accountIds.includes(account.id)
          const differentCurrency =
            !allAccounts && selectedCurrency !== null && selectedCurrency !== account.currencyCode

          return (
            <button
              key={account.id}
              type="button"
              role="checkbox"
              aria-checked={selected}
              aria-label={`${account.name}, ${account.currencyCode}`}
              disabled={disabled}
              className={cn(
                'flex min-h-24 flex-col items-center justify-center rounded-xl border px-2 py-3 text-center outline-none',
                'transition-[background-color,border-color,box-shadow,opacity] focus-visible:ring-2 focus-visible:ring-violet-500/35',
                'disabled:cursor-not-allowed disabled:opacity-45',
                selected
                  ? 'border-violet-500/50 bg-violet-500/12 shadow-sm ring-1 ring-violet-500/15'
                  : 'border-[var(--app-border)] bg-[var(--app-field)] hover:border-[var(--app-border-strong)] hover:bg-[var(--app-field-hover)]',
                differentCurrency && 'opacity-60 hover:opacity-100'
              )}
              onClick={() => toggleAccount(account)}
            >
              <span className="flex size-9 items-center justify-center rounded-xl border border-violet-500/15 bg-violet-500/10 text-violet-300">
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
    </div>
  )
}
