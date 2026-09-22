import { Text, View } from 'react-native'
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
    <View style={{ gap: 10 }}>
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
    </View>
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
          <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
            <LegendDot color={incomeTone} label="Доход" />
            <LegendDot color={expenseTone} label="Расход" />
          </View>
          <View
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
                <View
                  key={`cash-flow:${point.key}`}
                  style={{ minWidth: 0, flex: 1, alignItems: 'center', gap: 5 }}
                >
                  <View
                    accessibilityLabel={`${point.label}: доход ${formatMoneyMinor(
                      point.incomeMinor,
                      currencyCode
                    )}, расход ${formatMoneyMinor(point.expenseMinor, currencyCode)}`}
                    style={{
                      height: 96,
                      flexDirection: 'row',
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                      gap: 3
                    }}
                  >
                    <View
                      style={{
                        width: 9,
                        height: incomeHeight,
                        minHeight: incomeHeight > 0 ? 1 : 0,
                        borderRadius: 4,
                        backgroundColor: incomeTone
                      }}
                    />
                    <View
                      style={{
                        width: 9,
                        height: expenseHeight,
                        minHeight: expenseHeight > 0 ? 1 : 0,
                        borderRadius: 4,
                        backgroundColor: expenseTone
                      }}
                    />
                  </View>
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.72}
                    style={{
                      width: '100%',
                      color: theme.muted,
                      fontSize: 8.5,
                      textAlign: 'center'
                    }}
                  >
                    {point.label}
                  </Text>
                </View>
              )
            })}
          </View>
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
        <View
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
              <View
                key={`balance:${point.key}`}
                style={{ minWidth: 0, flex: 1, alignItems: 'center', gap: 5 }}
              >
                <View
                  accessibilityLabel={`${point.label}: баланс ${formatMoneyMinor(balance, currencyCode)}`}
                  style={{ width: '100%', height: halfHeight * 2 + 2, position: 'relative' }}
                >
                  <View
                    style={{
                      position: 'absolute',
                      top: halfHeight,
                      left: 2,
                      right: 2,
                      height: 1,
                      backgroundColor: theme.border
                    }}
                  />
                  {balance >= 0 ? (
                    <View
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
                    />
                  ) : (
                    <View
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
                    />
                  )}
                </View>
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.72}
                  style={{ width: '100%', color: theme.muted, fontSize: 8.5, textAlign: 'center' }}
                >
                  {point.label}
                </Text>
              </View>
            )
          })}
        </View>
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
        <View style={{ gap: 11 }}>
          {top.map((item) => (
            <View key={`${title}:${item.tagId ?? 'none'}:${item.label}`} style={{ gap: 5 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                <Text
                  numberOfLines={1}
                  style={{
                    minWidth: 0,
                    flex: 1,
                    color: theme.text,
                    fontSize: 11.5,
                    fontWeight: '700'
                  }}
                >
                  {item.label}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{ color: barColor, fontSize: 10.5, fontWeight: '700' }}
                >
                  {Math.round(item.sharePercent)}%
                </Text>
              </View>
              <View
                accessibilityLabel={`${item.label}: ${formatMoneyMinor(
                  item.amountMinor,
                  currencyCode
                )}, ${Math.round(item.sharePercent)}%`}
                style={{
                  height: 8,
                  borderRadius: 4,
                  overflow: 'hidden',
                  backgroundColor: theme.raised
                }}
              >
                <View
                  style={{
                    height: '100%',
                    width: financeBreakdownWidth(item.sharePercent),
                    borderRadius: 4,
                    backgroundColor: barColor
                  }}
                />
              </View>
              <Text style={{ color: theme.muted, fontSize: 9.5 }}>
                {formatMoneyMinor(item.amountMinor, currencyCode)}
              </Text>
            </View>
          ))}
        </View>
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
        <View style={{ gap: 11 }}>
          {flows.map((flow) => {
            const converted = flow.convertedAmountMinor ?? 0
            const share = (Math.abs(converted) / domain) * 100
            return (
              <View
                key={`transfer:${flow.sourceAccountId}:${flow.destinationAccountId}:${flow.sourceCurrencyCode}:${flow.destinationCurrencyCode}`}
                style={{ gap: 5 }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      minWidth: 0,
                      flex: 1,
                      color: theme.text,
                      fontSize: 11.5,
                      fontWeight: '700'
                    }}
                  >
                    {flow.sourceAccountName} → {flow.destinationAccountName}
                  </Text>
                  <Text style={{ color: theme.accent, fontSize: 10.5, fontWeight: '700' }}>
                    {flow.count} шт.
                  </Text>
                </View>
                <View
                  accessibilityLabel={`${flow.sourceAccountName} в ${flow.destinationAccountName}: ${flow.count} переводов, ${formatMoneyMinor(converted, currencyCode)}`}
                  style={{
                    height: 8,
                    borderRadius: 4,
                    overflow: 'hidden',
                    backgroundColor: theme.raised
                  }}
                >
                  <View
                    style={{
                      height: '100%',
                      width: financeBreakdownWidth(share),
                      borderRadius: 4,
                      backgroundColor: theme.accent
                    }}
                  />
                </View>
                <Text style={{ color: theme.muted, fontSize: 9.5 }}>
                  {formatMoneyMinor(converted, currencyCode)}
                </Text>
              </View>
            )
          })}
        </View>
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
    <View
      style={{
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 15,
        backgroundColor: theme.surface,
        padding: 13,
        gap: 11
      }}
    >
      <View style={{ gap: 2 }}>
        <Text style={{ color: theme.text, fontSize: 13, fontWeight: '800' }}>{title}</Text>
        <Text style={{ color: theme.muted, fontSize: 9.5, lineHeight: 14 }}>{description}</Text>
      </View>
      {children}
    </View>
  )
}

function LegendDot({ color, label }: { color: string; label: string }): React.JSX.Element {
  const theme = useTheme()

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color }} />
      <Text style={{ color: theme.muted, fontSize: 9.5 }}>{label}</Text>
    </View>
  )
}

function ChartEmpty({ text }: { text: string }): React.JSX.Element {
  const theme = useTheme()
  return <Text style={{ color: theme.muted, fontSize: 11.5 }}>{text}</Text>
}
