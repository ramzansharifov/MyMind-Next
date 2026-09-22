import { useCallback, useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
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
} from 'lucide-react-native'
import type { FinanceAccountSummary, FinanceTagSummary } from '@mymind/contracts/finance'
import { formatMoneyMinor } from '@mymind/core/finance-money'
import type { MobileServices } from '../../app/services'
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
  api: MobileServices['finance']
  accounts: FinanceAccountSummary[]
  tags: FinanceTagSummary[]
  baseCurrencyCode: string
}

const reportRangeOptions: Array<{ key: MobileFinanceReportRange; label: string }> = [
  { key: '7d', label: '7 дней' },
  { key: '30d', label: '30 дней' },
  { key: '90d', label: '90 дней' },
  { key: 'month', label: 'Этот месяц' },
  { key: 'previous-month', label: 'Прошлый месяц' },
  { key: 'year', label: 'Этот год' },
  { key: 'custom', label: 'Свой диапазон' }
]

const reportTypeOptions: Array<{ key: MobileFinanceReportType; label: string }> = [
  { key: 'all', label: 'Все операции' },
  { key: 'income', label: 'Доходы' },
  { key: 'expense', label: 'Расходы' },
  { key: 'transfer', label: 'Переводы' }
]

const reportSourceOptions: Array<{ key: MobileFinanceReportSource; label: string }> = [
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
  onPress,
  grow = false
}: {
  label: string
  selected: boolean
  onPress(): void
  grow?: boolean
}): React.JSX.Element {
  const theme = useTheme()

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        minWidth: grow ? '47%' : undefined,
        flexGrow: grow ? 1 : 0,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 13,
        borderWidth: 1,
        borderColor: selected ? theme.accent + '65' : theme.border,
        borderRadius: 12,
        backgroundColor: selected ? theme.accent + '14' : pressed ? theme.raised : theme.surface,
        opacity: pressed ? 0.74 : 1
      })}
    >
      <Text
        numberOfLines={1}
        style={{ color: selected ? theme.accent : theme.text, fontSize: 11.5, fontWeight: '700' }}
      >
        {label}
      </Text>
    </Pressable>
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
    <View
      style={{
        minWidth: 0,
        flex: 1,
        minHeight: 104,
        padding: 12,
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 14,
        backgroundColor: theme.surface
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ color: theme.muted, fontSize: 10.5, fontWeight: '600' }}>{label}</Text>
        <View
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
        </View>
      </View>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.72}
        style={{
          marginTop: 9,
          color: tone,
          fontSize: 16,
          lineHeight: 21,
          fontWeight: '800',
          fontVariant: ['tabular-nums']
        }}
      >
        {value}
      </Text>
      <Text numberOfLines={2} style={{ marginTop: 5, color: theme.muted, fontSize: 9.5, lineHeight: 13 }}>
        {hint}
      </Text>
    </View>
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
    <View
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
      <View
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
      </View>
      <Text style={{ marginTop: 8, color: theme.muted, fontSize: 9.5, lineHeight: 13 }}>{label}</Text>
      <Text
        numberOfLines={2}
        style={{ marginTop: 3, color: theme.text, fontSize: 12.5, lineHeight: 17, fontWeight: '700' }}
      >
        {value}
      </Text>
      {hint ? (
        <Text numberOfLines={1} style={{ marginTop: 3, color: theme.muted, fontSize: 9.5 }}>
          {hint}
        </Text>
      ) : null}
    </View>
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
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
      <View
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
      </View>
      <View style={{ minWidth: 0, flex: 1 }}>
        <Text style={{ color: theme.text, fontSize: 13.5, fontWeight: '800' }}>{title}</Text>
        {subtitle ? (
          <Text numberOfLines={1} style={{ marginTop: 1, color: theme.muted, fontSize: 9.5 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
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
    <View
      style={{
        minHeight: 62,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 13,
        backgroundColor: theme.surface
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <Text
          numberOfLines={2}
          style={{ minWidth: 0, flex: 1, color: theme.text, fontSize: 12, lineHeight: 17, fontWeight: '700' }}
        >
          {title}
        </Text>
        <Text
          numberOfLines={1}
          style={{
            maxWidth: '48%',
            color: tone ?? theme.text,
            fontSize: 11.5,
            fontWeight: '800',
            fontVariant: ['tabular-nums'],
            textAlign: 'right'
          }}
        >
          {value}
        </Text>
      </View>
      {subtitle ? (
        <Text numberOfLines={2} style={{ marginTop: 4, color: theme.muted, fontSize: 9.5, lineHeight: 14 }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  )
}

export function FinanceReportsView({
  api,
  accounts,
  tags,
  baseCurrencyCode
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
    return <ErrorState message={state.error || 'Не удалось построить отчёт'} retry={state.refresh} />
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
    <View style={{ flex: 1 }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: 14, paddingBottom: 96 }}
      >
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Период отчёта: ${period.label}`}
            onPress={() => setPeriodOpen(true)}
            style={({ pressed }) => ({
              minWidth: 0,
              flex: 1,
              height: 44,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingHorizontal: 12,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 13,
              backgroundColor: pressed ? theme.raised : theme.surface,
              opacity: pressed ? 0.76 : 1
            })}
          >
            <CalendarDays size={16} color={theme.accent} />
            <View style={{ minWidth: 0, flex: 1 }}>
              <Text style={{ color: theme.muted, fontSize: 9.5 }}>Период</Text>
              <Text numberOfLines={1} style={{ marginTop: 1, color: theme.text, fontSize: 11.5, fontWeight: '700' }}>
                {period.label}
              </Text>
            </View>
            <ChevronRight size={15} color={theme.muted} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Фильтры отчёта"
            onPress={() => setFiltersOpen(true)}
            style={({ pressed }) => ({
              height: 44,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 12,
              borderWidth: 1,
              borderColor: activeFilterCount ? theme.accent + '65' : theme.border,
              borderRadius: 13,
              backgroundColor: activeFilterCount
                ? theme.accent + '14'
                : pressed
                  ? theme.raised
                  : theme.surface,
              opacity: pressed ? 0.76 : 1
            })}
          >
            <SlidersHorizontal size={16} color={activeFilterCount ? theme.accent : theme.muted} />
            <Text
              style={{
                color: activeFilterCount ? theme.accent : theme.text,
                fontSize: 11.5,
                fontWeight: '700'
              }}
            >
              {activeFilterCount ? `Фильтры · ${activeFilterCount}` : 'Фильтры'}
            </Text>
          </Pressable>
        </View>

        {filterSummary ? (
          <Text numberOfLines={1} style={{ marginTop: -6, color: theme.muted, fontSize: 9.5 }}>
            {filterSummary}
          </Text>
        ) : null}

        {state.error ? <ErrorState message={state.error} retry={state.refresh} /> : null}

        <View
          style={{
            padding: 15,
            borderWidth: 1,
            borderColor: netTone + '3D',
            borderRadius: 18,
            backgroundColor: netTone + '0D'
          }}
        >
          <Text style={{ color: theme.muted, fontSize: 10.5, fontWeight: '600' }}>Чистый результат</Text>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.68}
            style={{
              marginTop: 5,
              color: netTone,
              fontSize: 28,
              lineHeight: 34,
              fontWeight: '800',
              fontVariant: ['tabular-nums']
            }}
          >
            {formatMoneyMinor(report.netMinor, report.currencyCode)}
          </Text>
          <Text style={{ marginTop: 5, color: theme.muted, fontSize: 10, lineHeight: 14 }}>
            {percentChange(report.netChangePercent)} · {report.operationCount} операций
          </Text>

          <View style={{ marginTop: 13, flexDirection: 'row', gap: 8 }}>
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
          </View>
        </View>

        <View
          style={{
            padding: 12,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 14,
            backgroundColor: theme.surface
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ minWidth: 0, flex: 1 }}>
              <Text style={{ color: theme.muted, fontSize: 9.5 }}>Баланс на конец периода</Text>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={{ marginTop: 3, color: theme.text, fontSize: 17, fontWeight: '800' }}
              >
                {optionalMoney(report.balanceEndMinor, report.currencyCode)}
              </Text>
            </View>
            <Text
              numberOfLines={1}
              style={{
                maxWidth: '42%',
                color:
                  report.balanceChangeMinor == null
                    ? theme.muted
                    : report.balanceChangeMinor < 0
                      ? expenseTone
                      : incomeTone,
                fontSize: 11,
                fontWeight: '800',
                textAlign: 'right'
              }}
            >
              {report.balanceChangeMinor == null
                ? '—'
                : `${report.balanceChangeMinor >= 0 ? '+' : ''}${formatMoneyMinor(
                    report.balanceChangeMinor,
                    report.currencyCode
                  )}`}
            </Text>
          </View>
          <Text style={{ marginTop: 5, color: theme.muted, fontSize: 9.5 }}>
            На начало: {optionalMoney(report.balanceStartMinor, report.currencyCode)}
          </Text>
        </View>

        {report.missingRateCurrencies.length ? (
          <ErrorState message={`Не хватает текущих курсов: ${report.missingRateCurrencies.join(', ')}`} />
        ) : null}
        {report.comparisonMissingRateCurrencies.length ? (
          <ErrorState
            message={`Для сравнения не хватает курсов: ${report.comparisonMissingRateCurrencies.join(', ')}`}
          />
        ) : null}

        <View style={{ gap: 8 }}>
          <SectionHeader
            title="Главное за период"
            subtitle="Самые важные выводы без лишних цифр"
            icon={Activity}
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <InsightCard
              label="Главная статья расходов"
              value={
                topExpense
                  ? `${topExpense.label} · ${formatMoneyMinor(topExpense.amountMinor, report.currencyCode)}`
                  : 'Расходов нет'
              }
              hint={topExpense ? `${Math.round(topExpense.sharePercent)}% всех расходов` : undefined}
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
                  ? `${peakExpensePoint.label} · ${formatMoneyMinor(
                      peakExpensePoint.expenseMinor,
                      report.currencyCode
                    )}`
                  : 'Расходов нет'
              }
              hint={`Крупнейшая трата: ${formatMoneyMinor(report.largestExpenseMinor, report.currencyCode)}`}
              icon={CalendarDays}
              tone={expenseTone}
            />
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <SectionHeader title="Графики" subtitle="Динамика и структура денег" icon={TrendingUp} />
          <FinanceReportCharts
            reportType={reportType}
            currencyCode={report.currencyCode}
            timeline={report.timeline}
            expenseByTag={report.expenseByTag}
            incomeByTag={report.incomeByTag}
            transferFlows={report.transferFlows}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Открыть подробную статистику"
          onPress={() => setDetailsOpen(true)}
          style={({ pressed }) => ({
            minHeight: 58,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingHorizontal: 13,
            paddingVertical: 10,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 14,
            backgroundColor: pressed ? theme.raised : theme.surface,
            opacity: pressed ? 0.76 : 1
          })}
        >
          <View
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
          </View>
          <View style={{ minWidth: 0, flex: 1 }}>
            <Text style={{ color: theme.text, fontSize: 12.5, fontWeight: '800' }}>
              Подробная статистика
            </Text>
            <Text numberOfLines={1} style={{ marginTop: 2, color: theme.muted, fontSize: 9.5 }}>
              Средние значения, динамика, счета, переводы и лимиты
            </Text>
          </View>
          <ChevronRight size={16} color={theme.muted} />
        </Pressable>
      </ScrollView>

      <AppDialog
        open={periodOpen}
        onOpenChange={setPeriodOpen}
        title="Период отчёта"
        description="Выберите готовый период или задайте собственный диапазон"
        icon="calendar"
        presentation="sheet"
        footer={<Button label="Закрыть" onPress={() => setPeriodOpen(false)} />}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: 16, padding: 14, paddingBottom: 24 }}
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {reportRangeOptions.map((option) => (
              <ReportChip
                key={option.key}
                label={option.label}
                selected={reportRange === option.key}
                grow
                onPress={() => chooseRange(option.key)}
              />
            ))}
          </View>

          {reportRange === 'custom' ? (
            <View style={{ gap: 9 }}>
              <Label>Свой диапазон</Label>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  accessibilityLabel="Начальная дата отчёта"
                  value={customDraftFrom}
                  onChangeText={setCustomDraftFrom}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="2026-09-01"
                  placeholderTextColor={theme.muted}
                  style={[dateInputStyle, { minWidth: 0, flex: 1 }]}
                />
                <TextInput
                  accessibilityLabel="Конечная дата отчёта"
                  value={customDraftTo}
                  onChangeText={setCustomDraftTo}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="2026-09-30"
                  placeholderTextColor={theme.muted}
                  style={[dateInputStyle, { minWidth: 0, flex: 1 }]}
                />
              </View>
              {customError ? <ErrorState message={customError} /> : null}
              <Button label="Применить диапазон" selected onPress={applyCustomPeriod} />
            </View>
          ) : null}
        </ScrollView>
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
            {hasSecondaryFilters ? <Button label="Сбросить" onPress={resetFilters} /> : null}
            <Button label="Готово" primary onPress={() => setFiltersOpen(false)} />
          </>
        }
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: 18, padding: 14, paddingBottom: 24 }}
        >
          <View style={{ gap: 8 }}>
            <Label>Операции</Label>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
              {reportTypeOptions.map((option) => (
                <ReportChip
                  key={option.key}
                  label={option.label}
                  selected={reportType === option.key}
                  onPress={() => chooseType(option.key)}
                />
              ))}
            </View>
          </View>

          <View style={{ gap: 8 }}>
            <Label>Счёт</Label>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
              <ReportChip
                label="Все счета"
                selected={accountId === 'all'}
                onPress={() => setAccountId('all')}
              />
              {accounts.map((account) => (
                <ReportChip
                  key={account.id}
                  label={`${account.name} · ${account.currencyCode}`}
                  selected={accountId === account.id}
                  onPress={() => setAccountId(account.id)}
                />
              ))}
            </View>
          </View>

          <View style={{ gap: 8 }}>
            <Label>Тег</Label>
            {reportType === 'transfer' ? (
              <Text style={{ color: theme.muted, fontSize: 11.5 }}>
                Для переводов тег не применяется.
              </Text>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
                <ReportChip
                  label="Все теги"
                  selected={validTagId === 'all'}
                  onPress={() => setTagId('all')}
                />
                {availableTags.map((tag) => (
                  <ReportChip
                    key={tag.id}
                    label={tag.name}
                    selected={validTagId === tag.id}
                    onPress={() => setTagId(tag.id)}
                  />
                ))}
              </View>
            )}
          </View>

          <View style={{ gap: 8 }}>
            <Label>Источник</Label>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
              {reportSourceOptions.map((option) => (
                <ReportChip
                  key={option.key}
                  label={option.label}
                  selected={source === option.key}
                  onPress={() => setSource(option.key)}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      </AppDialog>

      <AppDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        title="Подробная статистика"
        description={period.label}
        icon="chart"
        presentation="sheet"
        footer={<Button label="Закрыть" primary onPress={() => setDetailsOpen(false)} />}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: 18, padding: 14, paddingBottom: 24 }}
        >
          <View style={{ gap: 8 }}>
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
          </View>

          <View style={{ gap: 8 }}>
            <SectionHeader title="Последняя динамика" icon={TrendingUp} />
            {report.timeline.length ? (
              report.timeline.slice(-8).map((point) => (
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
          </View>

          <View style={{ gap: 8 }}>
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
          </View>

          <View style={{ gap: 8 }}>
            <SectionHeader title="Переводы" icon={ArrowRightLeft} />
            {report.transferFlows.length ? (
              report.transferFlows.slice(0, 8).map((flow) => (
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
          </View>

          <View style={{ gap: 8 }}>
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
          </View>
        </ScrollView>
      </AppDialog>
    </View>
  )
}
