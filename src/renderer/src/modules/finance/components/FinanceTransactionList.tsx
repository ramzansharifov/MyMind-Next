import {
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  MoreHorizontal,
  Settings2
} from 'lucide-react'

import type { FinanceIconName, FinanceTransaction } from '../../../../../shared/contracts/finance'
import { formatMoneyMinor } from '../../../../../shared/finance-money'
import { FinanceIcon } from '../lib/finance-ui'
import { FinanceButton } from './FinancePrimitives'

export function FinanceTransactionList({
  transactions,
  onEdit,
  onDelete,
  compact = false
}: {
  transactions: FinanceTransaction[]
  onEdit?: (transaction: FinanceTransaction) => void
  onDelete?: (transaction: FinanceTransaction) => void
  compact?: boolean
}): React.JSX.Element {
  return (
    <div className="divide-y divide-[var(--app-border)]">
      {transactions.map((transaction) => (
        <FinanceTransactionRow
          key={transaction.id}
          transaction={transaction}
          onEdit={onEdit}
          onDelete={onDelete}
          compact={compact}
        />
      ))}
    </div>
  )
}

export function FinanceTransactionRow({
  transaction,
  onEdit,
  onDelete,
  compact = false
}: {
  transaction: FinanceTransaction
  onEdit?: (transaction: FinanceTransaction) => void
  onDelete?: (transaction: FinanceTransaction) => void
  compact?: boolean
}): React.JSX.Element {
  const outgoing = transaction.entries.find((entry) => entry.signedAmountMinor < 0)
  const incoming = transaction.entries.find((entry) => entry.signedAmountMinor > 0)
  const entry = transaction.entries[0]
  const title =
    transaction.type === 'transfer'
      ? `${outgoing?.accountName ?? 'Счёт'} → ${incoming?.accountName ?? 'Счёт'}`
      : transaction.type === 'adjustment'
        ? 'Системная корректировка'
        : (transaction.tagNameSnapshot ?? (transaction.type === 'income' ? 'Доход' : 'Расход'))
  const Icon =
    transaction.type === 'income'
      ? ArrowDownLeft
      : transaction.type === 'expense'
        ? ArrowUpRight
        : transaction.type === 'transfer'
          ? ArrowRightLeft
          : Settings2
  const amount = transaction.type === 'transfer' ? outgoing : entry
  return (
    <article className={`group flex items-center gap-3 ${compact ? 'py-3' : 'px-4 py-3.5'}`}>
      <div
        className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${transaction.type === 'income' ? 'bg-emerald-500/10 text-emerald-300' : transaction.type === 'expense' ? 'bg-red-500/10 text-red-300' : transaction.type === 'transfer' ? 'bg-violet-500/10 text-violet-300' : 'bg-[var(--app-overlay-subtle)] text-[var(--app-muted)]'}`}
      >
        {transaction.tagIconSnapshot &&
        transaction.type !== 'transfer' &&
        transaction.type !== 'adjustment' ? (
          <FinanceIcon name={transaction.tagIconSnapshot as FinanceIconName} className="size-5" />
        ) : (
          <Icon className="size-5" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <h4 className="truncate text-sm font-medium text-[var(--app-text)]">{title}</h4>
          {transaction.isSystem && (
            <span className="rounded-md bg-[var(--app-overlay-subtle)] px-1.5 py-0.5 text-[10px] tracking-wider text-[var(--app-muted)] uppercase">
              Системная
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-[var(--app-muted)]">
          {transaction.comment ||
            (transaction.type === 'transfer' ? 'Перевод между счетами' : entry?.accountName)}{' '}
          ·{' '}
          {new Date(transaction.occurredAt).toLocaleString('ru-RU', {
            dateStyle: 'medium',
            timeStyle: 'short'
          })}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <div
          className={`text-sm font-semibold tabular-nums ${transaction.type === 'income' ? 'text-emerald-300' : transaction.type === 'expense' ? 'text-red-300' : 'text-[var(--app-text)]'}`}
        >
          {amount
            ? `${amount.signedAmountMinor > 0 ? '+' : ''}${formatMoneyMinor(amount.signedAmountMinor, amount.accountCurrencyCode)}`
            : '—'}
        </div>
        {transaction.type === 'transfer' &&
          incoming &&
          outgoing?.accountCurrencyCode !== incoming.accountCurrencyCode && (
            <div className="mt-0.5 text-xs text-[var(--app-muted)] tabular-nums">
              +{formatMoneyMinor(incoming.signedAmountMinor, incoming.accountCurrencyCode)}
            </div>
          )}
      </div>
      {(onEdit || onDelete) && !transaction.isSystem && (
        <details className="relative">
          <summary
            aria-label="Действия с операцией"
            className="flex size-8 cursor-pointer list-none items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-control-hover)]"
          >
            <MoreHorizontal className="size-4" />
          </summary>
          <div className="absolute right-0 z-20 mt-1 w-36 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-1 shadow-xl">
            {onEdit && (
              <button
                type="button"
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-[var(--app-text)] hover:bg-[var(--app-control-hover)]"
                onClick={() => onEdit(transaction)}
              >
                Изменить
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-300 hover:bg-red-500/10"
                onClick={() => onDelete(transaction)}
              >
                Удалить
              </button>
            )}
          </div>
        </details>
      )}
    </article>
  )
}

export function FinancePagination({
  total,
  limit,
  offset,
  onChange
}: {
  total: number
  limit: number
  offset: number
  onChange: (offset: number) => void
}): React.JSX.Element {
  if (total <= limit) return <></>
  return (
    <div className="flex items-center justify-between border-t border-[var(--app-border)] px-4 py-3 text-sm text-[var(--app-muted)]">
      <span>
        {offset + 1}–{Math.min(total, offset + limit)} из {total}
      </span>
      <div className="flex gap-2">
        <FinanceButton
          size="sm"
          disabled={offset === 0}
          onClick={() => onChange(Math.max(0, offset - limit))}
        >
          Назад
        </FinanceButton>
        <FinanceButton
          size="sm"
          disabled={offset + limit >= total}
          onClick={() => onChange(offset + limit)}
        >
          Дальше
        </FinanceButton>
      </div>
    </div>
  )
}
