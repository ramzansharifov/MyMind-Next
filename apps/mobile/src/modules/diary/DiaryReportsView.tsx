import { useCallback, useMemo, useState } from 'react'
import { FlatList, Text, View } from 'react-native'
import type { DiaryReport, DiaryReportPoint } from '@mymind/contracts/diary'
import { diaryDayKeySchema } from '@mymind/core/validation/diary'
import { localDateKey } from '@mymind/core/habits'
import { useServices } from '../../app/context'
import { useCollection } from '../../shared/hooks/useCollection'
import { Button, EmptyState, ErrorState, LoadingState, Row } from '../../shared/ui/primitives'
import { FormSheet } from '../../shared/ui/FormSheet'
import { textField, type FormSpec } from '../../shared/ui/form-model'
import { useTheme } from '../../shared/ui/theme'
import {
  diaryMoodMeta,
  diaryReportPeriodLabels,
  diaryReportRange,
  expandDiaryReportTimeline,
  type DiaryReportPeriod
} from './diary-presentation'

const REPORT_PERIODS: DiaryReportPeriod[] = [
  'week',
  'month',
  'three-months',
  'year',
  'all',
  'custom'
]

export function DiaryReportsView({
  diaryId,
  onOpenDay
}: {
  diaryId: string
  onOpenDay(dayKey: string): void
}): React.JSX.Element {
  const { diary: api } = useServices()
  const today = localDateKey()
  const defaultRange = useMemo(() => diaryReportRange('month', '', '', today), [today])
  const [period, setPeriod] = useState<DiaryReportPeriod>('month')
  const [customFrom, setCustomFrom] = useState(defaultRange.fromDay ?? today)
  const [customTo, setCustomTo] = useState(defaultRange.toDay ?? today)
  const [form, setForm] = useState<FormSpec | null>(null)

  const range = useMemo(
    () => diaryReportRange(period, customFrom, customTo, today),
    [customFrom, customTo, period, today]
  )
  const state = useCollection(
    useCallback(() => api.getDiaryReport({ diaryId, ...range }), [api, diaryId, range])
  )

  const openCustomPeriod = (): void => {
    setForm({
      title: 'Свой период отчёта',
      initial: { fromDay: customFrom, toDay: customTo },
      fields: [
        textField('fromDay', 'С даты', 'text', 'ГГГГ-ММ-ДД'),
        textField('toDay', 'По дату', 'text', 'ГГГГ-ММ-ДД')
      ],
      save: (values) => {
        const fromDay = diaryDayKeySchema.parse(values.fromDay)
        const toDay = diaryDayKeySchema.parse(values.toDay)
        diaryReportRange('custom', fromDay, toDay, today)
        setCustomFrom(fromDay)
        setCustomTo(toDay)
        setPeriod('custom')
      }
    })
  }

  if (state.loading && !state.data) return <LoadingState />
  if (state.error && !state.data) return <ErrorState message={state.error} retry={state.refresh} />

  const report = state.data
  if (!report) return <EmptyState text="Для отчёта пока недостаточно данных." />

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={report.timeline}
        keyExtractor={(item) => item.dayKey}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListHeaderComponent={
          <DiaryReportHeader
            report={report}
            period={period}
            customFrom={customFrom}
            customTo={customTo}
            onSelectPeriod={(nextPeriod) => {
              if (nextPeriod === 'custom') openCustomPeriod()
              else setPeriod(nextPeriod)
            }}
          />
        }
        ListEmptyComponent={<EmptyState text="За выбранный период пока нет страниц." />}
        ListFooterComponent={
          state.error ? <ErrorState message={state.error} retry={state.refresh} /> : null
        }
        renderItem={({ item }) => {
          const mood = diaryMoodMeta(item.mood)
          return (
            <Row
              title={item.dayKey}
              subtitle={`${item.entryCount} записей${mood ? ` · ${mood.emoji} ${mood.label}` : ''}`}
              onPress={() => onOpenDay(item.dayKey)}
            />
          )
        }}
      />
      {form ? <FormSheet spec={form} close={() => setForm(null)} /> : null}
    </View>
  )
}

function DiaryReportHeader({
  report,
  period,
  customFrom,
  customTo,
  onSelectPeriod
}: {
  report: DiaryReport
  period: DiaryReportPeriod
  customFrom: string
  customTo: string
  onSelectPeriod(period: DiaryReportPeriod): void
}): React.JSX.Element {
  const theme = useTheme()
  const activityTimeline = useMemo(
    () => expandDiaryReportTimeline(report.timeline, report.fromDay, report.toDay),
    [report.fromDay, report.timeline, report.toDay]
  )
  const regularity =
    activityTimeline.length > 0
      ? Math.round((report.activeDays / activityTimeline.length) * 100)
      : 0

  return (
    <View style={{ gap: 14, marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {REPORT_PERIODS.map((option) => (
          <Button
            key={option}
            label={diaryReportPeriodLabels[option]}
            selected={period === option}
            onPress={() => onSelectPeriod(option)}
          />
        ))}
      </View>

      {period === 'custom' ? (
        <Text style={{ color: theme.muted, fontSize: 12 }}>
          {customFrom} → {customTo}
        </Text>
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <Metric
          label="Страниц"
          value={String(report.pageCount)}
          hint={`${report.activeDays} активных`}
        />
        <Metric
          label="Записей"
          value={String(report.entryCount)}
          hint={`${report.averageEntriesPerActiveDay.toFixed(1)} в активный день`}
        />
        <Metric
          label="Настроение"
          value={
            report.averageMoodScore == null ? '—' : `${report.averageMoodScore.toFixed(1)} / 5`
          }
          hint={`${report.moodDays} дней с оценкой`}
        />
        <Metric label="Регулярность" value={`${regularity}%`} hint="доля дней с записями" />
      </View>

      <View
        style={{
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 16,
          backgroundColor: theme.surface,
          padding: 14,
          gap: 10
        }}
      >
        <Text style={{ color: theme.text, fontSize: 15, fontWeight: '800' }}>
          Распределение настроения
        </Text>
        {report.moodBreakdown.map((item) => {
          const meta = diaryMoodMeta(item.mood)
          return (
            <View key={item.mood} style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
              <Text style={{ width: 112, color: theme.text, fontSize: 12 }} numberOfLines={1}>
                {meta?.emoji} {meta?.label}
              </Text>
              <View
                style={{
                  flex: 1,
                  height: 7,
                  borderRadius: 99,
                  overflow: 'hidden',
                  backgroundColor: theme.raised
                }}
              >
                <View
                  style={{
                    width: `${Math.max(0, Math.min(100, item.sharePercent))}%`,
                    height: '100%',
                    borderRadius: 99,
                    backgroundColor: theme.accent
                  }}
                />
              </View>
              <Text style={{ width: 26, textAlign: 'right', color: theme.muted, fontSize: 11 }}>
                {item.count}
              </Text>
            </View>
          )
        })}
      </View>

      <DiaryMoodTrend points={activityTimeline} />
      <DiaryActivityHeatmap points={activityTimeline} />

      <Text style={{ color: theme.muted, fontSize: 12, fontWeight: '700' }}>Дни периода</Text>
    </View>
  )
}

function Metric({
  label,
  value,
  hint
}: {
  label: string
  value: string
  hint: string
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <View
      style={{
        minWidth: 145,
        flexGrow: 1,
        flexBasis: '46%',
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 15,
        backgroundColor: theme.surface,
        padding: 13,
        gap: 4
      }}
    >
      <Text style={{ color: theme.muted, fontSize: 11 }}>{label}</Text>
      <Text style={{ color: theme.text, fontSize: 19, fontWeight: '800' }}>{value}</Text>
      <Text style={{ color: theme.muted, fontSize: 10 }}>{hint}</Text>
    </View>
  )
}

function DiaryMoodTrend({ points }: { points: DiaryReportPoint[] }): React.JSX.Element {
  const theme = useTheme()
  const hasMood = points.some((point) => point.moodScore !== null)

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 16,
        backgroundColor: theme.surface,
        padding: 14,
        gap: 10
      }}
    >
      <Text style={{ color: theme.text, fontSize: 15, fontWeight: '800' }}>
        Динамика настроения
      </Text>
      {!hasMood ? (
        <Text style={{ color: theme.muted, fontSize: 12 }}>Настроение пока не отмечалось.</Text>
      ) : (
        <View style={{ gap: 6 }}>
          <FlatList
            horizontal
            data={points}
            keyExtractor={(point) => point.dayKey}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ alignItems: 'flex-end', gap: 5, minHeight: 116 }}
            renderItem={({ item }) => {
              const score = item.moodScore
              const meta = diaryMoodMeta(item.mood)
              return (
                <View
                  accessibilityLabel={
                    score === null
                      ? `${item.dayKey}: настроение не отмечено`
                      : `${item.dayKey}: ${meta?.label ?? score}, ${score} из 5`
                  }
                  style={{
                    width: 16,
                    height: 112,
                    justifyContent: 'flex-end',
                    alignItems: 'center'
                  }}
                >
                  {score === null ? (
                    <View
                      style={{
                        width: 3,
                        height: 3,
                        borderRadius: 2,
                        backgroundColor: theme.border
                      }}
                    />
                  ) : (
                    <View
                      style={{
                        width: 10,
                        height: Math.max(12, score * 19),
                        borderRadius: 5,
                        backgroundColor: theme.accent,
                        opacity: 0.32 + score * 0.12
                      }}
                    />
                  )}
                </View>
              )
            }}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: theme.muted, fontSize: 10 }}>😞 Плохое</Text>
            <Text style={{ color: theme.muted, fontSize: 10 }}>😄 Отличное</Text>
          </View>
        </View>
      )}
    </View>
  )
}

function DiaryActivityHeatmap({ points }: { points: DiaryReportPoint[] }): React.JSX.Element {
  const theme = useTheme()
  const weeks = useMemo(() => {
    const result: DiaryReportPoint[][] = []
    for (let index = 0; index < points.length; index += 7)
      result.push(points.slice(index, index + 7))
    return result
  }, [points])

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 16,
        backgroundColor: theme.surface,
        padding: 14,
        gap: 10
      }}
    >
      <Text style={{ color: theme.text, fontSize: 15, fontWeight: '800' }}>
        Календарь активности
      </Text>
      {weeks.length === 0 ? (
        <Text style={{ color: theme.muted, fontSize: 12 }}>
          За выбранный период пока нет страниц.
        </Text>
      ) : (
        <FlatList
          horizontal
          data={weeks}
          keyExtractor={(_, index) => `week-${index}`}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 4 }}
          renderItem={({ item: week }) => (
            <View style={{ gap: 4 }}>
              {week.map((point) => {
                const intensity = Math.min(4, point.entryCount)
                return (
                  <View
                    key={point.dayKey}
                    accessibilityLabel={`${point.dayKey}: ${point.entryCount} записей`}
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 4,
                      borderWidth: 1,
                      borderColor: theme.border,
                      backgroundColor:
                        intensity === 0
                          ? theme.raised
                          : theme.accent +
                            (intensity === 1
                              ? '35'
                              : intensity === 2
                                ? '59'
                                : intensity === 3
                                  ? '82'
                                  : 'B8')
                    }}
                  />
                )
              })}
            </View>
          )}
        />
      )}
      <Text style={{ color: theme.muted, fontSize: 10 }}>Слева старые дни · справа новые</Text>
    </View>
  )
}
