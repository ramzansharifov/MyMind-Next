import { useCallback, useMemo, useState } from 'react'
import { ScrollView, TextInput, View } from 'react-native'
import type { FinanceAccountSummary, FinanceTagSummary } from '@mymind/contracts/finance'
import { formatMoneyMinor } from '@mymind/core/finance-money'
import type { MobileServices } from '../../app/services'
import { useCollection } from '../../shared/hooks/useCollection'
import { Button, EmptyState, ErrorState, Label, LoadingState, Row } from '../../shared/ui/primitives'
import { useTheme } from '../../shared/ui/theme'
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

export function FinanceReportsView({ api, accounts, tags, baseCurrencyCode }: Props): React.JSX.Element {
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
    return <ErrorState message={state.error || 'Не удалось построить отчёт'} retry={state.refresh} />
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

  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12, paddingBottom: 40 }}>
      <Label>Период</Label>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {reportRangeOptions.map((option) => (
          <Button
            key={option.key}
            label={option.label}
            selected={reportRange === option.key}
            onPress={() => {
              setCustomError('')
              setReportRange(option.key)
            }}
          />
        ))}
      </View>

      {reportRange === 'custom' ? (
        <View style={{ gap: 10 }}>
          <Label muted>Формат даты: ГГГГ-ММ-ДД</Label>
          <TextInput
            accessibilityLabel="Начальная дата отчёта"
            value={customDraftFrom}
            onChangeText={setCustomDraftFrom}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="2026-09-01"
            placeholderTextColor={theme.muted}
            style={dateInputStyle}
          />
          <TextInput
            accessibilityLabel="Конечная дата отчёта"
            value={customDraftTo}
            onChangeText={setCustomDraftTo}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="2026-09-08"
            placeholderTextColor={theme.muted}
            style={dateInputStyle}
          />
          {customError ? <ErrorState message={customError} /> : null}
          <Button label="Применить диапазон" selected onPress={applyCustomPeriod} />
        </View>
      ) : null}

      <Label>Операции</Label>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {reportTypeOptions.map((option) => (
          <Button
            key={option.key}
            label={option.label}
            selected={reportType === option.key}
            onPress={() => chooseType(option.key)}
          />
        ))}
      </View>

      <Label>Счёт</Label>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Button label="Все счета" selected={accountId === 'all'} onPress={() => setAccountId('all')} />
        {accounts.map((account) => (
          <Button
            key={account.id}
            label={`${account.name} · ${account.currencyCode}`}
            selected={accountId === account.id}
            onPress={() => setAccountId(account.id)}
          />
        ))}
      </ScrollView>

      <Label>Тег</Label>
      {reportType === 'transfer' ? (
        <Label muted>Для переводов тег не применяется.</Label>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Button label="Все теги" selected={validTagId === 'all'} onPress={() => setTagId('all')} />
          {availableTags.map((tag) => (
            <Button
              key={tag.id}
              label={tag.name}
              selected={validTagId === tag.id}
              onPress={() => setTagId(tag.id)}
            />
          ))}
        </ScrollView>
      )}

      <Label>Источник</Label>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {reportSourceOptions.map((option) => (
          <Button
            key={option.key}
            label={option.label}
            selected={source === option.key}
            onPress={() => setSource(option.key)}
          />
        ))}
      </View>
      {hasSecondaryFilters ? <Button label="Сбросить фильтры" onPress={resetFilters} /> : null}
      {state.error ? <ErrorState message={state.error} retry={state.refresh} /> : null}

      <Row title={period.label} subtitle={`${report.operationCount} операций · ${report.currencyCode}`} />
      <Row
        title={`Баланс: ${optionalMoney(report.balanceEndMinor, report.currencyCode)}`}
        subtitle={`На начало: ${optionalMoney(report.balanceStartMinor, report.currencyCode)} · изменение: ${optionalMoney(report.balanceChangeMinor, report.currencyCode)}`}
      />
      <Row
        title={`Доходы ${formatMoneyMinor(report.incomeMinor, report.currencyCode)}`}
        subtitle={`Расходы ${formatMoneyMinor(report.expenseMinor, report.currencyCode)} · чистый поток ${formatMoneyMinor(report.netMinor, report.currencyCode)}`}
      />
      <Row
        title={`${report.incomeCount} доходов · ${report.expenseCount} расходов · ${report.transferCount} переводов`}
        subtitle={`Оборот переводов: ${formatMoneyMinor(report.transferVolumeMinor, report.currencyCode)}`}
      />
      <Row
        title={`Средний доход ${formatMoneyMinor(report.averageIncomeMinor, report.currencyCode)}`}
        subtitle={`Средний расход ${formatMoneyMinor(report.averageExpenseMinor, report.currencyCode)} · в день ${formatMoneyMinor(report.averageDailyExpenseMinor, report.currencyCode)}`}
      />
      <Row
        title={`Крупнейший доход ${formatMoneyMinor(report.largestIncomeMinor, report.currencyCode)}`}
        subtitle={`Крупнейший расход ${formatMoneyMinor(report.largestExpenseMinor, report.currencyCode)}`}
      />
      <Row
        title={`Доля сбережений: ${report.savingsRatePercent === null ? 'нет данных' : `${Math.round(report.savingsRatePercent * 10) / 10}%`}`}
        subtitle={`К прошлому периоду: доход ${percentChange(report.incomeChangePercent)} · расход ${percentChange(report.expenseChangePercent)} · итог ${percentChange(report.netChangePercent)}`}
      />
      {report.missingRateCurrencies.length ? (
        <ErrorState message={`Не хватает текущих курсов: ${report.missingRateCurrencies.join(', ')}`} />
      ) : null}
      {report.comparisonMissingRateCurrencies.length ? (
        <ErrorState
          message={`Для сравнения не хватает курсов: ${report.comparisonMissingRateCurrencies.join(', ')}`}
        />
      ) : null}

      <Label>Динамика</Label>
      {report.timeline.length ? (
        report.timeline.slice(-12).map((point) => (
          <Row
            key={point.key}
            title={`${point.label} · ${formatMoneyMinor(point.netMinor, report.currencyCode)}`}
            subtitle={`Доход ${formatMoneyMinor(point.incomeMinor, report.currencyCode)} · расход ${formatMoneyMinor(point.expenseMinor, report.currencyCode)} · баланс ${optionalMoney(point.balanceMinor, report.currencyCode)}`}
          />
        ))
      ) : (
        <EmptyState text="Нет данных для динамики." />
      )}

      <Label>Расходы по тегам</Label>
      {report.expenseByTag.length ? (
        report.expenseByTag.slice(0, 10).map((item) => (
          <Row
            key={`${item.tagId ?? 'none'}:${item.label}:expense`}
            title={item.label}
            subtitle={`${formatMoneyMinor(item.amountMinor, report.currencyCode)} · ${Math.round(item.sharePercent)}%`}
          />
        ))
      ) : (
        <EmptyState text="Нет расходов за выбранный период." />
      )}

      <Label>Доходы по тегам</Label>
      {report.incomeByTag.length ? (
        report.incomeByTag.slice(0, 10).map((item) => (
          <Row
            key={`${item.tagId ?? 'none'}:${item.label}:income`}
            title={item.label}
            subtitle={`${formatMoneyMinor(item.amountMinor, report.currencyCode)} · ${Math.round(item.sharePercent)}%`}
          />
        ))
      ) : (
        <EmptyState text="Нет доходов за выбранный период." />
      )}

      <Label>Активность по счетам</Label>
      {report.accountActivity.length ? (
        report.accountActivity.map((account) => (
          <Row
            key={account.accountId}
            title={`${account.accountName} · ${formatMoneyMinor(account.netMinor, report.currencyCode)}`}
            subtitle={`${account.operationCount} операций · доход ${formatMoneyMinor(account.incomeMinor, report.currencyCode)} · расход ${formatMoneyMinor(account.expenseMinor, report.currencyCode)} · переводы +${formatMoneyMinor(account.transferInMinor, report.currencyCode)} / −${formatMoneyMinor(account.transferOutMinor, report.currencyCode)}`}
          />
        ))
      ) : (
        <EmptyState text="Нет активности по счетам." />
      )}

      <Label>Переводы</Label>
      {report.transferFlows.length ? (
        report.transferFlows.slice(0, 10).map((flow) => (
          <Row
            key={`${flow.sourceAccountId}:${flow.destinationAccountId}:${flow.sourceCurrencyCode}:${flow.destinationCurrencyCode}`}
            title={`${flow.sourceAccountName} → ${flow.destinationAccountName}`}
            subtitle={`${flow.count} переводов · ${formatMoneyMinor(flow.sourceAmountMinor, flow.sourceCurrencyCode)} → ${formatMoneyMinor(flow.destinationAmountMinor, flow.destinationCurrencyCode)}${flow.convertedAmountMinor === null ? '' : ` · ${formatMoneyMinor(flow.convertedAmountMinor, report.currencyCode)}`}`}
          />
        ))
      ) : (
        <EmptyState text="Переводов за период нет." />
      )}

      <Label>Активные лимиты</Label>
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
    </ScrollView>
  )
}
