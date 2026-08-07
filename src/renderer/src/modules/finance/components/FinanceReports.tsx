import { BarChart3, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import type {
  FinanceAccountSummary,
  FinanceReport,
  FinanceReportFilters,
  FinanceTagSummary
} from '../../../../../shared/contracts/finance'
import { formatMoneyMinor } from '../../../../../shared/finance-money'
import { financeClient } from '../api/finance-client'
import { fromDateInputValue, getFinanceErrorMessage, toDateInputValue } from '../lib/finance-ui'
import {
  FinanceBarChart,
  FinanceDonutChart,
  FinanceLineChart,
  FinanceProgress
} from './charts/FinanceCharts'
import {
  FinanceButton,
  FinanceErrorState,
  FinanceLoadingState,
  FinanceSurface,
  financeInputClassName
} from './FinancePrimitives'

interface Props {
  accounts: FinanceAccountSummary[]
  tags: FinanceTagSummary[]
  baseCurrencyCode: string
  limitsVersion: number
}

type QuickPeriod = '7' | '30' | 'month' | 'previous-month' | 'year' | 'custom'

function quickRange(value: QuickPeriod, now = new Date()): { from: number; to: number } {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  if (value === '7' || value === '30')
    return { from: end.getTime() - (Number(value) - 1) * 86_400_000, to: end.getTime() }
  if (value === 'month')
    return { from: new Date(now.getFullYear(), now.getMonth(), 1).getTime(), to: end.getTime() }
  if (value === 'previous-month')
    return {
      from: new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime(),
      to: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).getTime()
    }
  if (value === 'year')
    return { from: new Date(now.getFullYear(), 0, 1).getTime(), to: end.getTime() }
  return { from: end.getTime() - 29 * 86_400_000, to: end.getTime() }
}

export function FinanceReports({
  accounts,
  tags,
  baseCurrencyCode,
  limitsVersion
}: Props): React.JSX.Element {
  const initial = quickRange('month')
  const [period, setPeriod] = useState<QuickPeriod>('month')
  const [from, setFrom] = useState(toDateInputValue(initial.from))
  const [to, setTo] = useState(toDateInputValue(initial.to))
  const [type, setType] = useState('all')
  const [accountId, setAccountId] = useState('all')
  const [tagId, setTagId] = useState('all')
  const [templateOnly, setTemplateOnly] = useState(false)
  const [report, setReport] = useState<FinanceReport | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const filters = useMemo<FinanceReportFilters>(
    () => ({
      dateFrom: fromDateInputValue(from),
      dateTo: fromDateInputValue(to, true),
      types: type === 'all' ? undefined : [type as 'income' | 'expense' | 'transfer'],
      accountIds: accountId === 'all' ? undefined : [accountId],
      tagId: tagId === 'all' ? undefined : tagId,
      currencyCode: baseCurrencyCode,
      templateOnly
    }),
    [accountId, baseCurrencyCode, from, tagId, templateOnly, to, type]
  )

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      setReport(await financeClient.getReport(filters))
    } catch (reason) {
      setError(getFinanceErrorMessage(reason))
    } finally {
      setIsLoading(false)
    }
  }, [filters])
  useEffect(() => {
    void load()
  }, [load, limitsVersion])

  function choosePeriod(next: QuickPeriod): void {
    setPeriod(next)
    if (next !== 'custom') {
      const range = quickRange(next)
      setFrom(toDateInputValue(range.from))
      setTo(toDateInputValue(range.to))
    }
  }

  return (
    <div className="space-y-5">
      <FinanceSurface className="p-4">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['7', '7 дней'],
              ['30', '30 дней'],
              ['month', 'Текущий месяц'],
              ['previous-month', 'Прошлый месяц'],
              ['year', 'Текущий год'],
              ['custom', 'Свой диапазон']
            ] as Array<[QuickPeriod, string]>
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`rounded-lg px-3 py-2 text-sm ${period === value ? 'bg-violet-500 text-white' : 'bg-[var(--app-overlay-faint)] text-[var(--app-muted)] hover:text-[var(--app-text)]'}`}
              onClick={() => choosePeriod(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-5 gap-3 max-[1050px]:grid-cols-3 max-[720px]:grid-cols-2 max-[480px]:grid-cols-1">
          <input
            aria-label="Начальная дата"
            type="date"
            value={from}
            onChange={(event) => {
              setPeriod('custom')
              setFrom(event.target.value)
            }}
            className={financeInputClassName}
          />
          <input
            aria-label="Конечная дата"
            type="date"
            value={to}
            onChange={(event) => {
              setPeriod('custom')
              setTo(event.target.value)
            }}
            className={financeInputClassName}
          />
          <select
            aria-label="Тип операции"
            value={type}
            onChange={(event) => setType(event.target.value)}
            className={financeInputClassName}
          >
            <option value="all">Доходы и расходы</option>
            <option value="income">Доходы</option>
            <option value="expense">Расходы</option>
            <option value="transfer">Переводы</option>
          </select>
          <select
            aria-label="Счёт"
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
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
            onChange={(event) => setTagId(event.target.value)}
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
        <div className="mt-3 flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-[var(--app-muted)]">
            <input
              type="checkbox"
              checked={templateOnly}
              onChange={(event) => setTemplateOnly(event.target.checked)}
              className="size-4 accent-violet-500"
            />
            Только операции по шаблонам
          </label>
          <FinanceButton size="sm" onClick={() => void load()}>
            <RefreshCw className="size-4" />
            Обновить
          </FinanceButton>
        </div>
      </FinanceSurface>

      {isLoading ? (
        <FinanceLoadingState label="Строим отчёт…" />
      ) : error ? (
        <FinanceErrorState message={error} onRetry={() => void load()} />
      ) : (
        report && (
          <>
            <div className="grid grid-cols-4 gap-3 max-[1000px]:grid-cols-2 max-[520px]:grid-cols-1">
              <ReportMetric
                label="Доход"
                value={report.incomeMinor}
                currency={report.currencyCode}
                positive
              />
              <ReportMetric
                label="Расход"
                value={report.expenseMinor}
                currency={report.currencyCode}
                negative
              />
              <ReportMetric
                label="Чистый результат"
                value={report.netMinor}
                currency={report.currencyCode}
                positive={report.netMinor >= 0}
                negative={report.netMinor < 0}
              />
              <ReportMetric
                label="Средний расход"
                value={report.averageExpenseMinor}
                currency={report.currencyCode}
              />
            </div>
            <div className="grid grid-cols-4 gap-3 max-[1000px]:grid-cols-2 max-[520px]:grid-cols-1">
              <ReportMetric
                label="Крупнейший доход"
                value={report.largestIncomeMinor}
                currency={report.currencyCode}
              />
              <ReportMetric
                label="Крупнейший расход"
                value={report.largestExpenseMinor}
                currency={report.currencyCode}
              />
              <FinanceSurface className="p-4">
                <div className="text-xs text-[var(--app-muted)]">Количество операций</div>
                <div className="mt-2 text-xl font-semibold text-[var(--app-text)]">
                  {report.operationCount}
                </div>
              </FinanceSurface>
              <FinanceSurface className="p-4">
                <div className="text-xs text-[var(--app-muted)]">Изменение к прошлому периоду</div>
                <div
                  className={`mt-2 text-xl font-semibold ${report.changePercent == null ? 'text-[var(--app-muted)]' : report.changePercent >= 0 ? 'text-emerald-300' : 'text-red-300'}`}
                >
                  {report.changePercent == null
                    ? '—'
                    : `${report.changePercent >= 0 ? '+' : ''}${report.changePercent.toFixed(1)}%`}
                </div>
              </FinanceSurface>
            </div>
            {report.missingRateCurrencies.length > 0 && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3 text-sm text-amber-100">
                Часть данных не включена из-за отсутствующих курсов:{' '}
                {report.missingRateCurrencies.join(', ')}.
              </div>
            )}
            <div className="grid grid-cols-2 gap-5 max-[900px]:grid-cols-1">
              <ChartSurface
                title="Доходы и расходы по времени"
                description="Переводы и системные корректировки исключены"
              >
                <FinanceLineChart
                  data={report.timeline.map((point) => ({
                    label: point.label,
                    value: point.expenseMinor,
                    secondaryValue: point.incomeMinor
                  }))}
                  currencyCode={report.currencyCode}
                />
              </ChartSurface>
              <ChartSurface
                title="Динамика общего баланса"
                description="Баланс в основной валюте по сохранённым курсам"
              >
                <FinanceLineChart
                  data={report.timeline
                    .filter((point) => point.balanceMinor != null)
                    .map((point) => ({ label: point.label, value: point.balanceMinor ?? 0 }))}
                  currencyCode={report.currencyCode}
                  ariaLabel="Динамика общего баланса"
                />
              </ChartSurface>
            </div>
            <div className="grid grid-cols-2 gap-5 max-[900px]:grid-cols-1">
              <ChartSurface title="Расходы по тегам" description="Распределение расходов за период">
                <FinanceDonutChart
                  data={report.expenseByTag.map((point) => ({
                    label: point.label,
                    value: point.amountMinor,
                    color: point.color
                  }))}
                  currencyCode={report.currencyCode}
                  ariaLabel="Расходы по тегам"
                />
              </ChartSurface>
              <ChartSurface title="Доходы по тегам" description="Распределение доходов за период">
                <FinanceDonutChart
                  data={report.incomeByTag.map((point) => ({
                    label: point.label,
                    value: point.amountMinor,
                    color: point.color
                  }))}
                  currencyCode={report.currencyCode}
                  ariaLabel="Доходы по тегам"
                />
              </ChartSurface>
            </div>
            <div className="grid grid-cols-2 gap-5 max-[900px]:grid-cols-1">
              <ChartSurface
                title="Переводы между счетами"
                description="Не входят в доход, расход и чистый результат"
              >
                <FinanceBarChart
                  data={report.transferFlows.map((flow) => ({
                    label: `${flow.sourceAccountName} → ${flow.destinationAccountName}`,
                    value: flow.sourceAmountMinor
                  }))}
                  currencyCode={report.transferFlows[0]?.sourceCurrencyCode ?? report.currencyCode}
                  ariaLabel="Переводы между счетами"
                />
              </ChartSurface>
              <ChartSurface
                title="Использование лимитов"
                description="Состояние на конец выбранного периода"
              >
                <div className="space-y-4">
                  {report.limits.length === 0 ? (
                    <div className="flex h-44 items-center justify-center text-sm text-[var(--app-muted)]">
                      Нет лимитов
                    </div>
                  ) : (
                    report.limits.map((limit) => (
                      <div key={limit.id}>
                        <div className="mb-2 flex justify-between text-sm">
                          <span className="text-[var(--app-text)]">
                            {tags.find((tag) => tag.id === limit.tagId)?.name ?? 'Тег не найден'}
                          </span>
                          <span className="text-[var(--app-muted)]">
                            {Math.round(limit.usagePercent)}%
                          </span>
                        </div>
                        <FinanceProgress
                          value={limit.usagePercent}
                          warning={limit.warningReached}
                          exceeded={limit.exceededMinor > 0}
                        />
                      </div>
                    ))
                  )}
                </div>
              </ChartSurface>
            </div>
          </>
        )
      )}
    </div>
  )
}

function ReportMetric({
  label,
  value,
  currency,
  positive,
  negative
}: {
  label: string
  value: number
  currency: string
  positive?: boolean
  negative?: boolean
}): React.JSX.Element {
  return (
    <FinanceSurface className="p-4">
      <div className="text-xs text-[var(--app-muted)]">{label}</div>
      <div
        className={`mt-2 text-xl font-semibold tabular-nums ${positive ? 'text-emerald-300' : negative ? 'text-red-300' : 'text-[var(--app-text)]'}`}
      >
        {formatMoneyMinor(value, currency)}
      </div>
    </FinanceSurface>
  )
}
function ChartSurface({
  title,
  description,
  children
}: {
  title: string
  description: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <FinanceSurface className="p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
          <BarChart3 className="size-4" />
        </div>
        <div>
          <h3 className="font-semibold text-[var(--app-text)]">{title}</h3>
          <p className="mt-0.5 text-xs text-[var(--app-muted)]">{description}</p>
        </div>
      </div>
      {children}
    </FinanceSurface>
  )
}
