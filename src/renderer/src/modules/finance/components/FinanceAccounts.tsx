import { ArrowLeft, Coins, Edit3, Trash2, Wallet } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import type {
  FinanceAccountSummary,
  FinanceTransactionPage
} from '../../../../../shared/contracts/finance'
import { formatMoneyMinor } from '../../../../../shared/finance-money'
import { financeClient } from '../api/finance-client'
import { FinanceIcon, getFinanceErrorMessage } from '../lib/finance-ui'
import {
  FinanceButton,
  FinanceEmptyState,
  FinanceErrorState,
  FinanceLoadingState,
  FinanceSurface
} from './FinancePrimitives'
import { FinanceSection } from './FinanceSection'
import { FinanceTransactionList } from './FinanceTransactionList'
import { FinanceAccountDialog } from './dialogs/FinanceAccountDialog'
import { FinanceClearAccountDialog } from './dialogs/FinanceClearAccountDialog'
import { FinanceConfirmDialog } from './dialogs/FinanceConfirmDialog'

interface Props {
  accounts: FinanceAccountSummary[]
  selectedAccountId?: string | null
  onSelectedAccountChange: (id: string | null) => void
  onChanged: () => void | Promise<void>
}

export function FinanceAccounts({
  accounts,
  selectedAccountId,
  onSelectedAccountChange,
  onChanged
}: Props): React.JSX.Element {
  const [accountDialogOpen, setAccountDialogOpen] = useState(false)
  const [editAccount, setEditAccount] = useState<FinanceAccountSummary | null>(null)
  const [deleteAccount, setDeleteAccount] = useState<FinanceAccountSummary | null>(null)
  const [clearAccount, setClearAccount] = useState<FinanceAccountSummary | null>(null)
  const currencies = useMemo(
    () => [...new Set(accounts.map((account) => account.currencyCode))].sort(),
    [accounts]
  )
  const selected = accounts.find((account) => account.id === selectedAccountId) ?? null
  const accountDialogs = (
    <>
      <FinanceAccountDialog
        open={accountDialogOpen}
        account={editAccount}
        onOpenChange={(open) => {
          setAccountDialogOpen(open)
          if (!open) setEditAccount(null)
        }}
        onSaved={async () => onChanged()}
      />
      <FinanceClearAccountDialog
        open={clearAccount !== null}
        account={clearAccount}
        onOpenChange={(open) => !open && setClearAccount(null)}
        onCleared={async () => {
          setClearAccount(null)
          await onChanged()
        }}
      />
      <FinanceConfirmDialog
        open={deleteAccount !== null}
        title="Удалить счёт?"
        subject={deleteAccount?.name}
        description="Удалить можно только пустой счёт. Финансовые операции никогда не удаляются каскадно вместе со счётом."
        disabledReason={
          deleteAccount && deleteAccount.transactionCount > 0
            ? 'Чтобы удалить счёт, сначала очистите его историю.'
            : null
        }
        onOpenChange={(open) => !open && setDeleteAccount(null)}
        onConfirm={async () => {
          if (!deleteAccount) return
          await financeClient.deleteAccount({ id: deleteAccount.id })
          setDeleteAccount(null)
          await onChanged()
        }}
      />
    </>
  )

  if (selected)
    return (
      <>
        <AccountDetail
          account={selected}
          onBack={() => onSelectedAccountChange(null)}
          onEdit={() => {
            setEditAccount(selected)
            setAccountDialogOpen(true)
          }}
          onDelete={() => setDeleteAccount(selected)}
          onClear={() => setClearAccount(selected)}
        />
        {accountDialogs}
      </>
    )

  return (
    <div className="space-y-4">
      {currencies.length > 0 && (
        <FinanceSection
          title="Баланс по валютам"
          icon={<Coins aria-hidden="true" className="size-5" />}
        >
          <div className="grid grid-cols-4 gap-3 max-[900px]:grid-cols-2 max-[520px]:grid-cols-1">
            {currencies.map((code) => (
              <FinanceSurface
                key={code}
                as="article"
                className="bg-[var(--app-card)] p-4 shadow-none"
              >
                <div className="text-xs tracking-wider text-[var(--app-muted)] uppercase">
                  {code}
                </div>
                <div className="mt-2 text-xl font-semibold text-[var(--app-text)] tabular-nums">
                  {formatMoneyMinor(
                    accounts
                      .filter((account) => account.currencyCode === code)
                      .reduce((sum, account) => sum + account.balanceMinor, 0),
                    code
                  )}
                </div>
              </FinanceSurface>
            ))}
          </div>
        </FinanceSection>
      )}

      <FinanceSection title="Счета" icon={<Wallet aria-hidden="true" className="size-5" />}>
        {accounts.length === 0 ? (
          <FinanceEmptyState
            icon={<Wallet className="size-6" />}
            title="Пока нет счетов"
            description="Создайте первый счёт и укажите валюту, в которой хранится его баланс."
          />
        ) : (
          <div className="grid grid-cols-3 gap-3 max-[1000px]:grid-cols-2 max-[620px]:grid-cols-1">
            {accounts.map((account) => (
              <FinanceSurface
                key={account.id}
                as="article"
                className="group bg-[var(--app-card)] p-4 shadow-none transition hover:border-[var(--app-border-strong)] hover:bg-[var(--app-card-hover)]"
              >
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => onSelectedAccountChange(account.id)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex size-11 items-center justify-center rounded-xl"
                      style={{ background: `${account.color}22`, color: account.color }}
                    >
                      <FinanceIcon name={account.icon} className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate font-medium text-[var(--app-text)]">
                        {account.name}
                      </h3>
                      <p className="text-xs text-[var(--app-muted)]">{account.currencyCode}</p>
                    </div>
                  </div>
                  <div
                    className={`mt-5 text-xl font-semibold tabular-nums ${account.balanceMinor < 0 ? 'text-red-300' : 'text-[var(--app-text)]'}`}
                  >
                    {formatMoneyMinor(account.balanceMinor, account.currencyCode)}
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-[var(--app-muted)]">
                    <span>{account.transactionCount} операций</span>
                    <span>
                      {account.lastTransactionAt
                        ? new Date(account.lastTransactionAt).toLocaleDateString('ru-RU')
                        : 'Без истории'}
                    </span>
                  </div>
                </button>
                <div className="mt-4 flex gap-2 border-t border-[var(--app-border)] pt-3">
                  <FinanceButton
                    size="sm"
                    onClick={() => {
                      setEditAccount(account)
                      setAccountDialogOpen(true)
                    }}
                  >
                    <Edit3 className="size-4" />
                    Изменить
                  </FinanceButton>
                  <FinanceButton
                    size="sm"
                    tone="danger"
                    disabled={account.transactionCount > 0}
                    title={
                      account.transactionCount > 0
                        ? 'Чтобы удалить счёт, сначала очистите его историю.'
                        : 'Удалить пустой счёт'
                    }
                    onClick={() => setDeleteAccount(account)}
                  >
                    <Trash2 className="size-4" />
                    Удалить
                  </FinanceButton>
                </div>
              </FinanceSurface>
            ))}
          </div>
        )}
      </FinanceSection>

      {accountDialogs}
    </div>
  )
}

function AccountDetail({
  account,
  onBack,
  onEdit,
  onDelete,
  onClear
}: {
  account: FinanceAccountSummary
  onBack: () => void
  onEdit: () => void
  onDelete: () => void
  onClear: () => void
}): React.JSX.Element {
  const [page, setPage] = useState<FinanceTransactionPage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(async () => {
    setError(null)
    try {
      setPage(
        await financeClient.listTransactions({
          accountIds: [account.id],
          includeSystem: true,
          sort: 'date-desc',
          limit: 20,
          offset: 0
        })
      )
    } catch (reason) {
      setError(getFinanceErrorMessage(reason))
    }
  }, [account.id])
  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) void load()
    })
    return () => {
      cancelled = true
    }
  }, [load])
  const transactions = page?.items ?? []
  const income = transactions
    .filter((item) => item.type === 'income')
    .flatMap((item) => item.entries)
    .filter((entry) => entry.accountId === account.id)
    .reduce((sum, entry) => sum + Math.max(0, entry.signedAmountMinor), 0)
  const expense = transactions
    .filter((item) => item.type === 'expense')
    .flatMap((item) => item.entries)
    .filter((entry) => entry.accountId === account.id)
    .reduce((sum, entry) => sum + Math.abs(Math.min(0, entry.signedAmountMinor)), 0)
  const incomingTransfers = transactions
    .filter((item) => item.type === 'transfer')
    .flatMap((item) => item.entries)
    .filter((entry) => entry.accountId === account.id && entry.signedAmountMinor > 0)
    .reduce((sum, entry) => sum + entry.signedAmountMinor, 0)
  const outgoingTransfers = transactions
    .filter((item) => item.type === 'transfer')
    .flatMap((item) => item.entries)
    .filter((entry) => entry.accountId === account.id && entry.signedAmountMinor < 0)
    .reduce((sum, entry) => sum + Math.abs(entry.signedAmountMinor), 0)
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          className="inline-flex items-center gap-2 text-sm text-[var(--app-muted)] hover:text-[var(--app-text)]"
          onClick={onBack}
        >
          <ArrowLeft className="size-4" />
          Назад к счетам
        </button>
        <div className="flex gap-2">
          <FinanceButton onClick={onEdit}>
            <Edit3 className="size-4" />
            Изменить
          </FinanceButton>
          <FinanceButton tone="warning" onClick={onClear}>
            Очистить историю
          </FinanceButton>
          <FinanceButton
            tone="danger"
            disabled={account.transactionCount > 0}
            title={
              account.transactionCount > 0
                ? 'Чтобы удалить счёт, сначала очистите его историю.'
                : undefined
            }
            onClick={onDelete}
          >
            <Trash2 className="size-4" />
            Удалить
          </FinanceButton>
        </div>
      </div>
      <FinanceSurface className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-center gap-4">
            <div
              className="flex size-14 items-center justify-center rounded-2xl"
              style={{ background: `${account.color}22`, color: account.color }}
            >
              <FinanceIcon name={account.icon} className="size-7" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[var(--app-text)]">{account.name}</h2>
              <p className="mt-1 text-sm text-[var(--app-muted)]">{account.currencyCode}</p>
            </div>
          </div>
          <div className="text-right">
            <div
              className={`text-3xl font-semibold tabular-nums ${account.balanceMinor < 0 ? 'text-red-300' : 'text-[var(--app-text)]'}`}
            >
              {formatMoneyMinor(account.balanceMinor, account.currencyCode)}
            </div>
            {account.balanceMinor < 0 && (
              <p className="mt-1 text-xs text-red-200">Баланс отрицательный</p>
            )}
          </div>
        </div>
      </FinanceSurface>
      <div className="grid grid-cols-5 gap-3 max-[980px]:grid-cols-2 max-[520px]:grid-cols-1">
        <DetailMetric
          label="Начальный баланс"
          value={account.initialBalanceMinor}
          account={account}
        />
        <DetailMetric label="Доходы" value={income} account={account} positive />
        <DetailMetric label="Расходы" value={expense} account={account} negative />
        <DetailMetric label="Входящие переводы" value={incomingTransfers} account={account} />
        <DetailMetric label="Исходящие переводы" value={outgoingTransfers} account={account} />
      </div>
      <FinanceSurface className="overflow-hidden">
        <div className="border-b border-[var(--app-border)] px-4 py-3">
          <h3 className="font-medium text-[var(--app-text)]">История счёта</h3>
          <p className="mt-0.5 text-xs text-[var(--app-muted)]">
            Системные корректировки показаны для прозрачности.
          </p>
        </div>
        {error ? (
          <div className="p-4">
            <FinanceErrorState message={error} onRetry={() => void load()} />
          </div>
        ) : page === null ? (
          <div className="p-4">
            <FinanceLoadingState />
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-5 text-sm text-[var(--app-muted)]">История счёта пуста.</div>
        ) : (
          <FinanceTransactionList transactions={transactions} />
        )}
      </FinanceSurface>
    </div>
  )
}

function DetailMetric({
  label,
  value,
  account,
  positive,
  negative
}: {
  label: string
  value: number
  account: FinanceAccountSummary
  positive?: boolean
  negative?: boolean
}): React.JSX.Element {
  return (
    <FinanceSurface className="p-4">
      <div className="text-xs text-[var(--app-muted)]">{label}</div>
      <div
        className={`mt-2 font-semibold tabular-nums ${positive ? 'text-emerald-300' : negative ? 'text-red-300' : 'text-[var(--app-text)]'}`}
      >
        {formatMoneyMinor(value, account.currencyCode)}
      </div>
    </FinanceSurface>
  )
}
