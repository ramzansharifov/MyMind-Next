import { FittedText } from '../../../ui/FittedText'
import { formatMoneyMinor } from '@mymind/core/finance-money'
import { useTheme } from '../../shared/ui/theme'
import type { MobileFinanceReportType } from './finance-report-filters'
import { financeOperationTone } from './finance-semantic-colors'
import {
  financeBreakdownWidth,
  financeChartBarSize,
  financeChartDomain,
  financeChartVisibility
} from './finance-report-presentation'
interface TimelinePoint {
  key: string
  label: string
  incomeMinor: number
  expenseMinor: number
  balanceMinor: number | null
}
interface BreakdownPoint {
  tagId: string | null
  label: string
  amountMinor: number
  sharePercent: number
}
interface TransferFlow {
  sourceAccountId: string
  sourceAccountName: string
  destinationAccountId: string
  destinationAccountName: string
  sourceAmountMinor: number
  destinationAmountMinor: number
  sourceCurrencyCode: string
  destinationCurrencyCode: string
  count: number
  convertedAmountMinor: number | null
}
interface Props {
  reportType: MobileFinanceReportType
  currencyCode: string
  timeline: TimelinePoint[]
  expenseByTag: BreakdownPoint[]
  incomeByTag: BreakdownPoint[]
  transferFlows: TransferFlow[]
}
export function FinanceReportCharts({
  reportType,
  currencyCode,
  timeline,
  expenseByTag,
  incomeByTag,
  transferFlows
}: Props): React.JSX.Element {
  const visible = financeChartVisibility(reportType)
  return (
    <div
      className="ui-stack"
      style={{
        gap: 10
      }}
    >
      {visible.cashFlow ? <CashFlowChart timeline={timeline} currencyCode={currencyCode} /> : null}
      <BalanceChart timeline={timeline} currencyCode={currencyCode} />
      {visible.expenseBreakdown ? (
        <BreakdownChart
          title="Куда уходят деньги"
          description="Крупнейшие категории расходов."
          emptyText="Нет расходов для диаграммы."
          items={expenseByTag}
          currencyCode={currencyCode}
          tone="expense"
        />
      ) : null}
      {visible.incomeBreakdown ? (
        <BreakdownChart
          title="Откуда приходят деньги"
          description="Крупнейшие источники дохода."
          emptyText="Нет доходов для диаграммы."
          items={incomeByTag}
          currencyCode={currencyCode}
          tone="income"
        />
      ) : null}
      {visible.transfers ? (
        <TransferChart transferFlows={transferFlows} currencyCode={currencyCode} />
      ) : null}
    </div>
  )
}
function CashFlowChart({
  timeline,
  currencyCode
}: {
  timeline: TimelinePoint[]
  currencyCode: string
}): React.JSX.Element {
  const theme = useTheme()
  const incomeTone = financeOperationTone('income', theme.accent)
  const expenseTone = financeOperationTone('expense', theme.accent)
  const points = timeline.slice(-7)
  const domain = financeChartDomain(
    points.flatMap((point) => [point.incomeMinor, point.expenseMinor])
  )
  return (
    <ChartSurface title="Денежный поток" description="Доходы и расходы за последние интервалы.">
      {points.length === 0 ? (
        <ChartEmpty text="Нет данных для денежного потока." />
      ) : (
        <>
          <div
            className="ui-stack"
            style={{
              flexDirection: 'row',
              gap: 14,
              alignItems: 'center'
            }}
          >
            <LegendDot color={incomeTone} label="Доход" />
            <LegendDot color={expenseTone} label="Расход" />
          </div>
          <div
            className="ui-stack"
            style={{
              minHeight: 134,
              flexDirection: 'row',
              alignItems: 'flex-end',
              gap: 3,
              paddingTop: 4
            }}
          >
            {points.map((point) => {
              const incomeHeight = financeChartBarSize(point.incomeMinor, domain, 90)
              const expenseHeight = financeChartBarSize(point.expenseMinor, domain, 90)
              return (
                <div
                  className="ui-stack"
                  key={`cash-flow:${point.key}`}
                  style={{
                    minWidth: 0,
                    flex: '1 1 0%',
                    alignItems: 'center',
                    gap: 5
                  }}
                >
                  <div
                    className="ui-stack"
                    aria-label={`${point.label}: доход ${formatMoneyMinor(point.incomeMinor, currencyCode)}, расход ${formatMoneyMinor(point.expenseMinor, currencyCode)}`}
                    style={{
                      height: 96,
                      flexDirection: 'row',
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                      gap: 3
                    }}
                  >
                    <div
                      className="ui-stack"
                      style={{
                        width: 9,
                        height: incomeHeight,
                        minHeight: incomeHeight > 0 ? 1 : 0,
                        borderRadius: 4,
                        backgroundColor: incomeTone
                      }}
                    ></div>
                    <div
                      className="ui-stack"
                      style={{
                        width: 9,
                        height: expenseHeight,
                        minHeight: expenseHeight > 0 ? 1 : 0,
                        borderRadius: 4,
                        backgroundColor: expenseTone
                      }}
                    ></div>
                  </div>
                  <FittedText
                    minScale={0.72}
                    className="ui-text"
                    data-lines={1}
                    style={{
                      width: '100%',
                      color: theme.muted,
                      fontSize: 8.5,
                      textAlign: 'center',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitBoxOrient: 'vertical',
                      WebkitLineClamp: 1
                    }}
                  >
                    {point.label}
                  </FittedText>
                </div>
              )
            })}
          </div>
        </>
      )}
    </ChartSurface>
  )
}
function BalanceChart({
  timeline,
  currencyCode
}: {
  timeline: TimelinePoint[]
  currencyCode: string
}): React.JSX.Element {
  const theme = useTheme()
  const expenseTone = financeOperationTone('expense', theme.accent)
  const points = timeline.slice(-7).filter((point) => point.balanceMinor !== null)
  const domain = financeChartDomain(points.map((point) => point.balanceMinor))
  const halfHeight = 44
  return (
    <ChartSurface title="Баланс" description="Баланс на конец каждого интервала.">
      {points.length === 0 ? (
        <ChartEmpty text="Нет полного баланса для выбранного периода." />
      ) : (
        <div
          className="ui-stack"
          style={{
            minHeight: 132,
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 3,
            paddingTop: 4
          }}
        >
          {points.map((point) => {
            const balance = point.balanceMinor ?? 0
            const size = financeChartBarSize(balance, domain, halfHeight)
            return (
              <div
                className="ui-stack"
                key={`balance:${point.key}`}
                style={{
                  minWidth: 0,
                  flex: '1 1 0%',
                  alignItems: 'center',
                  gap: 5
                }}
              >
                <div
                  className="ui-stack"
                  aria-label={`${point.label}: баланс ${formatMoneyMinor(balance, currencyCode)}`}
                  style={{
                    width: '100%',
                    height: halfHeight * 2 + 2,
                    position: 'relative'
                  }}
                >
                  <div
                    className="ui-stack"
                    style={{
                      position: 'absolute',
                      top: halfHeight,
                      left: 2,
                      right: 2,
                      height: 1,
                      backgroundColor: theme.border
                    }}
                  ></div>
                  {balance >= 0 ? (
                    <div
                      className="ui-stack"
                      style={{
                        position: 'absolute',
                        left: '34%',
                        right: '34%',
                        bottom: halfHeight + 1,
                        height: size,
                        borderTopLeftRadius: 4,
                        borderTopRightRadius: 4,
                        backgroundColor: theme.accent
                      }}
                    ></div>
                  ) : (
                    <div
                      className="ui-stack"
                      style={{
                        position: 'absolute',
                        left: '34%',
                        right: '34%',
                        top: halfHeight + 1,
                        height: size,
                        borderBottomLeftRadius: 4,
                        borderBottomRightRadius: 4,
                        backgroundColor: expenseTone
                      }}
                    ></div>
                  )}
                </div>
                <FittedText
                  minScale={0.72}
                  className="ui-text"
                  data-lines={1}
                  style={{
                    width: '100%',
                    color: theme.muted,
                    fontSize: 8.5,
                    textAlign: 'center',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitBoxOrient: 'vertical',
                    WebkitLineClamp: 1
                  }}
                >
                  {point.label}
                </FittedText>
              </div>
            )
          })}
        </div>
      )}
    </ChartSurface>
  )
}
function BreakdownChart({
  title,
  description,
  emptyText,
  items,
  currencyCode,
  tone
}: {
  title: string
  description: string
  emptyText: string
  items: BreakdownPoint[]
  currencyCode: string
  tone: 'income' | 'expense'
}): React.JSX.Element {
  const theme = useTheme()
  const top = items.slice(0, 6)
  const barColor = financeOperationTone(tone, theme.accent)
  return (
    <ChartSurface title={title} description={description}>
      {top.length === 0 ? (
        <ChartEmpty text={emptyText} />
      ) : (
        <div
          className="ui-stack"
          style={{
            gap: 11
          }}
        >
          {top.map((item) => (
            <div
              className="ui-stack"
              key={`${title}:${item.tagId ?? 'none'}:${item.label}`}
              style={{
                gap: 5
              }}
            >
              <div
                className="ui-stack"
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  gap: 10
                }}
              >
                <span
                  className="ui-text"
                  data-lines={1}
                  style={{
                    minWidth: 0,
                    flex: '1 1 0%',
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
                  {item.label}
                </span>
                <span
                  className="ui-text"
                  data-lines={1}
                  style={{
                    color: barColor,
                    fontSize: 10.5,
                    fontWeight: 700,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitBoxOrient: 'vertical',
                    WebkitLineClamp: 1
                  }}
                >
                  {Math.round(item.sharePercent)}%
                </span>
              </div>
              <div
                className="ui-stack"
                aria-label={`${item.label}: ${formatMoneyMinor(item.amountMinor, currencyCode)}, ${Math.round(item.sharePercent)}%`}
                style={{
                  height: 8,
                  borderRadius: 4,
                  overflow: 'hidden',
                  backgroundColor: theme.raised
                }}
              >
                <div
                  className="ui-stack"
                  style={{
                    height: '100%',
                    width: financeBreakdownWidth(item.sharePercent),
                    borderRadius: 4,
                    backgroundColor: barColor
                  }}
                ></div>
              </div>
              <span
                className="ui-text"
                style={{
                  color: theme.muted,
                  fontSize: 9.5
                }}
              >
                {formatMoneyMinor(item.amountMinor, currencyCode)}
              </span>
            </div>
          ))}
        </div>
      )}
    </ChartSurface>
  )
}
function TransferChart({
  transferFlows,
  currencyCode
}: {
  transferFlows: TransferFlow[]
  currencyCode: string
}): React.JSX.Element {
  const theme = useTheme()
  const flows = transferFlows.filter((flow) => flow.convertedAmountMinor !== null).slice(0, 6)
  const domain = financeChartDomain(flows.map((flow) => flow.convertedAmountMinor))
  return (
    <ChartSurface title="Переводы" description={`Оборот между счетами в ${currencyCode}.`}>
      {flows.length === 0 ? (
        <ChartEmpty text="Нет переводов с доступным курсом." />
      ) : (
        <div
          className="ui-stack"
          style={{
            gap: 11
          }}
        >
          {flows.map((flow) => {
            const converted = flow.convertedAmountMinor ?? 0
            const share = (Math.abs(converted) / domain) * 100
            return (
              <div
                className="ui-stack"
                key={`transfer:${flow.sourceAccountId}:${flow.destinationAccountId}:${flow.sourceCurrencyCode}:${flow.destinationCurrencyCode}`}
                style={{
                  gap: 5
                }}
              >
                <div
                  className="ui-stack"
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    gap: 10
                  }}
                >
                  <span
                    className="ui-text"
                    data-lines={1}
                    style={{
                      minWidth: 0,
                      flex: '1 1 0%',
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
                    {flow.sourceAccountName} → {flow.destinationAccountName}
                  </span>
                  <span
                    className="ui-text"
                    style={{
                      color: theme.accent,
                      fontSize: 10.5,
                      fontWeight: 700
                    }}
                  >
                    {flow.count} шт.
                  </span>
                </div>
                <div
                  className="ui-stack"
                  aria-label={`${flow.sourceAccountName} в ${flow.destinationAccountName}: ${flow.count} переводов, ${formatMoneyMinor(converted, currencyCode)}`}
                  style={{
                    height: 8,
                    borderRadius: 4,
                    overflow: 'hidden',
                    backgroundColor: theme.raised
                  }}
                >
                  <div
                    className="ui-stack"
                    style={{
                      height: '100%',
                      width: financeBreakdownWidth(share),
                      borderRadius: 4,
                      backgroundColor: theme.accent
                    }}
                  ></div>
                </div>
                <span
                  className="ui-text"
                  style={{
                    color: theme.muted,
                    fontSize: 9.5
                  }}
                >
                  {formatMoneyMinor(converted, currencyCode)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </ChartSurface>
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
  const theme = useTheme()
  return (
    <div
      className="ui-stack"
      style={{
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 15,
        backgroundColor: theme.surface,
        padding: 13,
        gap: 11
      }}
    >
      <div
        className="ui-stack"
        style={{
          gap: 2
        }}
      >
        <span
          className="ui-text"
          style={{
            color: theme.text,
            fontSize: 13,
            fontWeight: 800
          }}
        >
          {title}
        </span>
        <span
          className="ui-text"
          style={{
            color: theme.muted,
            fontSize: 9.5,
            lineHeight: '14px'
          }}
        >
          {description}
        </span>
      </div>
      {children}
    </div>
  )
}
function LegendDot({ color, label }: { color: string; label: string }): React.JSX.Element {
  const theme = useTheme()
  return (
    <div
      className="ui-stack"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
      }}
    >
      <div
        className="ui-stack"
        style={{
          width: 7,
          height: 7,
          borderRadius: 4,
          backgroundColor: color
        }}
      ></div>
      <span
        className="ui-text"
        style={{
          color: theme.muted,
          fontSize: 9.5
        }}
      >
        {label}
      </span>
    </div>
  )
}
function ChartEmpty({ text }: { text: string }): React.JSX.Element {
  const theme = useTheme()
  return (
    <span
      className="ui-text"
      style={{
        color: theme.muted,
        fontSize: 11.5
      }}
    >
      {text}
    </span>
  )
}
