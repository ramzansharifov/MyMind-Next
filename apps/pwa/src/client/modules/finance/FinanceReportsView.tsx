import { FittedText } from '../../../ui/FittedText'
import { Action, TextControl } from '../../../ui/browser'
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import {
  Activity,
  ArrowRightLeft,
  CalendarDays,
  ChevronRight,
  Gauge,
  Landmark,
  PiggyBank,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  type LucideIcon
} from 'lucide-react'
import type { FinanceAccountSummary, FinanceTagSummary } from '@mymind/contracts/finance'
import { formatMoneyMinor } from '@mymind/core/finance-money'
import type { ClientServices } from '../../app/services'
import { useCollection } from '../../shared/hooks/useCollection'
import { Button, EmptyState, ErrorState, Label, LoadingState } from '../../shared/ui/primitives'
import { useTheme } from '../../shared/ui/theme'
import { AppDialog } from '../../shared/ui/AppDialog'
import { FinanceReportCharts } from './FinanceReportCharts'
import { financeOperationTone } from './finance-semantic-colors'
import {
  availableFinanceReportTags,
  buildFinanceReportFilters,
  defaultFinanceCustomRange,
  financeReportPeriod,
  normalizeFinanceReportTagId,
  type MobileFinanceReportRange,
  type MobileFinanceReportSource,
  type MobileFinanceReportType
} from './finance-report-filters'
interface Props {
  api: ClientServices['finance']
  accounts: FinanceAccountSummary[]
  tags: FinanceTagSummary[]
  baseCurrencyCode: string
  header?: ReactNode
}
const reportRangeOptions: Array<{
  key: MobileFinanceReportRange
  label: string
}> = [
  { key: '7d', label: '7 дней' },
  { key: '30d', label: '30 дней' },
  { key: '90d', label: '90 дней' },
  { key: 'month', label: 'Этот месяц' },
  { key: 'previous-month', label: 'Прошлый месяц' },
  { key: 'year', label: 'Этот год' },
  { key: 'custom', label: 'Свой диапазон' }
]
const reportTypeOptions: Array<{
  key: MobileFinanceReportType
  label: string
}> = [
  { key: 'all', label: 'Все операции' },
  { key: 'income', label: 'Доходы' },
  { key: 'expense', label: 'Расходы' },
  { key: 'transfer', label: 'Переводы' }
]
const reportSourceOptions: Array<{
  key: MobileFinanceReportSource
  label: string
}> = [
  { key: 'all', label: 'Все источники' },
  { key: 'template', label: 'Из шаблонов' },
  { key: 'manual', label: 'Вручную' }
]
function optionalMoney(value: number | null, currencyCode: string): string {
  return value === null ? 'Нет данных' : formatMoneyMinor(value, currencyCode)
}
function percentChange(value: number | null): string {
  if (value === null) return 'Нет базы для сравнения'
  const rounded = Math.round(value * 10) / 10
  return `${rounded > 0 ? '+' : ''}${rounded}% к прошлому периоду`
}
function ReportChip({
  label,
  selected,
  onClick,
  grow = false
}: {
  label: string
  selected: boolean
  onClick(): void
  grow?: boolean
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <Action
      role={'button'}
      aria-selected={selected}
      onClick={onClick}
      style={{
        minWidth: grow ? '47%' : undefined,
        flexGrow: grow ? 1 : 0,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        paddingInline: 13,
        borderWidth: 1,
        borderColor: selected ? theme.accent + '65' : theme.border,
        borderRadius: 12,
        backgroundColor: selected ? theme.accent + '14' : theme.surface,
        opacity: 1
      }}
      pressedStyle={{
        backgroundColor: selected ? theme.accent + '14' : theme.raised,
        opacity: 0.74
      }}
    >
      <span
        className="ui-text"
        data-lines={1}
        style={{
          color: selected ? theme.accent : theme.text,
          fontSize: 11.5,
          fontWeight: 700,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: 1
        }}
      >
        {label}
      </span>
    </Action>
  )
}
function SummaryMetric({
  label,
  value,
  hint,
  tone,
  icon: Icon
}: {
  label: string
  value: string
  hint: string
  tone: string
  icon: LucideIcon
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <div
      className="ui-stack"
      style={{
        minWidth: 0,
        flex: '1 1 0%',
        minHeight: 104,
        padding: 12,
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 14,
        backgroundColor: theme.surface
      }}
    >
      <div
        className="ui-stack"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <span
          className="ui-text"
          style={{
            color: theme.muted,
            fontSize: 10.5,
            fontWeight: 600
          }}
        >
          {label}
        </span>
        <div
          className="ui-stack"
          style={{
            width: 28,
            height: 28,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 9,
            backgroundColor: tone + '16'
          }}
        >
          <Icon size={14} color={tone} />
        </div>
      </div>
      <FittedText
        minScale={0.72}
        className="ui-text"
        data-lines={1}
        style={{
          marginTop: 9,
          color: tone,
          fontSize: 16,
          lineHeight: '21px',
          fontWeight: 800,
          fontVariant: 'tabular-nums',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: 1
        }}
      >
        {value}
      </FittedText>
      <span
        className="ui-text"
        data-lines={2}
        style={{
          marginTop: 5,
          color: theme.muted,
          fontSize: 9.5,
          lineHeight: '13px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: 2
        }}
      >
        {hint}
      </span>
    </div>
  )
}
function InsightCard({
  label,
  value,
  hint,
  icon: Icon,
  tone
}: {
  label: string
  value: string
  hint?: string
  icon: LucideIcon
  tone: string
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <div
      className="ui-stack"
      style={{
        width: '48.5%',
        minHeight: 104,
        padding: 12,
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 14,
        backgroundColor: theme.surface
      }}
    >
      <div
        className="ui-stack"
        style={{
          width: 30,
          height: 30,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 9,
          backgroundColor: tone + '14'
        }}
      >
        <Icon size={15} color={tone} />
      </div>
      <span
        className="ui-text"
        style={{
          marginTop: 8,
          color: theme.muted,
          fontSize: 9.5,
          lineHeight: '13px'
        }}
      >
        {label}
      </span>
      <span
        className="ui-text"
        data-lines={2}
        style={{
          marginTop: 3,
          color: theme.text,
          fontSize: 12.5,
          lineHeight: '17px',
          fontWeight: 700,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: 2
        }}
      >
        {value}
      </span>
      {hint ? (
        <span
          className="ui-text"
          data-lines={1}
          style={{
            marginTop: 3,
            color: theme.muted,
            fontSize: 9.5,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 1
          }}
        >
          {hint}
        </span>
      ) : null}
    </div>
  )
}
function SectionHeader({
  title,
  subtitle,
  icon: Icon
}: {
  title: string
  subtitle?: string
  icon: LucideIcon
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <div
      className="ui-stack"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9
      }}
    >
      <div
        className="ui-stack"
        style={{
          width: 30,
          height: 30,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 9,
          backgroundColor: theme.accent + '12'
        }}
      >
        <Icon size={15} color={theme.accent} />
      </div>
      <div
        className="ui-stack"
        style={{
          minWidth: 0,
          flex: '1 1 0%'
        }}
      >
        <span
          className="ui-text"
          style={{
            color: theme.text,
            fontSize: 13.5,
            fontWeight: 800
          }}
        >
          {title}
        </span>
        {subtitle ? (
          <span
            className="ui-text"
            data-lines={1}
            style={{
              marginTop: 1,
              color: theme.muted,
              fontSize: 9.5,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: 1
            }}
          >
            {subtitle}
          </span>
        ) : null}
      </div>
    </div>
  )
}
function DetailRow({
  title,
  value,
  subtitle,
  tone
}: {
  title: string
  value: string
  subtitle?: string
  tone?: string
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <div
      className="ui-stack"
      style={{
        minHeight: 62,
        paddingInline: 12,
        paddingBlock: 10,
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 13,
        backgroundColor: theme.surface
      }}
    >
      <div
        className="ui-stack"
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 10
        }}
      >
        <span
          className="ui-text"
          data-lines={2}
          style={{
            minWidth: 0,
            flex: '1 1 0%',
            color: theme.text,
            fontSize: 12,
            lineHeight: '17px',
            fontWeight: 700,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 2
          }}
        >
          {title}
        </span>
        <span
          className="ui-text"
          data-lines={1}
          style={{
            maxWidth: '48%',
            color: tone ?? theme.text,
            fontSize: 11.5,
            fontWeight: 800,
            fontVariant: 'tabular-nums',
            textAlign: 'right',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 1
          }}
        >
          {value}
        </span>
      </div>
      {subtitle ? (
        <span
          className="ui-text"
          data-lines={2}
          style={{
            marginTop: 4,
            color: theme.muted,
            fontSize: 9.5,
            lineHeight: '14px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            WebkitLineClamp: 2
          }}
        >
          {subtitle}
        </span>
      ) : null}
    </div>
  )
}
export function FinanceReportsView({
  api,
  accounts,
  tags,
  baseCurrencyCode,
  header
}: Props): React.JSX.Element {
  const theme = useTheme()
  const initialCustom = useMemo(() => defaultFinanceCustomRange(), [])
  const [reportRange, setReportRange] = useState<MobileFinanceReportRange>('30d')
  const [customFrom, setCustomFrom] = useState(initialCustom.from)
  const [customTo, setCustomTo] = useState(initialCustom.to)
  const [customDraftFrom, setCustomDraftFrom] = useState(initialCustom.from)
  const [customDraftTo, setCustomDraftTo] = useState(initialCustom.to)
  const [customError, setCustomError] = useState('')
  const [reportType, setReportType] = useState<MobileFinanceReportType>('all')
  const [accountId, setAccountId] = useState('all')
  const [tagId, setTagId] = useState('all')
  const [source, setSource] = useState<MobileFinanceReportSource>('all')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [periodOpen, setPeriodOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const validTagId = normalizeFinanceReportTagId(tags, reportType, tagId)
  const availableTags = useMemo(
    () => availableFinanceReportTags(tags, reportType),
    [reportType, tags]
  )
  const state = useCollection(
    useCallback(() => {
      const selection = buildFinanceReportFilters({
        range: reportRange,
        customFrom,
        customTo,
        type: reportType,
        accountId,
        tagId: validTagId,
        source,
        currencyCode: baseCurrencyCode
      })
      return { report: api.getReport(selection.filters), period: selection.period }
    }, [
      accountId,
      api,
      baseCurrencyCode,
      customFrom,
      customTo,
      reportRange,
      reportType,
      source,
      validTagId
    ])
  )
  const chooseType = (next: MobileFinanceReportType): void => {
    setReportType(next)
    setTagId((current) => normalizeFinanceReportTagId(tags, next, current))
  }
  const chooseRange = (next: MobileFinanceReportRange): void => {
    setCustomError('')
    setReportRange(next)
    if (next !== 'custom') setPeriodOpen(false)
  }
  const applyCustomPeriod = (): void => {
    try {
      financeReportPeriod('custom', customDraftFrom, customDraftTo)
      setCustomError('')
      setCustomFrom(customDraftFrom.trim())
      setCustomTo(customDraftTo.trim())
      setReportRange('custom')
      setPeriodOpen(false)
      if (
        reportRange === 'custom' &&
        customFrom === customDraftFrom.trim() &&
        customTo === customDraftTo.trim()
      ) {
        state.refresh()
      }
    } catch (reason) {
      setCustomError(reason instanceof Error ? reason.message : 'Не удалось применить период')
    }
  }
  const resetFilters = (): void => {
    setReportType('all')
    setAccountId('all')
    setTagId('all')
    setSource('all')
  }
  const hasSecondaryFilters =
    reportType !== 'all' || accountId !== 'all' || validTagId !== 'all' || source !== 'all'
  if (state.loading && !state.data) return <LoadingState />
  if (!state.data) {
    return (
      <ErrorState message={state.error || 'Не удалось построить отчёт'} retry={state.refresh} />
    )
  }
  const { report, period } = state.data
  const incomeTone = financeOperationTone('income', theme.accent)
  const expenseTone = financeOperationTone('expense', theme.accent)
  const netTone = report.netMinor < 0 ? expenseTone : incomeTone
  const topExpense = report.expenseByTag[0]
  const topIncome = report.incomeByTag[0]
  const peakExpensePoint = report.timeline.reduce<(typeof report.timeline)[number] | null>(
    (best, point) => (!best || point.expenseMinor > best.expenseMinor ? point : best),
    null
  )
  const activeFilterCount = [
    reportType !== 'all',
    accountId !== 'all',
    validTagId !== 'all',
    source !== 'all'
  ].filter(Boolean).length
  const selectedAccount = accounts.find((account) => account.id === accountId)
  const selectedTag = tags.find((tag) => tag.id === validTagId)
  const filterSummary = [
    reportType === 'all'
      ? null
      : reportTypeOptions.find((option) => option.key === reportType)?.label,
    selectedAccount?.name,
    selectedTag?.name,
    source === 'all' ? null : reportSourceOptions.find((option) => option.key === source)?.label
  ]
    .filter(Boolean)
    .join(' · ')
  const dateInputStyle = {
    minHeight: 48,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    color: theme.text,
    paddingHorizontal: 14,
    borderRadius: 12,
    fontSize: 14
  } as const
  const savingsTone =
    report.savingsRatePercent === null
      ? theme.muted
      : report.savingsRatePercent >= 0
        ? incomeTone
        : expenseTone
  return (
    <div
      className="ui-stack"
      style={{
        flex: '1 1 0%'
      }}
    >
      <div className="ui-scroll">
        <div
          className="ui-stack ui-scroll-content"
          style={{
            gap: 14,
            paddingBottom: 96
          }}
        >
          {header}
          <div
            className="ui-stack"
            style={{
              flexDirection: 'row',
              gap: 8
            }}
          >
            <Action
              role={'button'}
              aria-label={`Период отчёта: ${period.label}`}
              onClick={() => setPeriodOpen(true)}
              style={{
                minWidth: 0,
                flex: '1 1 0%',
                height: 44,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingInline: 12,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 13,
                backgroundColor: theme.surface,
                opacity: 1
              }}
              pressedStyle={{
                backgroundColor: theme.raised,
                opacity: 0.76
              }}
            >
              <CalendarDays size={16} color={theme.accent} />
              <div
                className="ui-stack"
                style={{
                  minWidth: 0,
                  flex: '1 1 0%'
                }}
              >
                <span
                  className="ui-text"
                  style={{
                    color: theme.muted,
                    fontSize: 9.5
                  }}
                >
                  Период
                </span>
                <span
                  className="ui-text"
                  data-lines={1}
                  style={{
                    marginTop: 1,
                    color: theme.text,
                    fontSize: 11.5,
                    fontWeight: 700,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitBoxOrient: 'vertical',
                    WebkitLineClamp: 1
                  }}
                >
                  {period.label}
                </span>
              </div>
              <ChevronRight size={15} color={theme.muted} />
            </Action>

            <Action
              role={'button'}
              aria-label={'Фильтры отчёта'}
              onClick={() => setFiltersOpen(true)}
              style={{
                height: 44,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingInline: 12,
                borderWidth: 1,
                borderColor: activeFilterCount ? theme.accent + '65' : theme.border,
                borderRadius: 13,
                backgroundColor: activeFilterCount ? theme.accent + '14' : theme.surface,
                opacity: 1
              }}
              pressedStyle={{
                backgroundColor: activeFilterCount ? theme.accent + '14' : theme.raised,
                opacity: 0.76
              }}
            >
              <SlidersHorizontal size={16} color={activeFilterCount ? theme.accent : theme.muted} />
              <span
                className="ui-text"
                style={{
                  color: activeFilterCount ? theme.accent : theme.text,
                  fontSize: 11.5,
                  fontWeight: 700
                }}
              >
                {activeFilterCount ? `Фильтры · ${activeFilterCount}` : 'Фильтры'}
              </span>
            </Action>
          </div>

          {filterSummary ? (
            <span
              className="ui-text"
              data-lines={1}
              style={{
                marginTop: -6,
                color: theme.muted,
                fontSize: 9.5,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 1
              }}
            >
              {filterSummary}
            </span>
          ) : null}

          {state.error ? <ErrorState message={state.error} retry={state.refresh} /> : null}

          <div
            className="ui-stack"
            style={{
              padding: 15,
              borderWidth: 1,
              borderColor: netTone + '3D',
              borderRadius: 18,
              backgroundColor: netTone + '0D'
            }}
          >
            <span
              className="ui-text"
              style={{
                color: theme.muted,
                fontSize: 10.5,
                fontWeight: 600
              }}
            >
              Чистый результат
            </span>
            <FittedText
              minScale={0.68}
              className="ui-text"
              data-lines={1}
              style={{
                marginTop: 5,
                color: netTone,
                fontSize: 28,
                lineHeight: '34px',
                fontWeight: 800,
                fontVariant: 'tabular-nums',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 1
              }}
            >
              {formatMoneyMinor(report.netMinor, report.currencyCode)}
            </FittedText>
            <span
              className="ui-text"
              style={{
                marginTop: 5,
                color: theme.muted,
                fontSize: 10,
                lineHeight: '14px'
              }}
            >
              {percentChange(report.netChangePercent)} · {report.operationCount} операций
            </span>

            <div
              className="ui-stack"
              style={{
                marginTop: 13,
                flexDirection: 'row',
                gap: 8
              }}
            >
              <SummaryMetric
                label="Доходы"
                value={formatMoneyMinor(report.incomeMinor, report.currencyCode)}
                hint={percentChange(report.incomeChangePercent)}
                tone={incomeTone}
                icon={TrendingUp}
              />
              <SummaryMetric
                label="Расходы"
                value={formatMoneyMinor(report.expenseMinor, report.currencyCode)}
                hint={percentChange(report.expenseChangePercent)}
                tone={expenseTone}
                icon={TrendingDown}
              />
            </div>
          </div>

          <div
            className="ui-stack"
            style={{
              padding: 12,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 14,
              backgroundColor: theme.surface
            }}
          >
            <div
              className="ui-stack"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10
              }}
            >
              <div
                className="ui-stack"
                style={{
                  minWidth: 0,
                  flex: '1 1 0%'
                }}
              >
                <span
                  className="ui-text"
                  style={{
                    color: theme.muted,
                    fontSize: 9.5
                  }}
                >
                  Баланс на конец периода
                </span>
                <FittedText
                  className="ui-text"
                  data-lines={1}
                  style={{
                    marginTop: 3,
                    color: theme.text,
                    fontSize: 17,
                    fontWeight: 800,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitBoxOrient: 'vertical',
                    WebkitLineClamp: 1
                  }}
                >
                  {optionalMoney(report.balanceEndMinor, report.currencyCode)}
                </FittedText>
              </div>
              <span
                className="ui-text"
                data-lines={1}
                style={{
                  maxWidth: '42%',
                  color:
                    report.balanceChangeMinor == null
                      ? theme.muted
                      : report.balanceChangeMinor < 0
                        ? expenseTone
                        : incomeTone,
                  fontSize: 11,
                  fontWeight: 800,
                  textAlign: 'right',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: 1
                }}
              >
                {report.balanceChangeMinor == null
                  ? '—'
                  : `${report.balanceChangeMinor >= 0 ? '+' : ''}${formatMoneyMinor(report.balanceChangeMinor, report.currencyCode)}`}
              </span>
            </div>
            <span
              className="ui-text"
              style={{
                marginTop: 5,
                color: theme.muted,
                fontSize: 9.5
              }}
            >
              На начало: {optionalMoney(report.balanceStartMinor, report.currencyCode)}
            </span>
          </div>

          {report.missingRateCurrencies.length ? (
            <ErrorState
              message={`Не хватает текущих курсов: ${report.missingRateCurrencies.join(', ')}`}
            />
          ) : null}
          {report.comparisonMissingRateCurrencies.length ? (
            <ErrorState
              message={`Для сравнения не хватает курсов: ${report.comparisonMissingRateCurrencies.join(', ')}`}
            />
          ) : null}

          <div
            className="ui-stack"
            style={{
              gap: 8
            }}
          >
            <SectionHeader
              title="Главное за период"
              subtitle="Самые важные выводы без лишних цифр"
              icon={Activity}
            />
            <div
              className="ui-stack"
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8
              }}
            >
              <InsightCard
                label="Главная статья расходов"
                value={
                  topExpense
                    ? `${topExpense.label} · ${formatMoneyMinor(topExpense.amountMinor, report.currencyCode)}`
                    : 'Расходов нет'
                }
                hint={
                  topExpense ? `${Math.round(topExpense.sharePercent)}% всех расходов` : undefined
                }
                icon={TrendingDown}
                tone={expenseTone}
              />
              <InsightCard
                label="Главный источник дохода"
                value={
                  topIncome
                    ? `${topIncome.label} · ${formatMoneyMinor(topIncome.amountMinor, report.currencyCode)}`
                    : 'Доходов нет'
                }
                hint={topIncome ? `${Math.round(topIncome.sharePercent)}% всех доходов` : undefined}
                icon={TrendingUp}
                tone={incomeTone}
              />
              <InsightCard
                label="Сбережения"
                value={
                  report.savingsRatePercent === null
                    ? 'Нет данных'
                    : `${Math.round(report.savingsRatePercent * 10) / 10}%`
                }
                hint="Доля доходов, оставшаяся после расходов"
                icon={PiggyBank}
                tone={savingsTone}
              />
              <InsightCard
                label="Пиковые расходы"
                value={
                  peakExpensePoint && peakExpensePoint.expenseMinor > 0
                    ? `${peakExpensePoint.label} · ${formatMoneyMinor(peakExpensePoint.expenseMinor, report.currencyCode)}`
                    : 'Расходов нет'
                }
                hint={`Крупнейшая трата: ${formatMoneyMinor(report.largestExpenseMinor, report.currencyCode)}`}
                icon={CalendarDays}
                tone={expenseTone}
              />
            </div>
          </div>

          <div
            className="ui-stack"
            style={{
              gap: 8
            }}
          >
            <SectionHeader
              title="Графики"
              subtitle="Динамика и структура денег"
              icon={TrendingUp}
            />
            <FinanceReportCharts
              reportType={reportType}
              currencyCode={report.currencyCode}
              timeline={report.timeline}
              expenseByTag={report.expenseByTag}
              incomeByTag={report.incomeByTag}
              transferFlows={report.transferFlows}
            />
          </div>

          <Action
            role={'button'}
            aria-label={'Открыть подробную статистику'}
            onClick={() => setDetailsOpen(true)}
            style={{
              minHeight: 58,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              paddingInline: 13,
              paddingBlock: 10,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 14,
              backgroundColor: theme.surface,
              opacity: 1
            }}
            pressedStyle={{
              backgroundColor: theme.raised,
              opacity: 0.76
            }}
          >
            <div
              className="ui-stack"
              style={{
                width: 34,
                height: 34,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 10,
                backgroundColor: theme.accent + '12'
              }}
            >
              <Activity size={16} color={theme.accent} />
            </div>
            <div
              className="ui-stack"
              style={{
                minWidth: 0,
                flex: '1 1 0%'
              }}
            >
              <span
                className="ui-text"
                style={{
                  color: theme.text,
                  fontSize: 12.5,
                  fontWeight: 800
                }}
              >
                Подробная статистика
              </span>
              <span
                className="ui-text"
                data-lines={1}
                style={{
                  marginTop: 2,
                  color: theme.muted,
                  fontSize: 9.5,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: 1
                }}
              >
                Средние значения, динамика, счета, переводы и лимиты
              </span>
            </div>
            <ChevronRight size={16} color={theme.muted} />
          </Action>
        </div>
      </div>

      <AppDialog
        open={periodOpen}
        onOpenChange={setPeriodOpen}
        title="Период отчёта"
        description="Выберите готовый период или задайте собственный диапазон"
        icon="calendar"
        presentation="sheet"
        footer={<Button label="Закрыть" onClick={() => setPeriodOpen(false)} />}
      >
        <div className="ui-scroll">
          <div
            className="ui-stack ui-scroll-content"
            style={{
              gap: 16,
              padding: 14,
              paddingBottom: 24
            }}
          >
            <div
              className="ui-stack"
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 8
              }}
            >
              {reportRangeOptions.map((option) => (
                <ReportChip
                  key={option.key}
                  label={option.label}
                  selected={reportRange === option.key}
                  grow
                  onClick={() => chooseRange(option.key)}
                />
              ))}
            </div>

            {reportRange === 'custom' ? (
              <div
                className="ui-stack"
                style={{
                  gap: 9
                }}
              >
                <Label>Свой диапазон</Label>
                <div
                  className="ui-stack"
                  style={{
                    flexDirection: 'row',
                    gap: 8
                  }}
                >
                  <TextControl
                    aria-label={'Начальная дата отчёта'}
                    value={customDraftFrom}
                    onValueChange={setCustomDraftFrom}
                    autoCapitalize={'none'}
                    autoCorrect={'off'}
                    placeholder={'2026-09-01'}
                    placeholderColor={theme.muted}
                    style={{
                      ...dateInputStyle,
                      minWidth: 0,
                      flex: '1 1 0%'
                    }}
                  ></TextControl>
                  <TextControl
                    aria-label={'Конечная дата отчёта'}
                    value={customDraftTo}
                    onValueChange={setCustomDraftTo}
                    autoCapitalize={'none'}
                    autoCorrect={'off'}
                    placeholder={'2026-09-30'}
                    placeholderColor={theme.muted}
                    style={{
                      ...dateInputStyle,
                      minWidth: 0,
                      flex: '1 1 0%'
                    }}
                  ></TextControl>
                </div>
                {customError ? <ErrorState message={customError} /> : null}
                <Button label="Применить диапазон" selected onClick={applyCustomPeriod} />
              </div>
            ) : null}
          </div>
        </div>
      </AppDialog>

      <AppDialog
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        title="Фильтры отчёта"
        description="Операции, счёт, тег и источник"
        icon="finance"
        presentation="sheet"
        footer={
          <>
            {hasSecondaryFilters ? <Button label="Сбросить" onClick={resetFilters} /> : null}
            <Button label="Готово" primary onClick={() => setFiltersOpen(false)} />
          </>
        }
      >
        <div className="ui-scroll">
          <div
            className="ui-stack ui-scroll-content"
            style={{
              gap: 18,
              padding: 14,
              paddingBottom: 24
            }}
          >
            <div
              className="ui-stack"
              style={{
                gap: 8
              }}
            >
              <Label>Операции</Label>
              <div
                className="ui-stack"
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 7
                }}
              >
                {reportTypeOptions.map((option) => (
                  <ReportChip
                    key={option.key}
                    label={option.label}
                    selected={reportType === option.key}
                    onClick={() => chooseType(option.key)}
                  />
                ))}
              </div>
            </div>

            <div
              className="ui-stack"
              style={{
                gap: 8
              }}
            >
              <Label>Счёт</Label>
              <div
                className="ui-stack"
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 7
                }}
              >
                <ReportChip
                  label="Все счета"
                  selected={accountId === 'all'}
                  onClick={() => setAccountId('all')}
                />
                {accounts.map((account) => (
                  <ReportChip
                    key={account.id}
                    label={`${account.name} · ${account.currencyCode}`}
                    selected={accountId === account.id}
                    onClick={() => setAccountId(account.id)}
                  />
                ))}
              </div>
            </div>

            <div
              className="ui-stack"
              style={{
                gap: 8
              }}
            >
              <Label>Тег</Label>
              {reportType === 'transfer' ? (
                <span
                  className="ui-text"
                  style={{
                    color: theme.muted,
                    fontSize: 11.5
                  }}
                >
                  Для переводов тег не применяется.
                </span>
              ) : (
                <div
                  className="ui-stack"
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 7
                  }}
                >
                  <ReportChip
                    label="Все теги"
                    selected={validTagId === 'all'}
                    onClick={() => setTagId('all')}
                  />
                  {availableTags.map((tag) => (
                    <ReportChip
                      key={tag.id}
                      label={tag.name}
                      selected={validTagId === tag.id}
                      onClick={() => setTagId(tag.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            <div
              className="ui-stack"
              style={{
                gap: 8
              }}
            >
              <Label>Источник</Label>
              <div
                className="ui-stack"
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 7
                }}
              >
                {reportSourceOptions.map((option) => (
                  <ReportChip
                    key={option.key}
                    label={option.label}
                    selected={source === option.key}
                    onClick={() => setSource(option.key)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </AppDialog>

      <AppDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        title="Подробная статистика"
        description={period.label}
        icon="chart"
        presentation="sheet"
        footer={<Button label="Закрыть" primary onClick={() => setDetailsOpen(false)} />}
      >
        <div className="ui-scroll">
          <div
            className="ui-stack ui-scroll-content"
            style={{
              gap: 18,
              padding: 14,
              paddingBottom: 24
            }}
          >
            <div
              className="ui-stack"
              style={{
                gap: 8
              }}
            >
              <SectionHeader title="Средние и максимумы" icon={Activity} />
              <DetailRow
                title="Средний доход"
                value={formatMoneyMinor(report.averageIncomeMinor, report.currencyCode)}
                tone={incomeTone}
                subtitle={`Средний расход: ${formatMoneyMinor(report.averageExpenseMinor, report.currencyCode)}`}
              />
              <DetailRow
                title="Расход в день"
                value={formatMoneyMinor(report.averageDailyExpenseMinor, report.currencyCode)}
                tone={expenseTone}
                subtitle={`Крупнейший расход: ${formatMoneyMinor(report.largestExpenseMinor, report.currencyCode)}`}
              />
              <DetailRow
                title="Крупнейший доход"
                value={formatMoneyMinor(report.largestIncomeMinor, report.currencyCode)}
                tone={incomeTone}
                subtitle={`${report.incomeCount} доходов · ${report.expenseCount} расходов · ${report.transferCount} переводов`}
              />
              <DetailRow
                title="Оборот переводов"
                value={formatMoneyMinor(report.transferVolumeMinor, report.currencyCode)}
              />
            </div>

            <div
              className="ui-stack"
              style={{
                gap: 8
              }}
            >
              <SectionHeader title="Последняя динамика" icon={TrendingUp} />
              {report.timeline.length ? (
                report.timeline
                  .slice(-8)
                  .map((point) => (
                    <DetailRow
                      key={point.key}
                      title={point.label}
                      value={formatMoneyMinor(point.netMinor, report.currencyCode)}
                      tone={point.netMinor < 0 ? expenseTone : incomeTone}
                      subtitle={`Доход ${formatMoneyMinor(point.incomeMinor, report.currencyCode)} · расход ${formatMoneyMinor(point.expenseMinor, report.currencyCode)}`}
                    />
                  ))
              ) : (
                <EmptyState text="Нет данных для динамики." />
              )}
            </div>

            <div
              className="ui-stack"
              style={{
                gap: 8
              }}
            >
              <SectionHeader title="Активность по счетам" icon={Landmark} />
              {report.accountActivity.length ? (
                report.accountActivity.map((account) => (
                  <DetailRow
                    key={account.accountId}
                    title={account.accountName}
                    value={formatMoneyMinor(account.netMinor, report.currencyCode)}
                    tone={account.netMinor < 0 ? expenseTone : incomeTone}
                    subtitle={`${account.operationCount} операций · доход ${formatMoneyMinor(account.incomeMinor, report.currencyCode)} · расход ${formatMoneyMinor(account.expenseMinor, report.currencyCode)}`}
                  />
                ))
              ) : (
                <EmptyState text="Нет активности по счетам." />
              )}
            </div>

            <div
              className="ui-stack"
              style={{
                gap: 8
              }}
            >
              <SectionHeader title="Переводы" icon={ArrowRightLeft} />
              {report.transferFlows.length ? (
                report.transferFlows
                  .slice(0, 8)
                  .map((flow) => (
                    <DetailRow
                      key={`${flow.sourceAccountId}:${flow.destinationAccountId}:${flow.sourceCurrencyCode}:${flow.destinationCurrencyCode}`}
                      title={`${flow.sourceAccountName} → ${flow.destinationAccountName}`}
                      value={`${flow.count} шт.`}
                      subtitle={`${formatMoneyMinor(flow.sourceAmountMinor, flow.sourceCurrencyCode)} → ${formatMoneyMinor(flow.destinationAmountMinor, flow.destinationCurrencyCode)}`}
                    />
                  ))
              ) : (
                <EmptyState text="Переводов за период нет." />
              )}
            </div>

            <div
              className="ui-stack"
              style={{
                gap: 8
              }}
            >
              <SectionHeader title="Активные лимиты" icon={Gauge} />
              {report.limits.length ? (
                report.limits.map((limit) => {
                  const tag = tags.find((item) => item.id === limit.tagId)
                  const usageTone =
                    limit.usagePercent >= 100
                      ? expenseTone
                      : limit.warningReached
                        ? '#fbbf24'
                        : theme.accent
                  return (
                    <DetailRow
                      key={limit.id}
                      title={tag?.name ?? 'Лимит'}
                      value={`${Math.round(limit.usagePercent)}%`}
                      tone={usageTone}
                      subtitle={`${formatMoneyMinor(limit.spentMinor, limit.currencyCode)} из ${formatMoneyMinor(limit.amountMinor, limit.currencyCode)}`}
                    />
                  )
                })
              ) : (
                <EmptyState text="Активных лимитов для периода нет." />
              )}
            </div>
          </div>
        </div>
      </AppDialog>
    </div>
  )
}
