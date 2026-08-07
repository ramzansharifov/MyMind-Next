import { Filter, ReceiptText, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import type {
  FinanceAccountSummary,
  FinanceTagSummary,
  FinanceTransaction,
  FinanceTransactionFilters,
  FinanceTransactionPage,
  FinanceTransactionType,
  FinanceUserTransactionType
} from '../../../../../shared/contracts/finance'
import { financeClient } from '../api/finance-client'
import { getFinanceErrorMessage } from '../lib/finance-ui'
import {
  FinanceButton,
  FinanceEmptyState,
  FinanceErrorState,
  FinanceLoadingState,
  financeInputClassName
} from './FinancePrimitives'
import { FinanceSection } from './FinanceSection'
import { FinancePagination, FinanceTransactionList } from './FinanceTransactionList'
import { FinanceConfirmDialog } from './dialogs/FinanceConfirmDialog'
import { FinanceTransactionDialog } from './dialogs/FinanceTransactionDialog'

interface Props {
  accounts: FinanceAccountSummary[]
  tags: FinanceTagSummary[]
  initialTransaction?: FinanceTransaction | null
  onChanged: () => void | Promise<void>
}

const emptyPage: FinanceTransactionPage = { items: [], total: 0, limit: 30, offset: 0 }

export function FinanceTransactions({
  accounts,
  tags,
  initialTransaction,
  onChanged
}: Props): React.JSX.Element {
  const [page, setPage] = useState(emptyPage)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [type, setType] = useState('all')
  const [accountId, setAccountId] = useState('all')
  const [tagId, setTagId] = useState('all')
  const [includeSystem, setIncludeSystem] = useState(false)
  const [offset, setOffset] = useState(0)
  const [dialogType, setDialogType] = useState<FinanceUserTransactionType>('expense')
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false)
  const [editTransaction, setEditTransaction] = useState<FinanceTransaction | null>(
    initialTransaction ?? null
  )
  const [deleteTransaction, setDeleteTransaction] = useState<FinanceTransaction | null>(null)

  useEffect(() => {
    if (!initialTransaction) return
    setEditTransaction(initialTransaction)
    setDialogType(initialTransaction.type === 'adjustment' ? 'expense' : initialTransaction.type)
    setTransactionDialogOpen(true)
  }, [initialTransaction])

  const filters = useMemo<FinanceTransactionFilters>(
    () => ({
      types: type === 'all' ? undefined : [type as FinanceTransactionType],
      accountIds: accountId === 'all' ? undefined : [accountId],
      tagId: tagId === 'all' ? undefined : tagId,
      search: search.trim() || undefined,
      includeSystem,
      sort: 'date-desc',
      limit: 30,
      offset
    }),
    [accountId, includeSystem, offset, search, tagId, type]
  )

  const load = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setError(null)
    try {
      setPage(await financeClient.listTransactions(filters))
    } catch (reason) {
      setError(getFinanceErrorMessage(reason))
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 150)
    return () => window.clearTimeout(timer)
  }, [load])

  async function refreshAll(): Promise<void> {
    await Promise.all([load(), onChanged()])
  }

  return (
    <div className="space-y-4">
      <FinanceSection title="Фильтры" icon={<Filter aria-hidden="true" className="size-5" />}>
        <div className="grid grid-cols-[minmax(12rem,2fr)_repeat(3,minmax(8rem,1fr))] gap-3 max-[960px]:grid-cols-2 max-[560px]:grid-cols-1">
          <label className="relative">
            <Search className="pointer-events-none absolute top-3.5 left-3 size-4 text-[var(--app-muted)]" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setOffset(0)
              }}
              placeholder="Поиск по комментарию"
              className={`${financeInputClassName} pl-9`}
            />
          </label>
          <select
            aria-label="Тип операции"
            value={type}
            onChange={(event) => {
              setType(event.target.value)
              setOffset(0)
            }}
            className={financeInputClassName}
          >
            <option value="all">Все типы</option>
            <option value="income">Доходы</option>
            <option value="expense">Расходы</option>
            <option value="transfer">Переводы</option>
            <option value="adjustment">Корректировки</option>
          </select>
          <select
            aria-label="Счёт"
            value={accountId}
            onChange={(event) => {
              setAccountId(event.target.value)
              setOffset(0)
            }}
            className={financeInputClassName}
          >
            <option value="all">Все счета</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Тег"
            value={tagId}
            onChange={(event) => {
              setTagId(event.target.value)
              setOffset(0)
            }}
            className={financeInputClassName}
          >
            <option value="all">Все теги</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-sm text-[var(--app-muted)]">
            <input
              type="checkbox"
              checked={includeSystem}
              onChange={(event) => {
                setIncludeSystem(event.target.checked)
                setOffset(0)
              }}
              className="size-4 accent-violet-500"
            />
            Показывать системные операции
          </label>
          <FinanceButton
            size="sm"
            onClick={() => {
              setSearch('')
              setType('all')
              setAccountId('all')
              setTagId('all')
              setIncludeSystem(false)
              setOffset(0)
            }}
          >
            <Filter aria-hidden="true" className="size-4" />
            Сбросить
          </FinanceButton>
        </div>
      </FinanceSection>

      <FinanceSection
        title="Операции"
        icon={<ReceiptText aria-hidden="true" className="size-5" />}
        bodyClassName="p-0"
      >
        {isLoading ? (
          <div className="p-4">
            <FinanceLoadingState label="Загружаем операции…" />
          </div>
        ) : error ? (
          <div className="p-4">
            <FinanceErrorState message={error} onRetry={() => void load()} />
          </div>
        ) : page.items.length === 0 ? (
          <div className="p-3">
            <FinanceEmptyState
              icon={<Search className="size-6" />}
              title="Операции не найдены"
              description="Измените фильтры или создайте новую финансовую операцию."
            />
          </div>
        ) : (
          <>
            <FinanceTransactionList
              transactions={page.items}
              onEdit={(item) => {
                setEditTransaction(item)
                setDialogType(item.type === 'adjustment' ? 'expense' : item.type)
                setTransactionDialogOpen(true)
              }}
              onDelete={setDeleteTransaction}
            />
            <FinancePagination
              total={page.total}
              limit={page.limit}
              offset={page.offset}
              onChange={setOffset}
            />
          </>
        )}
      </FinanceSection>

      <FinanceTransactionDialog
        open={transactionDialogOpen}
        initialType={dialogType}
        accounts={accounts}
        tags={tags}
        transaction={editTransaction}
        onOpenChange={(open) => {
          setTransactionDialogOpen(open)
          if (!open) setEditTransaction(null)
        }}
        onSaved={async () => refreshAll()}
      />
      <FinanceConfirmDialog
        open={deleteTransaction !== null}
        title="Удалить операцию?"
        subject={
          deleteTransaction?.comment || deleteTransaction?.tagNameSnapshot || 'Финансовая операция'
        }
        description="Проводки будут удалены атомарно, а балансы и агрегаты пересчитаются."
        onOpenChange={(open) => !open && setDeleteTransaction(null)}
        onConfirm={async () => {
          if (!deleteTransaction) return
          await financeClient.deleteTransaction({ id: deleteTransaction.id })
          setDeleteTransaction(null)
          await refreshAll()
        }}
      />
    </div>
  )
}
