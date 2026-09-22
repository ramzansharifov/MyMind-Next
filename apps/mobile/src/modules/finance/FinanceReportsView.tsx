import { useCallback, useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { SlidersHorizontal } from 'lucide-react-native'
import type { FinanceAccountSummary, FinanceTagSummary } from '@mymind/contracts/finance'
import { formatMoneyMinor } from '@mymind/core/finance-money'
import type { MobileServices } from '../../app/services'
import { useCollection } from '../../shared/hooks/useCollection'
import {
  Button,
  EmptyState,
  ErrorState,
  Label,
  LoadingState,
  Row
} from '../../shared/ui/primitives'
import { useTheme } from '../../shared/ui/theme'
import { AppDialog } from '../../shared/ui/AppDialog'
import { FinanceReportCharts } from './FinanceReportCharts'
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
  { key: 'all', label: 'Все' },
  { key: 'income', label: 'Доходы' },
  { key: 'expense', label: 'Расходы' },
  { key: 'transfer', label: 'Переводы' }
]

const reportSourceOptions: Array<{ key: MobileFinanceReportSource; label: string }> = [
  { key: 'all', label: 'Все' },
  { key: 'template', label: 'Из шаблонов' },
  { key: 'manual', label: 'Вручную' }
]

function optionalMoney(value: number | null, currencyCode: string): string {
  return value === null ? 'нет данных' : formatMoneyMinor(value, currencyCode)
}

function percentChange(value: number | null): string {
  if (value === null) return 'нет базы сравнения'
  const rounded = Math.round(value * 10) / 10
  return `${rounded > 0 ? '+' : ''}${rounded}%`
}


function ReportChip({
  label,
  selected,
  onPress
}: {
  label: string
  selected: boolean
  onPress(): void
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        height: 38,
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
      <Text style={{ color: selected ? theme.accent : theme.text, fontSize: 11.5, fontWeight: '700' }}>
        {label}
      </Text>
    </Pressable>
  )
}

function ReportMetricCard({
  label,
  value,
  tone
}: {
  label: string
  value: string
  tone?: string
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <View
      style={{
        width: '48.5%',
        minHeight: 82,
        padding: 12,
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 14,
        backgroundColor: theme.surface
      }}
    >
      <Text style={{ color: theme.muted, fontSize: 10.5 }}>{label}</Text>
      <Text
        numberOfLines={2}
        adjustsFontSizeToFit
        style={{ marginTop: 8, color: tone ?? theme.text, fontSize: 16, lineHeight: 21, fontWeight: '800' }}
      >
        {value}
      </Text>
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

  const applyCustomPeriod = (): void => {
    try {
      financeReportPeriod('custom', customDraftFrom, customDraftTo)
      setCustomError('')
      setCustomFrom(customDraftFrom.trim())
      setCustomTo(customDraftTo.trim())
      setReportRange('custom')
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
  const dateInputStyle = {
    minHeight: 48,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    color: theme.text,
    paddingHorizontal: 14,
    borderRadius: 12,
    fontSize: 16
  } as const

  const activeFilterCount = [
    reportType !== 'all',
    accountId !== 'all',
    validTagId !== 'all',
    source !== 'all'
  ].filter(Boolean).length
  const incomeTone = '#34d399'
  const expenseTone = '#f87171'

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: 14, paddingBottom: 96 }}
      >
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ minWidth: 0, flex: 1 }}>
              <Text style={{ color: theme.text, fontSize: 14, fontWeight: '700' }}>Период</Text>
              <Text style={{ marginTop: 2, color: theme.muted, fontSize: 10.5 }}>
                {period.label}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Фильтры отчёта"
              onPress={() => setFiltersOpen(true)}
              style={({ pressed }) => ({
                height: 38,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 11,
                borderWidth: 1,
                borderColor: activeFilterCount ? theme.accent + '65' : theme.border,
                borderRadius: 12,
                backgroundColor: activeFilterCount
                  ? theme.accent + '14'
                  : pressed
                    ? theme.raised
                    : theme.surface,
                opacity: pressed ? 0.74 : 1
              })}
            >
              <SlidersHorizontal size={15} color={activeFilterCount ? theme.accent : theme.muted} />
              <Text
                style={{
                  color: activeFilterCount ? theme.accent : theme.text,
                  fontSize: 11.5,
                  fontWeight: '700'
                }}
              >
                Фильтры{activeFilterCount ? ` · ${activeFilterCount}` : ''}
              </Text>
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 7, paddingRight: 4 }}
          >
            {reportRangeOptions.map((option) => (
              <ReportChip
                key={option.key}
                label={option.label}
                selected={reportRange === option.key}
                onPress={() => {
                  setCustomError('')
                  setReportRange(option.key)
                }}
              />
            ))}
          </ScrollView>
        </View>

        {reportRange === 'custom' ? (
          <View
            style={{
              gap: 9,
              padding: 12,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 14,
              backgroundColor: theme.surface
            }}
          >
            <Text style={{ color: theme.text, fontSize: 12.5, fontWeight: '700' }}>
              Свой диапазон
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                accessibilityLabel="Начальная дата отчёта"
                value={customDraftFrom}
                onChangeText={setCustomDraftFrom}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="2026-09-01"
                placeholderTextColor={theme.muted}
                style={[dateInputStyle, { minWidth: 0, flex: 1, fontSize: 13 }]}
              />
              <TextInput
                accessibilityLabel="Конечная дата отчёта"
                value={customDraftTo}
                onChangeText={setCustomDraftTo}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="2026-09-30"
                placeholderTextColor={theme.muted}
                style={[dateInputStyle, { minWidth: 0, flex: 1, fontSize: 13 }]}
              />
            </View>
            {customError ? <ErrorState message={customError} /> : null}
            <Button label="Применить" selected onPress={applyCustomPeriod} />
          </View>
        ) : null}

        {state.error ? <ErrorState message={state.error} retry={state.refresh} /> : null}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <ReportMetricCard
            label="Доходы"
            value={formatMoneyMinor(report.incomeMinor, report.currencyCode)}
            tone={incomeTone}
          />
          <ReportMetricCard
            label="Расходы"
            value={formatMoneyMinor(report.expenseMinor, report.currencyCode)}
            tone={expenseTone}
          />
          <ReportMetricCard
            label="Чистый поток"
            value={formatMoneyMinor(report.netMinor, report.currencyCode)}
            tone={report.netMinor < 0 ? expenseTone : incomeTone}
          />
          <ReportMetricCard
            label="Операции"
            value={String(report.operationCount)}
          />
        </View>

        <View
          style={{
            gap: 4,
            padding: 12,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 14,
            backgroundColor: theme.surface
          }}
        >
          <Text style={{ color: theme.muted, fontSize: 10.5 }}>Баланс на конец периода</Text>
          <Text style={{ color: theme.text, fontSize: 17, fontWeight: '800' }}>
            {optionalMoney(report.balanceEndMinor, report.currencyCode)}
          </Text>
          <Text style={{ color: theme.muted, fontSize: 10.5, lineHeight: 15 }}>
            На начало {optionalMoney(report.balanceStartMinor, report.currencyCode)} · изменение{' '}
            {optionalMoney(report.balanceChangeMinor, report.currencyCode)}
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
          <Text style={{ color: theme.text, fontSize: 14, fontWeight: '700' }}>Графики</Text>
          <FinanceReportCharts
            reportType={reportType}
            currencyCode={report.currencyCode}
            timeline={report.timeline}
            expenseByTag={report.expenseByTag}
            incomeByTag={report.incomeByTag}
            transferFlows={report.transferFlows}
          />
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ color: theme.text, fontSize: 14, fontWeight: '700' }}>
            Ключевые показатели
          </Text>
          <Row
            title={`Средний доход ${formatMoneyMinor(report.averageIncomeMinor, report.currencyCode)}`}
            subtitle={`Средний расход ${formatMoneyMinor(report.averageExpenseMinor, report.currencyCode)} · в день ${formatMoneyMinor(report.averageDailyExpenseMinor, report.currencyCode)}`}
          />
          <Row
            title={`Крупнейший доход ${formatMoneyMinor(report.largestIncomeMinor, report.currencyCode)}`}
            subtitle={`Крупнейший расход ${formatMoneyMinor(report.largestExpenseMinor, report.currencyCode)}`}
          />
          <Row
            title={`Сбережения: ${report.savingsRatePercent === null ? 'нет данных' : `${Math.round(report.savingsRatePercent * 10) / 10}%`}`}
            subtitle={`К прошлому периоду: доход ${percentChange(report.incomeChangePercent)} · расход ${percentChange(report.expenseChangePercent)} · итог ${percentChange(report.netChangePercent)}`}
          />
          <Row
            title={`${report.incomeCount} доходов · ${report.expenseCount} расходов · ${report.transferCount} переводов`}
            subtitle={`Оборот переводов: ${formatMoneyMinor(report.transferVolumeMinor, report.currencyCode)}`}
          />
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ color: theme.text, fontSize: 14, fontWeight: '700' }}>Динамика</Text>
          {report.timeline.length ? (
            report.timeline.slice(-8).map((point) => (
              <Row
                key={point.key}
                title={`${point.label} · ${formatMoneyMinor(point.netMinor, report.currencyCode)}`}
                subtitle={`Доход ${formatMoneyMinor(point.incomeMinor, report.currencyCode)} · расход ${formatMoneyMinor(point.expenseMinor, report.currencyCode)}`}
              />
            ))
          ) : (
            <EmptyState text="Нет данных для динамики." />
          )}
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ color: theme.text, fontSize: 14, fontWeight: '700' }}>Расходы по тегам</Text>
          {report.expenseByTag.length ? (
            report.expenseByTag.slice(0, 6).map((item) => (
              <Row
                key={`${item.tagId ?? 'none'}:${item.label}:expense`}
                title={item.label}
                subtitle={`${formatMoneyMinor(item.amountMinor, report.currencyCode)} · ${Math.round(item.sharePercent)}%`}
              />
            ))
          ) : (
            <EmptyState text="Нет расходов за выбранный период." />
          )}
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ color: theme.text, fontSize: 14, fontWeight: '700' }}>Доходы по тегам</Text>
          {report.incomeByTag.length ? (
            report.incomeByTag.slice(0, 6).map((item) => (
              <Row
                key={`${item.tagId ?? 'none'}:${item.label}:income`}
                title={item.label}
                subtitle={`${formatMoneyMinor(item.amountMinor, report.currencyCode)} · ${Math.round(item.sharePercent)}%`}
              />
            ))
          ) : (
            <EmptyState text="Нет доходов за выбранный период." />
          )}
        </View>


        <View style={{ gap: 8 }}>
          <Text style={{ color: theme.text, fontSize: 14, fontWeight: '700' }}>Активность по счетам</Text>
          {report.accountActivity.length ? (
            report.accountActivity.map((account) => (
              <Row
                key={account.accountId}
                title={`${account.accountName} · ${formatMoneyMinor(account.netMinor, report.currencyCode)}`}
                subtitle={`${account.operationCount} операций · доход ${formatMoneyMinor(account.incomeMinor, report.currencyCode)} · расход ${formatMoneyMinor(account.expenseMinor, report.currencyCode)}`}
              />
            ))
          ) : (
            <EmptyState text="Нет активности по счетам." />
          )}
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ color: theme.text, fontSize: 14, fontWeight: '700' }}>Переводы</Text>
          {report.transferFlows.length ? (
            report.transferFlows.slice(0, 8).map((flow) => (
              <Row
                key={`${flow.sourceAccountId}:${flow.destinationAccountId}:${flow.sourceCurrencyCode}:${flow.destinationCurrencyCode}`}
                title={`${flow.sourceAccountName} → ${flow.destinationAccountName}`}
                subtitle={`${flow.count} переводов · ${formatMoneyMinor(flow.sourceAmountMinor, flow.sourceCurrencyCode)} → ${formatMoneyMinor(flow.destinationAmountMinor, flow.destinationCurrencyCode)}`}
              />
            ))
          ) : (
            <EmptyState text="Переводов за период нет." />
          )}
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ color: theme.text, fontSize: 14, fontWeight: '700' }}>Активные лимиты</Text>
          {report.limits.length ? (
            report.limits.map((limit) => (
              <Row
                key={limit.id}
                title={`${limit.tagId ? (tags.find((tag) => tag.id === limit.tagId)?.name ?? 'Лимит') : 'Лимит'} · ${formatMoneyMinor(limit.amountMinor, limit.currencyCode)}`}
                subtitle={`${formatMoneyMinor(limit.spentMinor, limit.currencyCode)} использовано · ${Math.round(limit.usagePercent)}%`}
              />
            ))
          ) : (
            <EmptyState text="Активных лимитов для периода нет." />
          )}
        </View>
      </ScrollView>

      <AppDialog
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        title="Фильтры отчёта"
        description="Уточните операции, счёт, тег и источник"
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
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 7 }}
            >
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
            </ScrollView>
          </View>

          <View style={{ gap: 8 }}>
            <Label>Тег</Label>
            {reportType === 'transfer' ? (
              <Text style={{ color: theme.muted, fontSize: 11.5 }}>
                Для переводов тег не применяется.
              </Text>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 7 }}
              >
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
              </ScrollView>
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
    </View>
  )

}
