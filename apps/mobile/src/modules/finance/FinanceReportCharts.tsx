import { ScrollView, Text, View } from 'react-native'
import { formatMoneyMinor } from '@mymind/core/finance-money'
import { useTheme } from '../../shared/ui/theme'
import type { MobileFinanceReportType } from './finance-report-filters'
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
    <View style={{ gap: 12 }}>
      {visible.cashFlow ? <CashFlowChart timeline={timeline} currencyCode={currencyCode} /> : null}
      <BalanceChart timeline={timeline} currencyCode={currencyCode} />
      {visible.expenseBreakdown ? (
        <BreakdownChart
          title="Куда уходят деньги"
          description="Доля каждой категории в расходах за выбранный период."
          emptyText="Нет расходов для диаграммы."
          items={expenseByTag}
          currencyCode={currencyCode}
          tone="secondary"
        />
      ) : null}
      {visible.incomeBreakdown ? (
        <BreakdownChart
          title="Откуда приходят деньги"
          description="Крупнейшие источники дохода за выбранный период."
          emptyText="Нет доходов для диаграммы."
          items={incomeByTag}
          currencyCode={currencyCode}
          tone="accent"
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
  const points = timeline.slice(-12)
  const domain = financeChartDomain(
    points.flatMap((point) => [point.incomeMinor, point.expenseMinor])
  )

  return (
    <ChartSurface
      title="Доходы и расходы по времени"
      description="Акцентный столбец — доход, приглушённый — расход. Переводы не смешиваются с денежным потоком."
    >
      {points.length === 0 ? (
        <ChartEmpty text="Нет данных для денежного потока." />
      ) : (
        <>
          <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
            <LegendDot color={theme.accent} label="Доход" />
            <LegendDot color={theme.muted} label="Расход" />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ alignItems: 'flex-end', gap: 8, minHeight: 142, paddingTop: 4 }}
          >
            {points.map((point) => {
              const incomeHeight = financeChartBarSize(point.incomeMinor, domain, 94)
              const expenseHeight = financeChartBarSize(point.expenseMinor, domain, 94)
              return (
                <View key={`cash-flow:${point.key}`} style={{ width: 58, alignItems: 'center', gap: 5 }}>
                  <View
                    accessibilityLabel={`${point.label}: доход ${formatMoneyMinor(point.incomeMinor, currencyCode)}, расход ${formatMoneyMinor(point.expenseMinor, currencyCode)}`}
                    style={{ height: 100, flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}
                  >
                    <View
                      style={{
                        width: 15,
                        height: incomeHeight,
                        minHeight: incomeHeight > 0 ? 1 : 0,
                        borderRadius: 5,
                        backgroundColor: theme.accent
                      }}
                    />
                    <View
                      style={{
                        width: 15,
                        height: expenseHeight,
                        minHeight: expenseHeight > 0 ? 1 : 0,
                        borderRadius: 5,
                        backgroundColor: theme.muted,
                        opacity: 0.8
                      }}
                    />
                  </View>
                  <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 9, maxWidth: 58 }}>
                    {point.label}
                  </Text>
                </View>
              )
            })}
          </ScrollView>
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
  const points = timeline.slice(-12).filter((point) => point.balanceMinor !== null)
  const domain = financeChartDomain(points.map((point) => point.balanceMinor))
  const halfHeight = 48

  return (
    <ChartSurface
      title="Динамика баланса"
      description="Столбцы показывают реальный баланс на конец интервала; центральная линия — ноль."
    >
      {points.length === 0 ? (
        <ChartEmpty text="Нет полного баланса для выбранного периода." />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, minHeight: 148, paddingTop: 4 }}
        >
          {points.map((point) => {
            const balance = point.balanceMinor ?? 0
            const size = financeChartBarSize(balance, domain, halfHeight)
            return (
              <View key={`balance:${point.key}`} style={{ width: 58, alignItems: 'center', gap: 5 }}>
                <View
                  accessibilityLabel={`${point.label}: баланс ${formatMoneyMinor(balance, currencyCode)}`}
                  style={{ width: 34, height: halfHeight * 2 + 2, position: 'relative' }}
                >
                  <View
                    style={{
                      position: 'absolute',
                      top: halfHeight,
                      left: 0,
                      right: 0,
                      height: 1,
                      backgroundColor: theme.border
                    }}
                  />
                  {balance >= 0 ? (
                    <View
                      style={{
                        position: 'absolute',
                        left: 8,
                        right: 8,
                        bottom: halfHeight + 1,
                        height: size,
                        borderTopLeftRadius: 5,
                        borderTopRightRadius: 5,
                        backgroundColor: theme.accent
                      }}
                    />
                  ) : (
                    <View
                      style={{
                        position: 'absolute',
                        left: 8,
                        right: 8,
                        top: halfHeight + 1,
                        height: size,
                        borderBottomLeftRadius: 5,
                        borderBottomRightRadius: 5,
                        backgroundColor: theme.muted
                      }}
                    />
                  )}
                </View>
                <Text numberOfLines={1} style={{ color: theme.muted, fontSize: 9, maxWidth: 58 }}>
                  {point.label}
                </Text>
              </View>
            )
          })}
        </ScrollView>
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
  tone: 'accent' | 'secondary'
}): React.JSX.Element {
  const theme = useTheme()
  const top = items.slice(0, 8)
  const barColor = tone === 'accent' ? theme.accent : theme.muted

  return (
    <ChartSurface title={title} description={description}>
      {top.length === 0 ? (
        <ChartEmpty text={emptyText} />
      ) : (
        <View style={{ gap: 12 }}>
          {top.map((item) => (
            <View key={`${title}:${item.tagId ?? 'none'}:${item.label}`} style={{ gap: 5 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                <Text
                  numberOfLines={1}
                  style={{ color: theme.text, fontSize: 12, fontWeight: '700', flex: 1 }}
                >
                  {item.label}
                </Text>
                <Text style={{ color: theme.muted, fontSize: 11 }}>
                  {formatMoneyMinor(item.amountMinor, currencyCode)} · {Math.round(item.sharePercent)}%
                </Text>
              </View>
              <View
                accessibilityLabel={`${item.label}: ${formatMoneyMinor(item.amountMinor, currencyCode)}, ${Math.round(item.sharePercent)}%`}
                style={{ height: 9, borderRadius: 5, overflow: 'hidden', backgroundColor: theme.raised }}
              >
                <View
                  style={{
                    height: '100%',
                    width: financeBreakdownWidth(item.sharePercent),
                    borderRadius: 5,
                    backgroundColor: barColor,
                    opacity: tone === 'accent' ? 1 : 0.82
                  }}
                />
              </View>
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
  const flows = transferFlows.filter((flow) => flow.convertedAmountMinor !== null).slice(0, 8)
  const domain = financeChartDomain(flows.map((flow) => flow.convertedAmountMinor))

  return (
    <ChartSurface
      title="Переводы между счетами"
      description={`Полосы сравнивают оборот переводов в ${currencyCode}; исходные суммы остаются в подробном списке ниже.`}
    >
      {flows.length === 0 ? (
        <ChartEmpty text="Нет переводов с доступным курсом для диаграммы." />
      ) : (
        <View style={{ gap: 12 }}>
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
                    style={{ color: theme.text, fontSize: 12, fontWeight: '700', flex: 1 }}
                  >
                    {flow.sourceAccountName} → {flow.destinationAccountName}
                  </Text>
                  <Text style={{ color: theme.muted, fontSize: 11 }}>
                    {formatMoneyMinor(converted, currencyCode)}
                  </Text>
                </View>
                <View
                  accessibilityLabel={`${flow.sourceAccountName} в ${flow.destinationAccountName}: ${flow.count} переводов, ${formatMoneyMinor(converted, currencyCode)}`}
                  style={{ height: 9, borderRadius: 5, overflow: 'hidden', backgroundColor: theme.raised }}
                >
                  <View
                    style={{
                      height: '100%',
                      width: financeBreakdownWidth(share),
                      borderRadius: 5,
                      backgroundColor: theme.accent
                    }}
                  />
                </View>
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
        borderRadius: 16,
        backgroundColor: theme.surface,
        padding: 14,
        gap: 12
      }}
    >
      <View style={{ gap: 3 }}>
        <Text style={{ color: theme.text, fontSize: 14, fontWeight: '800' }}>{title}</Text>
        <Text style={{ color: theme.muted, fontSize: 10, lineHeight: 15 }}>{description}</Text>
      </View>
      {children}
    </View>
  )
}

function LegendDot({ color, label }: { color: string; label: string }): React.JSX.Element {
  const theme = useTheme()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text style={{ color: theme.muted, fontSize: 10 }}>{label}</Text>
    </View>
  )
}

function ChartEmpty({ text }: { text: string }): React.JSX.Element {
  const theme = useTheme()
  return <Text style={{ color: theme.muted, fontSize: 12 }}>{text}</Text>
}
