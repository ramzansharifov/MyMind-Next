import {
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  FilterX,
  Gauge,
  Landmark,
  PiggyBank,
  RefreshCw,
  TrendingDown,
  TrendingUp
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import type {
  FinanceAccountSummary,
  FinanceReportFilters,
  FinanceTagSummary
} from '../../../../../shared/contracts/finance'
import type { FinanceReportAnalytics } from '../../../../../shared/contracts/finance-report-analytics'
import { formatMoneyMinor } from '../../../../../shared/finance-money'
import { financeClient } from '../api/finance-client'
import { fromDateInputValue, getFinanceErrorMessage, toDateInputValue } from '../lib/finance-ui'
import {
  FinanceBarChart,
  FinanceBreakdownChart,
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

type QuickPeriod = '7' | '30' | '90' | 'month' | 'previous-month' | 'year' | 'custom'
type ReportType = 'all' | 'income' | 'expense' | 'transfer'
type TemplateMode = 'all' | 'template' | 'manual'

function quickRange(value: Exclude<QuickPeriod, 'custom'>, now = new Date()): {
  from: number
  to: number
} {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  if (value === '7' || value === '30' || value === '90') {
    const days = Number(value)
    return {
      from: new Date(now.getFullYear(), now.getMonth(), now.getDate() - days + 1).getTime(),
      to: end.getTime()
    }
  }
  if (value === 'month') {
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
      to: end.getTime()
    }
  }
  if (value === 'previous-month') {
    return {
      from: new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime(),
      to: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).getTime()
    }
  }
  return {
    from: new Date(now.getFullYear(), 0, 1).getTime(),
    to: end.getTime()
  }
}

function formatDateRange(period: { from: number; to: number }): string {
  const formatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${formatter.format(new Date(period.from))} — ${formatter.format(new Date(period.to))}`
}

function operationWord(count: number): string {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return 'операция'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'операции'
  return 'операций'
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
  const [type, setType] = useState<ReportType>('all')
  const [accountId, setAccountId] = useState('all')
  const [tagId, setTagId] = useState('all')
  const [templateMode, setTemplateMode] = useState<TemplateMode>('all')
  const [report, setReport] = useState<FinanceReportAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (type === 'transfer' && tagId !== 'all') setTagId('all')
  }, [tagId, type])

  const availableTags = useMemo(() => {
    if (type === 'income') return tags.filter((tag) => tag.type === 'income' || tag.type === 'both')
    if (type === 'expense') return tags.filter((tag) => tag.type === 'expense' || tag.type === 'both')
    return tags
  }, [tags, type])

  useEffect(() => {
    if (tagId !== 'all' && !availableTags.some((tag) => tag.id === tagId)) setTagId('all')
  }, [availableTags, tagId])

  const filters = useMemo<FinanceReportFilters>(
    () => ({
      dateFrom: fromDateInputValue(from),
      dateTo: fromDateInputValue(to, true),
      types: type === 'all' ? undefined : [type],
      accountIds: accountId === 'all' ? undefined : [accountId],
      tagId: type === 'transfer' || tagId === 'all' ? undefined : tagId,
      currencyCode: baseCurrencyCode,
      templateOnly:
        templateMode === 'all' ? undefined : templateMode === 'template' ? true : false
    }),
    [accountId, baseCurrencyCode, from, tagId, templateMode, to, type]
  )

  const load = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await financeClient.getReport(filters)
      setReport(result as FinanceReportAnalytics)
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
    if (next === 'custom') return
    const range = quickRange(next)
    setFrom(toDateInputValue(range.from))
    setTo(toDateInputValue(range.to))
  }

  function resetFilters(): void {
    setType('all')
    setAccountId('all')
    setTagId('all')
    setTemplateMode('all')
  }

  const hasSecondaryFilters =
    type !== 'all' || accountId !== 'all' || tagId !== 'all' || templateMode !== 'all'
  const expenseVisible = type === 'all' || type === 'expense'
  const incomeVisible = type === 'all' || type === 'income'
  const transferVisible = type === 'all' || type === 'transfer'
  const balanceData = (report?.timeline ?? [])
    .filter((point) => point.balanceMinor !== null)
    .map((point) => ({ label: point.label, value: point.balanceMinor ?? 0 }))
  const topExpense = report?.expenseByTag?.[0]
  const topIncome = report?.incomeByTag?.[0]
  const peakExpensePoint = report?.timeline?.reduce<(typeof report.timeline)[number] | null>(
    (current, point) => (!current || point.expenseMinor > current.expenseMinor ? point : current),
    null
  )
  const comparisonLabel = report ? formatDateRange(report.comparisonPeriod) : ''

  return (
    <div className="space-y-5">
      <FinanceSurface className="p-4">
        <div className="flex items-start justify-between gap-4 max-[760px]:flex-col">
          <div>
            <div className="text-sm font-semibold text-[var(--app-text)]">Период отчёта</div>
            <p className="mt-0.5 text-xs text-[var(--app-muted)]">
              Все суммы приводятся к {baseCurrencyCode}; счета в других валютах конвертируются по
              сохранённым курсам.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {isLoading && report && (
              <span className="text-xs text-[var(--app-muted)]">Обновляем…</span>
            )}
            <FinanceButton size="sm" onClick={() => void load()} disabled={isLoading}>
              <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
              Обновить
            </FinanceButton>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {(
            [
              ['7', '7 дней'],
              ['30', '30 дней'],
              ['90', '90 дней'],
              ['month', 'Этот месяц'],
              ['previous-month', 'Прошлый месяц'],
              ['year', 'Этот год'],
              ['custom', 'Свой диапазон']
            ] as Array<[QuickPeriod, string]>
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`rounded-lg px-3 py-2 text-sm transition-colors ${period === value ? 'bg-violet-500 text-white shadow-sm' : 'bg-[var(--app-overlay-faint)] text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'}`}
              onClick={() => choosePeriod(value)}
            >
              {label}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div className="mt-3 grid max-w-xl grid-cols-2 gap-3 max-[520px]:grid-cols-1">
            <FilterField label="С даты">
              <input
                aria-label="Начальная дата"
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                className={financeInputClassName}
              />
            </FilterField>
            <FilterField label="По дату">
              <input
                aria-label="Конечная дата"
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                className={financeInputClassName}
              />
            </FilterField>
          </div>
        )}

        <div className="mt-4 grid grid-cols-4 gap-3 max-[1000px]:grid-cols-2 max-[560px]:grid-cols-1">
          <FilterField label="Операции">
            <select
              aria-label="Тип операции"
              value={type}
              onChange={(event) => setType(event.target.value as ReportType)}
              className={financeInputClassName}
            >
              <option value="all">Все операции</option>
              <option value="income">Только доходы</option>
              <option value="expense">Только расходы</option>
              <option value="transfer">Только переводы</option>
            </select>
          </FilterField>

          <FilterField label="Счёт">
            <select
              aria-label="Счёт"
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
              className={financeInputClassName}
            >
              <option value="all">Все счета</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} · {account.currencyCode}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Тег">
            <select
              aria-label="Тег"
              value={tagId}
              disabled={type === 'transfer'}
              onChange={(event) => setTagId(event.target.value)}
              className={financeInputClassName}
            >
              <option value="all">Все теги</option>
              {availableTags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Источник">
            <select
              aria-label="Источник операции"
              value={templateMode}
              onChange={(event) => setTemplateMode(event.target.value as TemplateMode)}
              className={financeInputClassName}
            >
              <option value="all">Все операции</option>
              <option value="template">Из шаблонов</option>
              <option value="manual">Созданные вручную</option>
            </select>
          </FilterField>
        </div>

        <div className="mt-3 flex min-h-8 items-center justify-between gap-3 border-t border-[var(--app-border)] pt-3 text-xs text-[var(--app-muted)]">
          <span>
            {period === 'custom' ? `${from} — ${to}` : 'Сравнение строится с сопоставимым предыдущим периодом'}
          </span>
          {hasSecondaryFilters && (
            <button
              type="button"
              className="inline-flex items-center gap-1.5 font-medium text-[var(--app-text)] hover:text-violet-300"
              onClick={resetFilters}
            >
              <FilterX className="size-3.5" />
              Сбросить фильтры
            </button>
          )}
        </div>
      </FinanceSurface>

      {isLoading && !report ? (
        <FinanceLoadingState label="Строим отчёт…" />
      ) : error && !report ? (
        <FinanceErrorState message={error} onRetry={() => void load()} />
      ) : (
        report && (
          <>
            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-100">
                Не удалось обновить отчёт: {error}. Ниже показаны последние успешно загруженные данные.
              </div>
            )}

            <div className="grid grid-cols-4 gap-3 max-[1050px]:grid-cols-2 max-[560px]:grid-cols-1">
              <ReportMetric
                label="Доходы"
                value={report.incomeMinor}
                currency={report.currencyCode}
                tone="positive"
                change={report.incomeChangePercent ?? report.changePercent}
                comparisonLabel={comparisonLabel}
                icon={<ArrowDownLeft className="size-4" />}
              />
              <ReportMetric
                label="Расходы"
                value={report.expenseMinor}
                currency={report.currencyCode}
                tone="negative"
                change={report.expenseChangePercent}
                inverseChange
                comparisonLabel={comparisonLabel}
                icon={<ArrowUpRight className="size-4" />}
              />
              <ReportMetric
                label="Чистый денежный поток"
                value={report.netMinor}
                currency={report.currencyCode}
                tone={report.netMinor >= 0 ? 'positive' : 'negative'}
                change={report.netChangePercent ?? report.changePercent}
                comparisonLabel={comparisonLabel}
                icon={<PiggyBank className="size-4" />}
              />
              <PercentMetric
                label="Доля сохранённого дохода"
                value={report.savingsRatePercent ?? null}
                description="Чистый поток ÷ доходы"
              />
            </div>

            <div className="grid grid-cols-4 gap-3 max-[1050px]:grid-cols-2 max-[560px]:grid-cols-1">
              <CompactMetric
                label="Операции"
                value={`${report.operationCount}`}
                hint={`${report.incomeCount ?? 0} доходов · ${report.expenseCount ?? 0} расходов · ${report.transferCount ?? 0} переводов`}
              />
              <CompactMetric
                label="Средний расход"
                value={formatMoneyMinor(report.averageExpenseMinor, report.currencyCode)}
                hint={`${report.expenseCount ?? 0} ${operationWord(report.expenseCount ?? 0)}`}
              />
              <CompactMetric
                label="В среднем в день"
                value={formatMoneyMinor(
                  report.averageDailyExpenseMinor ?? report.averageExpenseMinor,
                  report.currencyCode
                )}
                hint="Расходы на календарный день периода"
              />
              <CompactMetric
                label="Переводы"
                value={`${report.transferCount ?? report.transferFlows.length}`}
                hint={
                  (report.transferVolumeMinor ?? 0) > 0
                    ? `Оборот ${formatMoneyMinor(report.transferVolumeMinor, report.currencyCode)}`
                    : 'Не входят в доходы и расходы'
                }
              />
            </div>

            {report.missingRateCurrencies.length > 0 && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4 text-sm text-amber-100">
                <div className="font-medium">Отчёт содержит неполные суммы</div>
                <div className="mt-1 text-xs leading-5 text-amber-100/80">
                  Нет курса для {report.missingRateCurrencies.join(', ')}. Операции продолжают
                  учитываться в количестве, но суммы, которые нельзя привести к {report.currencyCode},
                  не включены в денежные показатели. Баланс при неполной конвертации не подменяется
                  частичным значением.
                </div>
              </div>
            )}

            {(report.comparisonMissingRateCurrencies?.length ?? 0) > 0 && (
              <div className="rounded-xl border border-amber-500/15 bg-amber-500/[0.04] px-4 py-3 text-xs text-amber-100/80">
                Сравнение с предыдущим периодом неполное из-за отсутствующего курса:{' '}
                {report.comparisonMissingRateCurrencies.join(', ')}.
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 max-[900px]:grid-cols-1">
              <InsightCard
                icon={<TrendingDown className="size-4" />}
                label="Главная статья расходов"
                value={
                  topExpense
                    ? `${topExpense.label} · ${formatMoneyMinor(topExpense.amountMinor, report.currencyCode)}`
                    : 'Нет расходов'
                }
                hint={topExpense ? `${topExpense.sharePercent.toFixed(1)}% всех расходов` : undefined}
              />
              <InsightCard
                icon={<TrendingUp className="size-4" />}
                label="Главный источник дохода"
                value={
                  topIncome
                    ? `${topIncome.label} · ${formatMoneyMinor(topIncome.amountMinor, report.currencyCode)}`
                    : 'Нет доходов'
                }
                hint={topIncome ? `${topIncome.sharePercent.toFixed(1)}% всех доходов` : undefined}
              />
              <InsightCard
                icon={<CalendarDays className="size-4" />}
                label="Пиковый расходный интервал"
                value={
                  peakExpensePoint && peakExpensePoint.expenseMinor > 0
                    ? `${peakExpensePoint.label} · ${formatMoneyMinor(peakExpensePoint.expenseMinor, report.currencyCode)}`
                    : 'Нет расходов'
                }
                hint={`Крупнейшая отдельная трата: ${formatMoneyMinor(report.largestExpenseMinor, report.currencyCode)}`}
              />
            </div>

            {type !== 'transfer' && (
              <ChartSurface
                title="Денежный поток по времени"
                description="Доходы и расходы показаны отдельно. Переводы и системные корректировки не считаются доходом или расходом. Пустые интервалы сохранены на шкале."
              >
                <FinanceLineChart
                  data={report.timeline.map((point) => ({
                    label: point.label,
                    value: point.expenseMinor,
                    secondaryValue: point.incomeMinor
                  }))}
                  currencyCode={report.currencyCode}
                  ariaLabel="Доходы и расходы по времени"
                  primaryLabel="Расходы"
                  secondaryLabel="Доходы"
                  primaryTone="expense"
                  secondaryTone="income"
                />
              </ChartSurface>
            )}

            <ChartSurface
              title={accountId === 'all' ? 'Общий баланс счетов' : 'Баланс выбранного счёта'}
              description="Реальный баланс на конец каждого интервала: начальные суммы плюс вся сохранённая история проводок, включая переводы и системные корректировки. Фильтр типа, тега и источника операции на баланс не влияет."
              aside={
                <div className="text-right text-xs text-[var(--app-muted)]">
                  <div>
                    Начало:{' '}
                    <span className="font-medium text-[var(--app-text)]">
                      {report.balanceStartMinor == null
                        ? '—'
                        : formatMoneyMinor(report.balanceStartMinor, report.currencyCode)}
                    </span>
                  </div>
                  <div className="mt-1">
                    Конец:{' '}
                    <span className="font-medium text-[var(--app-text)]">
                      {report.balanceEndMinor == null
                        ? '—'
                        : formatMoneyMinor(report.balanceEndMinor, report.currencyCode)}
                    </span>
                  </div>
                </div>
              }
            >
              <FinanceLineChart
                data={balanceData}
                currencyCode={report.currencyCode}
                ariaLabel="Динамика баланса счетов"
                primaryLabel="Баланс"
                primaryTone="accent"
                includeZero={false}
              />
            </ChartSurface>

            {(expenseVisible || incomeVisible) && (
              <div className="grid grid-cols-2 gap-5 max-[900px]:grid-cols-1">
                {expenseVisible && (
                  <ChartSurface
                    title="Куда уходят деньги"
                    description="Категории расходов отсортированы по сумме; длина полосы показывает относительный масштаб, рядом указана доля."
                  >
                    <FinanceBreakdownChart
                      data={report.expenseByTag.map((point) => ({
                        label: point.label,
                        value: point.amountMinor,
                        color: point.color,
                        sharePercent: point.sharePercent
                      }))}
                      currencyCode={report.currencyCode}
                      ariaLabel="Расходы по тегам"
                    />
                  </ChartSurface>
                )}
                {incomeVisible && (
                  <ChartSurface
                    title="Откуда приходят деньги"
                    description="Источники доходов отсортированы от крупнейшего к меньшему."
                  >
                    <FinanceBreakdownChart
                      data={report.incomeByTag.map((point) => ({
                        label: point.label,
                        value: point.amountMinor,
                        color: point.color,
                        sharePercent: point.sharePercent
                      }))}
                      currencyCode={report.currencyCode}
                      ariaLabel="Доходы по тегам"
                    />
                  </ChartSurface>
                )}
              </div>
            )}

            <ChartSurface
              title="Активность по счетам"
              description={`Все значения приведены к ${report.currencyCode}. Для каждого счёта отдельно видны доходы, расходы и движение переводов.`}
              icon={<Landmark className="size-4" />}
            >
              <AccountActivityTable report={report} />
            </ChartSurface>

            {transferVisible && (
              <ChartSurface
                title="Переводы между счетами"
                description="Для сравнения полосы переведены в валюту отчёта по сохранённым курсам. Под названием остаются исходные суммы обеих сторон перевода."
                icon={<ArrowRightLeft className="size-4" />}
              >
                <FinanceBarChart
                  data={report.transferFlows
                    .filter((flow) => flow.convertedAmountMinor != null)
                    .map((flow) => ({
                      label: `${flow.sourceAccountName} → ${flow.destinationAccountName}`,
                      value: flow.convertedAmountMinor ?? 0,
                      detail: `${flow.count} ${operationWord(flow.count)} · ${formatMoneyMinor(flow.sourceAmountMinor, flow.sourceCurrencyCode)} → ${formatMoneyMinor(flow.destinationAmountMinor, flow.destinationCurrencyCode)}`
                    }))}
                  currencyCode={report.currencyCode}
                  ariaLabel="Переводы между счетами"
                />
              </ChartSurface>
            )}

            {expenseVisible && (
              <ChartSurface
                title="Использование лимитов"
                description="Показываются активные лимиты, соответствующие выбранному счёту и тегу, на конец отчётного периода. Лимит всегда считает все подходящие расходы, независимо от фильтра «Источник»."
                icon={<Gauge className="size-4" />}
              >
                <div className="space-y-4">
                  {report.limits.length === 0 ? (
                    <div className="flex h-36 items-center justify-center rounded-xl border border-dashed border-[var(--app-border)] text-sm text-[var(--app-muted)]">
                      Для выбранных условий нет активных лимитов
                    </div>
                  ) : (
                    report.limits.map((limit) => {
                      const tag = tags.find((item) => item.id === limit.tagId)
                      return (
                        <div key={limit.id} className="rounded-xl border border-[var(--app-border)] p-3">
                          <div className="flex items-start justify-between gap-4 text-sm">
                            <div>
                              <div className="font-medium text-[var(--app-text)]">
                                {tag?.name ?? 'Тег не найден'}
                              </div>
                              <div className="mt-1 text-xs text-[var(--app-muted)]">
                                Потрачено {formatMoneyMinor(limit.spentMinor, limit.currencyCode)} из{' '}
                                {formatMoneyMinor(limit.amountMinor, limit.currencyCode)}
                              </div>
                            </div>
                            <div
                              className={`shrink-0 font-semibold tabular-nums ${limit.exceededMinor > 0 ? 'text-red-300' : limit.warningReached ? 'text-amber-300' : 'text-[var(--app-text)]'}`}
                            >
                              {Math.round(limit.usagePercent)}%
                            </div>
                          </div>
                          <FinanceProgress
                            value={limit.usagePercent}
                            warning={limit.warningReached}
                            exceeded={limit.exceededMinor > 0}
                            className="mt-3"
                          />
                          <div className="mt-2 flex justify-between gap-3 text-[10px] text-[var(--app-muted)]">
                            <span>
                              {limit.remainingMinor >= 0
                                ? `Осталось ${formatMoneyMinor(limit.remainingMinor, limit.currencyCode)}`
                                : `Превышено ${formatMoneyMinor(limit.exceededMinor, limit.currencyCode)}`}
                            </span>
                            {limit.projectedMinor != null && (
                              <span>
                                Прогноз {formatMoneyMinor(limit.projectedMinor, limit.currencyCode)}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </ChartSurface>
            )}
          </>
        )
      )}
    </div>
  )
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <label className="block text-xs text-[var(--app-muted)]">
      <span className="mb-1.5 block font-medium">{label}</span>
      {children}
    </label>
  )
}

function ReportMetric({
  label,
  value,
  currency,
  tone,
  change,
  inverseChange = false,
  comparisonLabel,
  icon
}: {
  label: string
  value: number
  currency: string
  tone: 'positive' | 'negative'
  change?: number | null
  inverseChange?: boolean
  comparisonLabel: string
  icon: React.ReactNode
}): React.JSX.Element {
  const favorable = change == null ? null : inverseChange ? change <= 0 : change >= 0
  return (
    <FinanceSurface className="p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-[var(--app-muted)]">{label}</span>
        <span
          className={`flex size-8 items-center justify-center rounded-lg ${tone === 'positive' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-red-500/10 text-red-300'}`}
        >
          {icon}
        </span>
      </div>
      <div
        className={`mt-3 text-xl font-semibold tabular-nums ${tone === 'positive' ? 'text-emerald-300' : 'text-red-300'}`}
      >
        {formatMoneyMinor(value, currency)}
      </div>
      <div className="mt-2 min-h-4 text-[10px] text-[var(--app-muted)]">
        {change == null ? (
          <span>Нет базы для сравнения</span>
        ) : (
          <span className={favorable ? 'text-emerald-300' : 'text-red-300'}>
            {change >= 0 ? '+' : ''}
            {change.toFixed(1)}% · к {comparisonLabel}
          </span>
        )}
      </div>
    </FinanceSurface>
  )
}

function PercentMetric({
  label,
  value,
  description
}: {
  label: string
  value: number | null
  description: string
}): React.JSX.Element {
  const positive = value !== null && value >= 0
  return (
    <FinanceSurface className="p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-[var(--app-muted)]">{label}</span>
        <span className="flex size-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300">
          <PiggyBank className="size-4" />
        </span>
      </div>
      <div
        className={`mt-3 text-xl font-semibold tabular-nums ${value == null ? 'text-[var(--app-muted)]' : positive ? 'text-emerald-300' : 'text-red-300'}`}
      >
        {value == null ? '—' : `${value.toFixed(1)}%`}
      </div>
      <div className="mt-2 text-[10px] text-[var(--app-muted)]">{description}</div>
    </FinanceSurface>
  )
}

function CompactMetric({ label, value, hint }: { label: string; value: string; hint: string }): React.JSX.Element {
  return (
    <FinanceSurface className="p-4">
      <div className="text-xs text-[var(--app-muted)]">{label}</div>
      <div className="mt-2 text-lg font-semibold text-[var(--app-text)] tabular-nums">{value}</div>
      <div className="mt-1 text-[10px] leading-4 text-[var(--app-muted)]">{hint}</div>
    </FinanceSurface>
  )
}

function InsightCard({
  icon,
  label,
  value,
  hint
}: {
  icon: React.ReactNode
  label: string
  value: string
  hint?: string
}): React.JSX.Element {
  return (
    <FinanceSurface className="p-4">
      <div className="flex items-center gap-2 text-xs text-[var(--app-muted)]">
        <span className="text-violet-300">{icon}</span>
        {label}
      </div>
      <div className="mt-2 truncate text-sm font-semibold text-[var(--app-text)]" title={value}>
        {value}
      </div>
      {hint && <div className="mt-1 text-[10px] text-[var(--app-muted)]">{hint}</div>}
    </FinanceSurface>
  )
}

function AccountActivityTable({ report }: { report: FinanceReportAnalytics }): React.JSX.Element {
  const items = report.accountActivity ?? []
  if (items.length === 0) {
    return (
      <div className="flex h-36 items-center justify-center rounded-xl border border-dashed border-[var(--app-border)] text-sm text-[var(--app-muted)]">
        Нет активности по счетам за выбранный период
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--app-border)]">
      <table className="w-full min-w-[820px] text-left text-xs">
        <thead className="bg-[var(--app-overlay-faint)] text-[var(--app-muted)]">
          <tr>
            <th className="px-3 py-2.5 font-medium">Счёт</th>
            <th className="px-3 py-2.5 text-right font-medium">Доходы</th>
            <th className="px-3 py-2.5 text-right font-medium">Расходы</th>
            <th className="px-3 py-2.5 text-right font-medium">Переводы +</th>
            <th className="px-3 py-2.5 text-right font-medium">Переводы −</th>
            <th className="px-3 py-2.5 text-right font-medium">Итог движения</th>
            <th className="px-3 py-2.5 text-right font-medium">Операции</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.accountId} className="border-t border-[var(--app-border)]">
              <td className="px-3 py-3">
                <div className="font-medium text-[var(--app-text)]">{item.accountName}</div>
                <div className="mt-0.5 text-[10px] text-[var(--app-muted)]">{item.currencyCode}</div>
              </td>
              <td className="px-3 py-3 text-right text-emerald-300 tabular-nums">
                {formatMoneyMinor(item.incomeMinor, report.currencyCode)}
              </td>
              <td className="px-3 py-3 text-right text-red-300 tabular-nums">
                {formatMoneyMinor(item.expenseMinor, report.currencyCode)}
              </td>
              <td className="px-3 py-3 text-right text-[var(--app-text)] tabular-nums">
                {formatMoneyMinor(item.transferInMinor, report.currencyCode)}
              </td>
              <td className="px-3 py-3 text-right text-[var(--app-text)] tabular-nums">
                {formatMoneyMinor(item.transferOutMinor, report.currencyCode)}
              </td>
              <td
                className={`px-3 py-3 text-right font-medium tabular-nums ${item.netMinor >= 0 ? 'text-emerald-300' : 'text-red-300'}`}
              >
                {item.netMinor >= 0 ? '+' : ''}
                {formatMoneyMinor(item.netMinor, report.currencyCode)}
              </td>
              <td className="px-3 py-3 text-right text-[var(--app-muted)] tabular-nums">
                {item.operationCount}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ChartSurface({
  title,
  description,
  children,
  aside,
  icon
}: {
  title: string
  description: string
  children: React.ReactNode
  aside?: React.ReactNode
  icon?: React.ReactNode
}): React.JSX.Element {
  return (
    <FinanceSurface className="p-5">
      <div className="mb-5 flex items-start justify-between gap-4 max-[620px]:flex-col">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
            {icon ?? <BarChart3 className="size-4" />}
          </div>
          <div>
            <h3 className="font-semibold text-[var(--app-text)]">{title}</h3>
            <p className="mt-0.5 max-w-3xl text-xs leading-5 text-[var(--app-muted)]">{description}</p>
          </div>
        </div>
        {aside}
      </div>
      {children}
    </FinanceSurface>
  )
}
