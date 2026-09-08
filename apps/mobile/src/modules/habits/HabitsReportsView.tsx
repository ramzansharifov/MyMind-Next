import { useCallback, useMemo, useState } from 'react'
import { ScrollView, Text, TextInput, View } from 'react-native'
import type { HabitReportDay } from '@mymind/contracts/habits'
import * as schema from '@mymind/core/validation/habits'
import type { MobileServices } from '../../app/services'
import { useCollection } from '../../shared/hooks/useCollection'
import { Button, EmptyState, ErrorState, Label, LoadingState, Row } from '../../shared/ui/primitives'
import { useTheme } from '../../shared/ui/theme'
import {
  buildHabitHeatmapWeeks,
  defaultHabitCustomRange,
  habitReportPeriod,
  type MobileHabitReportRange
} from './habit-report-periods'

interface Props {
  api: MobileServices['habits']
  groupId: string | null | undefined
  scopeLabel: string
  referenceDate: string
}

const reportRangeOptions: Array<{ key: MobileHabitReportRange; label: string }> = [
  { key: '7d', label: '7 дней' },
  { key: '30d', label: '30 дней' },
  { key: '90d', label: '90 дней' },
  { key: '365d', label: '365 дней' },
  { key: 'custom', label: 'Свой диапазон' }
]

const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

function heatmapOpacity(day: HabitReportDay): number {
  if (day.scheduled === 0) return 0.06
  if (day.completionRate >= 100) return 1
  if (day.completionRate >= 75) return 0.78
  if (day.completionRate >= 50) return 0.58
  if (day.completionRate >= 25) return 0.38
  return 0.18
}

function totalValueLabel(item: {
  trackingType: 'check' | 'count'
  totalValue: number
  unit: string
}): string {
  if (item.trackingType === 'check') return `${item.totalValue} выполнений`
  return `${item.totalValue} ${item.unit || 'ед.'}`.trim()
}

function MetricCard({ label, value }: { label: string; value: string }): React.JSX.Element {
  const theme = useTheme()
  return (
    <View
      style={{
        flexGrow: 1,
        flexBasis: '45%',
        minWidth: 132,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.surface,
        borderRadius: 14,
        padding: 14,
        gap: 4
      }}
    >
      <Text style={{ color: theme.text, fontSize: 22, fontWeight: '700' }}>{value}</Text>
      <Text style={{ color: theme.muted, fontSize: 13 }}>{label}</Text>
    </View>
  )
}

export function HabitsReportsView({
  api,
  groupId,
  scopeLabel,
  referenceDate
}: Props): React.JSX.Element {
  const theme = useTheme()
  const initialCustom = useMemo(() => defaultHabitCustomRange(referenceDate), [referenceDate])
  const [reportRange, setReportRange] = useState<MobileHabitReportRange>('30d')
  const [customFrom, setCustomFrom] = useState(initialCustom.from)
  const [customTo, setCustomTo] = useState(initialCustom.to)
  const [customDraftFrom, setCustomDraftFrom] = useState(initialCustom.from)
  const [customDraftTo, setCustomDraftTo] = useState(initialCustom.to)
  const [customError, setCustomError] = useState('')

  const state = useCollection(
    useCallback(() => {
      const period = habitReportPeriod(reportRange, customFrom, customTo, referenceDate)
      const input = schema.habitReportInputSchema.parse({
        dateFrom: period.dateFrom,
        dateTo: period.dateTo,
        groupId: typeof groupId === 'string' ? groupId : null,
        ungroupedOnly: groupId === null
      })
      return { period, report: api.getHabitsReport(input) }
    }, [api, customFrom, customTo, groupId, referenceDate, reportRange])
  )

  const weeks = useMemo(
    () => (state.data ? buildHabitHeatmapWeeks(state.data.report.days) : []),
    [state.data]
  )

  const applyCustomPeriod = (): void => {
    try {
      habitReportPeriod('custom', customDraftFrom, customDraftTo, referenceDate)
      const nextFrom = customDraftFrom.trim()
      const nextTo = customDraftTo.trim()
      setCustomError('')
      setCustomFrom(nextFrom)
      setCustomTo(nextTo)
      setReportRange('custom')
      if (reportRange === 'custom' && customFrom === nextFrom && customTo === nextTo) {
        state.refresh()
      }
    } catch (reason) {
      setCustomError(reason instanceof Error ? reason.message : 'Не удалось применить период')
    }
  }

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

  if (state.loading && !state.data) return <LoadingState />
  if (!state.data) {
    return <ErrorState message={state.error || 'Не удалось построить отчёт'} retry={state.refresh} />
  }

  const { period, report } = state.data

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ gap: 12, paddingBottom: 40 }}
    >
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
          <Label muted>Формат даты: ГГГГ-ММ-ДД · максимум 730 дней</Label>
          <TextInput
            accessibilityLabel="Начальная дата отчёта привычек"
            value={customDraftFrom}
            onChangeText={setCustomDraftFrom}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="2026-09-01"
            placeholderTextColor={theme.muted}
            style={dateInputStyle}
          />
          <TextInput
            accessibilityLabel="Конечная дата отчёта привычек"
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

      {state.error ? <ErrorState message={state.error} retry={state.refresh} /> : null}

      <Row
        title={period.label}
        subtitle={`${scopeLabel} · ${report.dateFrom} — ${report.dateTo}`}
      >
        <Button label="Обновить" onPress={state.refresh} />
      </Row>

      <Label title>{report.summary.completionRate}% выполнено</Label>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <MetricCard label="Запланировано" value={String(report.summary.scheduled)} />
        <MetricCard label="Выполнено" value={String(report.summary.completed)} />
        <MetricCard label="Пропущено" value={String(report.summary.skipped)} />
        <MetricCard label="Не выполнено" value={String(report.summary.missed)} />
        <MetricCard label="Ожидает сегодня/в будущем" value={String(report.summary.pending)} />
        <MetricCard label="Процент выполнения" value={`${report.summary.completionRate}%`} />
      </View>

      <Label>Календарь активности</Label>
      {report.days.length ? (
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
          <View style={{ gap: 4, paddingTop: 1 }}>
            {weekdays.map((weekday) => (
              <Text
                key={weekday}
                style={{ width: 22, height: 14, color: theme.muted, fontSize: 9, lineHeight: 14 }}
              >
                {weekday}
              </Text>
            ))}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 8 }}
          >
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {weeks.map((week, weekIndex) => (
                <View key={`week-${weekIndex}`} style={{ gap: 4 }}>
                  {week.map((day, dayIndex) =>
                    day ? (
                      <View
                        key={day.date}
                        accessible
                        accessibilityLabel={`${day.date}: ${day.completionRate}% выполнено, ${day.completed} выполнено, ${day.missed} не выполнено, ${day.skipped} пропущено`}
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: 3,
                          backgroundColor: theme.accent,
                          opacity: heatmapOpacity(day)
                        }}
                      />
                    ) : (
                      <View key={`empty-${weekIndex}-${dayIndex}`} style={{ width: 14, height: 14 }} />
                    )
                  )}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      ) : (
        <EmptyState text="Нет календарных данных за выбранный период." />
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Label muted>Меньше</Label>
        {[0.18, 0.38, 0.58, 0.78, 1].map((opacity) => (
          <View
            key={opacity}
            style={{
              width: 12,
              height: 12,
              borderRadius: 3,
              backgroundColor: theme.accent,
              opacity
            }}
          />
        ))}
        <Label muted>Больше</Label>
      </View>

      <Label>Статистика по привычкам</Label>
      {report.habits.length ? (
        report.habits.map((item) => (
          <Row
            key={item.habitId}
            title={`${item.title} · ${item.completionRate}%`}
            subtitle={`Выполнено ${item.completed}/${item.scheduled} · серия ${item.currentStreak} · лучшая ${item.bestStreak} · пропущено ${item.skipped} · не выполнено ${item.missed} · ожидает ${item.pending} · всего ${totalValueLabel(item)}`}
          />
        ))
      ) : (
        <EmptyState text="Нет привычек в выбранной области отчёта." />
      )}
    </ScrollView>
  )
}
