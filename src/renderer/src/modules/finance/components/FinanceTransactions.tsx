import {
  CalendarClock,
  Filter,
  Gauge,
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Search,
  Trash2
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import type {
  FinanceAccountSummary,
  FinanceLimitStatus,
  FinanceTagSummary,
  FinanceTemplate,
  FinanceTransaction,
  FinanceTransactionFilters,
  FinanceTransactionPage,
  FinanceTransactionType,
  FinanceUserTransactionType
} from '../../../../../shared/contracts/finance'
import { formatMoneyMinor } from '../../../../../shared/finance-money'
import { financeClient } from '../api/finance-client'
import { getFinanceErrorMessage } from '../lib/finance-ui'
import { FinanceProgress } from './charts/FinanceCharts'
import {
  FinanceButton,
  FinanceEmptyState,
  FinanceErrorState,
  FinanceLoadingState,
  FinanceSurface,
  financeInputClassName
} from './FinancePrimitives'
import { FinancePagination, FinanceTransactionList } from './FinanceTransactionList'
import { FinanceConfirmDialog } from './dialogs/FinanceConfirmDialog'
import { FinanceLimitDialog } from './dialogs/FinanceLimitDialog'
import { FinanceTagDialog } from './dialogs/FinanceTagDialog'
import { FinanceTemplateDialog } from './dialogs/FinanceTemplateDialog'
import { FinanceTransactionDialog } from './dialogs/FinanceTransactionDialog'

interface Props {
  accounts: FinanceAccountSummary[]
  tags: FinanceTagSummary[]
  limits: FinanceLimitStatus[]
  templates: FinanceTemplate[]
  baseCurrencyCode: string
  initialTransaction?: FinanceTransaction | null
  initialTemplate?: FinanceTemplate | null
  onChanged: () => void | Promise<void>
}

const emptyPage: FinanceTransactionPage = { items: [], total: 0, limit: 30, offset: 0 }

export function FinanceTransactions({
  accounts,
  tags,
  limits,
  templates,
  baseCurrencyCode,
  initialTransaction,
  initialTemplate,
  onChanged
}: Props): React.JSX.Element {
  const [tab, setTab] = useState<'operations' | 'templates'>('operations')
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
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [editTemplate, setEditTemplate] = useState<FinanceTemplate | null>(null)
  const [deleteTemplate, setDeleteTemplate] = useState<FinanceTemplate | null>(null)
  const [useTemplate, setUseTemplate] = useState<FinanceTemplate | null>(initialTemplate ?? null)
  const [limitDialogOpen, setLimitDialogOpen] = useState(false)
  const [editLimit, setEditLimit] = useState<FinanceLimitStatus | null>(null)
  const [deleteLimit, setDeleteLimit] = useState<FinanceLimitStatus | null>(null)
  const [quickTagType, setQuickTagType] = useState<'income' | 'expense' | null>(null)

  useEffect(() => {
    if (initialTransaction) {
      setEditTransaction(initialTransaction)
      setTransactionDialogOpen(true)
      setTab('operations')
    }
  }, [initialTransaction])
  useEffect(() => {
    if (initialTemplate) {
      setUseTemplate(initialTemplate)
      setTransactionDialogOpen(true)
      setDialogType(initialTemplate.type)
      setTab('operations')
    }
  }, [initialTemplate])

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

  function openCreate(nextType: FinanceUserTransactionType): void {
    setDialogType(nextType)
    setEditTransaction(null)
    setUseTemplate(null)
    setTransactionDialogOpen(true)
  }

  async function refreshAll(): Promise<void> {
    await Promise.all([load(), onChanged()])
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="inline-flex rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-1"
          role="tablist"
          aria-label="Раздел транзакций"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'operations'}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === 'operations' ? 'bg-violet-500 text-white' : 'text-[var(--app-muted)] hover:text-[var(--app-text)]'}`}
            onClick={() => setTab('operations')}
          >
            Операции
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'templates'}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === 'templates' ? 'bg-violet-500 text-white' : 'text-[var(--app-muted)] hover:text-[var(--app-text)]'}`}
            onClick={() => setTab('templates')}
          >
            Шаблоны и лимиты
          </button>
        </div>
        {tab === 'operations' ? (
          <div className="flex flex-wrap gap-2">
            <FinanceButton size="sm" tone="positive" onClick={() => openCreate('income')}>
              Доход
            </FinanceButton>
            <FinanceButton size="sm" tone="danger" onClick={() => openCreate('expense')}>
              Расход
            </FinanceButton>
            <FinanceButton size="sm" tone="primary" onClick={() => openCreate('transfer')}>
              Перевод
            </FinanceButton>
          </div>
        ) : (
          <div className="flex gap-2">
            <FinanceButton
              size="sm"
              onClick={() => {
                setEditLimit(null)
                setLimitDialogOpen(true)
              }}
            >
              <Gauge className="size-4" />
              Новый лимит
            </FinanceButton>
            <FinanceButton
              size="sm"
              tone="primary"
              onClick={() => {
                setEditTemplate(null)
                setTemplateDialogOpen(true)
              }}
            >
              <Plus className="size-4" />
              Новый шаблон
            </FinanceButton>
          </div>
        )}
      </div>

      {tab === 'operations' ? (
        <>
          <FinanceSurface className="p-4">
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
              <div className="flex gap-2">
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
                  <Filter className="size-4" />
                  Сбросить
                </FinanceButton>
                <FinanceButton size="sm" onClick={() => void load()}>
                  <RefreshCw className="size-4" />
                  Обновить
                </FinanceButton>
              </div>
            </div>
          </FinanceSurface>
          <FinanceSurface className="overflow-hidden">
            {isLoading ? (
              <div className="p-4">
                <FinanceLoadingState label="Загружаем операции…" />
              </div>
            ) : error ? (
              <div className="p-4">
                <FinanceErrorState message={error} onRetry={() => void load()} />
              </div>
            ) : page.items.length === 0 ? (
              <FinanceEmptyState
                icon={<Search className="size-6" />}
                title="Операции не найдены"
                description="Измените фильтры или создайте новую финансовую операцию."
              />
            ) : (
              <>
                <FinanceTransactionList
                  transactions={page.items}
                  onEdit={(item) => {
                    setEditTransaction(item)
                    setDialogType(item.type === 'adjustment' ? 'expense' : item.type)
                    setUseTemplate(null)
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
          </FinanceSurface>
        </>
      ) : (
        <>
          <section>
            <h2 className="text-base font-semibold text-[var(--app-text)]">
              Шаблоны регулярных операций
            </h2>
            <p className="mt-1 text-sm text-[var(--app-muted)]">
              Открывают обычную форму; баланс меняется только после вашего подтверждения.
            </p>
            {templates.length === 0 ? (
              <div className="mt-3">
                <FinanceEmptyState
                  icon={<CalendarClock className="size-6" />}
                  title="Шаблонов пока нет"
                  description="Сохраните часто повторяющиеся доходы, расходы или переводы."
                  action={
                    <FinanceButton tone="primary" onClick={() => setTemplateDialogOpen(true)}>
                      <Plus className="size-4" />
                      Создать шаблон
                    </FinanceButton>
                  }
                />
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-3 max-[780px]:grid-cols-1">
                {templates.map((template) => {
                  const source = accounts.find((account) => account.id === template.sourceAccountId)
                  return (
                    <FinanceSurface key={template.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-[var(--app-text)]">{template.name}</h3>
                            <span
                              className={`rounded-md px-1.5 py-0.5 text-[10px] tracking-wider uppercase ${template.state === 'active' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-[var(--app-overlay-subtle)] text-[var(--app-muted)]'}`}
                            >
                              {template.state === 'active' ? 'Активен' : 'Пауза'}
                            </span>
                          </div>
                          <div className="mt-1 text-sm text-[var(--app-muted)]">
                            {source
                              ? formatMoneyMinor(template.sourceAmountMinor, source.currencyCode)
                              : 'Счёт недоступен'}{' '}
                            ·{' '}
                            {template.type === 'income'
                              ? 'Доход'
                              : template.type === 'expense'
                                ? 'Расход'
                                : 'Перевод'}
                          </div>
                          <div className="mt-1 text-xs text-[var(--app-muted)]">
                            Следующая:{' '}
                            {template.nextOccurrenceAt
                              ? new Date(template.nextOccurrenceAt).toLocaleString('ru-RU', {
                                  dateStyle: 'medium',
                                  timeStyle: 'short'
                                })
                              : 'без расписания'}{' '}
                            · Последнее использование:{' '}
                            {template.lastUsedAt
                              ? new Date(template.lastUsedAt).toLocaleDateString('ru-RU')
                              : 'никогда'}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <FinanceButton
                          size="sm"
                          tone="primary"
                          onClick={() => {
                            setUseTemplate(template)
                            setDialogType(template.type)
                            setTransactionDialogOpen(true)
                          }}
                        >
                          Использовать
                        </FinanceButton>
                        <FinanceButton
                          size="sm"
                          onClick={() => {
                            setEditTemplate(template)
                            setTemplateDialogOpen(true)
                          }}
                        >
                          <Pencil className="size-4" />
                          Изменить
                        </FinanceButton>
                        <FinanceButton
                          size="sm"
                          onClick={() =>
                            void (async () => {
                              await financeClient.setTemplateState({
                                id: template.id,
                                state: template.state === 'active' ? 'paused' : 'active'
                              })
                              await onChanged()
                            })()
                          }
                        >
                          {template.state === 'active' ? (
                            <Pause className="size-4" />
                          ) : (
                            <Play className="size-4" />
                          )}
                          {template.state === 'active' ? 'Пауза' : 'Возобновить'}
                        </FinanceButton>
                        <FinanceButton
                          size="sm"
                          tone="danger"
                          onClick={() => setDeleteTemplate(template)}
                        >
                          <Trash2 className="size-4" />
                          Удалить
                        </FinanceButton>
                      </div>
                    </FinanceSurface>
                  )
                })}
              </div>
            )}
          </section>
          <section className="pt-2">
            <div className="flex items-end justify-between">
              <div>
                <h2 className="text-base font-semibold text-[var(--app-text)]">Лимиты расходов</h2>
                <p className="mt-1 text-sm text-[var(--app-muted)]">
                  Предупреждают о пороге и превышении, но не запрещают расход.
                </p>
              </div>
              <FinanceButton
                size="sm"
                onClick={() => {
                  setEditLimit(null)
                  setLimitDialogOpen(true)
                }}
              >
                <Plus className="size-4" />
                Добавить
              </FinanceButton>
            </div>
            {limits.length === 0 ? (
              <div className="mt-3">
                <FinanceEmptyState
                  icon={<Gauge className="size-6" />}
                  title="Лимитов пока нет"
                  description="Создайте контроль расходов для всех операций, конкретного счёта или тега."
                />
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-3 max-[780px]:grid-cols-1">
                {limits.map((limit) => (
                  <FinanceSurface key={limit.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-medium text-[var(--app-text)]">{limit.name}</h3>
                        <p className="mt-1 text-xs text-[var(--app-muted)]">
                          {limit.state === 'active' ? 'Активен' : 'Приостановлен'} · до{' '}
                          {new Date(limit.periodEnd).toLocaleDateString('ru-RU')}
                        </p>
                      </div>
                      <span
                        className={
                          limit.exceededMinor > 0
                            ? 'text-red-300'
                            : limit.warningReached
                              ? 'text-amber-300'
                              : 'text-[var(--app-text)]'
                        }
                      >
                        {Math.round(limit.usagePercent)}%
                      </span>
                    </div>
                    <FinanceProgress
                      className="mt-3"
                      value={limit.usagePercent}
                      warning={limit.warningReached}
                      exceeded={limit.exceededMinor > 0}
                    />
                    <div className="mt-2 text-sm text-[var(--app-muted)]">
                      {formatMoneyMinor(limit.spentMinor, limit.currencyCode)} из{' '}
                      {formatMoneyMinor(limit.amountMinor, limit.currencyCode)}
                    </div>
                    {limit.missingRateCurrencies.length > 0 && (
                      <p className="mt-2 text-xs text-amber-200">
                        Не учтены валюты без курса: {limit.missingRateCurrencies.join(', ')}
                      </p>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <FinanceButton
                        size="sm"
                        onClick={() => {
                          setEditLimit(limit)
                          setLimitDialogOpen(true)
                        }}
                      >
                        Изменить
                      </FinanceButton>
                      <FinanceButton
                        size="sm"
                        onClick={() =>
                          void (async () => {
                            await financeClient.setLimitState({
                              id: limit.id,
                              state: limit.state === 'active' ? 'paused' : 'active'
                            })
                            await onChanged()
                          })()
                        }
                      >
                        {limit.state === 'active' ? 'Приостановить' : 'Возобновить'}
                      </FinanceButton>
                      <FinanceButton size="sm" tone="danger" onClick={() => setDeleteLimit(limit)}>
                        Удалить
                      </FinanceButton>
                    </div>
                  </FinanceSurface>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <FinanceTransactionDialog
        open={transactionDialogOpen}
        initialType={dialogType}
        accounts={accounts}
        tags={tags}
        transaction={editTransaction}
        template={useTemplate}
        onOpenChange={(open) => {
          setTransactionDialogOpen(open)
          if (!open) {
            setEditTransaction(null)
            setUseTemplate(null)
          }
        }}
        onSaved={async () => refreshAll()}
        onCreateTagRequested={setQuickTagType}
      />
      <FinanceTagDialog
        open={quickTagType !== null}
        initialType={quickTagType ?? 'expense'}
        onOpenChange={(open) => {
          if (!open) setQuickTagType(null)
        }}
        onSaved={async () => {
          await onChanged()
        }}
      />
      <FinanceTemplateDialog
        open={templateDialogOpen}
        template={editTemplate}
        accounts={accounts}
        tags={tags}
        onOpenChange={(open) => {
          setTemplateDialogOpen(open)
          if (!open) setEditTemplate(null)
        }}
        onSaved={async () => onChanged()}
      />
      <FinanceLimitDialog
        open={limitDialogOpen}
        limit={editLimit}
        accounts={accounts}
        tags={tags}
        baseCurrencyCode={baseCurrencyCode}
        onOpenChange={(open) => {
          setLimitDialogOpen(open)
          if (!open) setEditLimit(null)
        }}
        onSaved={async () => onChanged()}
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
      <FinanceConfirmDialog
        open={deleteTemplate !== null}
        title="Удалить шаблон?"
        subject={deleteTemplate?.name}
        description="Созданные по шаблону операции останутся без изменений. Связь в истории будет сохранена снимком названия."
        onOpenChange={(open) => !open && setDeleteTemplate(null)}
        onConfirm={async () => {
          if (!deleteTemplate) return
          await financeClient.deleteTemplate({ id: deleteTemplate.id })
          setDeleteTemplate(null)
          await onChanged()
        }}
      />
      <FinanceConfirmDialog
        open={deleteLimit !== null}
        title="Удалить лимит?"
        subject={deleteLimit?.name}
        description="Транзакции, балансы и прошлые расходы не изменятся; дальнейший контроль прекратится."
        onOpenChange={(open) => !open && setDeleteLimit(null)}
        onConfirm={async () => {
          if (!deleteLimit) return
          await financeClient.deleteLimit({ id: deleteLimit.id })
          setDeleteLimit(null)
          await onChanged()
        }}
      />
    </div>
  )
}
