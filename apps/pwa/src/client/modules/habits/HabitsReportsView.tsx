import { TextControl } from '../../../ui/browser'
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import type { HabitReportDay } from '@mymind/contracts/habits'
import { localDateKey } from '@mymind/core/habits'
import * as schema from '@mymind/core/validation/habits'
import type { ClientServices } from '../../app/services'
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
import {
  buildHabitHeatmapWeeks,
  defaultHabitCustomRange,
  habitReportPeriod,
  type MobileHabitReportRange
} from './habit-report-periods'
interface Props {
  api: ClientServices['habits']
  groupId: string | null | undefined
  scopeLabel: string
  header?: ReactNode
}
const reportRangeOptions: Array<{
  key: MobileHabitReportRange
  label: string
}> = [
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
    <div
      className="ui-stack"
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
      <span
        className="ui-text"
        style={{
          color: theme.text,
          fontSize: 22,
          fontWeight: 700
        }}
      >
        {value}
      </span>
      <span
        className="ui-text"
        style={{
          color: theme.muted,
          fontSize: 13
        }}
      >
        {label}
      </span>
    </div>
  )
}
export function HabitsReportsView({ api, groupId, scopeLabel, header }: Props): React.JSX.Element {
  const theme = useTheme()
  const today = localDateKey()
  const initialCustom = useMemo(() => defaultHabitCustomRange(today), [today])
  const [reportRange, setReportRange] = useState<MobileHabitReportRange>('30d')
  const [customFrom, setCustomFrom] = useState(initialCustom.from)
  const [customTo, setCustomTo] = useState(initialCustom.to)
  const [customDraftFrom, setCustomDraftFrom] = useState(initialCustom.from)
  const [customDraftTo, setCustomDraftTo] = useState(initialCustom.to)
  const [customError, setCustomError] = useState('')
  const state = useCollection(
    useCallback(() => {
      const period = habitReportPeriod(reportRange, customFrom, customTo, today)
      const input = schema.habitReportInputSchema.parse({
        dateFrom: period.dateFrom,
        dateTo: period.dateTo,
        groupId: typeof groupId === 'string' ? groupId : null,
        ungroupedOnly: groupId === null
      })
      return { period, report: api.getHabitsReport(input) }
    }, [api, customFrom, customTo, groupId, reportRange, today])
  )
  const weeks = useMemo(
    () => (state.data ? buildHabitHeatmapWeeks(state.data.report.days) : []),
    [state.data]
  )
  const applyCustomPeriod = (): void => {
    try {
      habitReportPeriod('custom', customDraftFrom, customDraftTo, today)
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
    return (
      <ErrorState message={state.error || 'Не удалось построить отчёт'} retry={state.refresh} />
    )
  }
  const { period, report } = state.data
  return (
    <div className="ui-scroll">
      <div
        className="ui-stack ui-scroll-content"
        style={{
          gap: 12,
          paddingBottom: 40
        }}
      >
        {header}
        <Label>Период</Label>
        <div
          className="ui-stack"
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8
          }}
        >
          {reportRangeOptions.map((option) => (
            <Button
              key={option.key}
              label={option.label}
              selected={reportRange === option.key}
              onClick={() => {
                setCustomError('')
                setReportRange(option.key)
              }}
            />
          ))}
        </div>

        {reportRange === 'custom' ? (
          <div
            className="ui-stack"
            style={{
              gap: 10
            }}
          >
            <Label muted>Формат даты: ГГГГ-ММ-ДД · максимум 730 дней · не позже сегодня</Label>
            <TextControl
              aria-label={'Начальная дата отчёта привычек'}
              value={customDraftFrom}
              onValueChange={setCustomDraftFrom}
              autoCapitalize={'none'}
              autoCorrect={'off'}
              placeholder={'2026-09-01'}
              placeholderColor={theme.muted}
              style={dateInputStyle}
            ></TextControl>
            <TextControl
              aria-label={'Конечная дата отчёта привычек'}
              value={customDraftTo}
              onValueChange={setCustomDraftTo}
              autoCapitalize={'none'}
              autoCorrect={'off'}
              placeholder={'2026-09-08'}
              placeholderColor={theme.muted}
              style={dateInputStyle}
            ></TextControl>
            {customError ? <ErrorState message={customError} /> : null}
            <Button label="Применить диапазон" selected onClick={applyCustomPeriod} />
          </div>
        ) : null}

        {state.error ? <ErrorState message={state.error} retry={state.refresh} /> : null}

        <Row
          title={period.label}
          subtitle={`${scopeLabel} · ${report.dateFrom} — ${report.dateTo}`}
        >
          <Button label="Обновить" onClick={state.refresh} />
        </Row>

        <Label title>{report.summary.completionRate}% выполнено</Label>
        <div
          className="ui-stack"
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 10
          }}
        >
          <MetricCard label="Запланировано" value={String(report.summary.scheduled)} />
          <MetricCard label="Выполнено" value={String(report.summary.completed)} />
          <MetricCard label="Пропущено" value={String(report.summary.missed)} />
          <MetricCard label="Осознанно пропущено" value={String(report.summary.skipped)} />
          <MetricCard label="Ожидает сегодня/в будущем" value={String(report.summary.pending)} />
          <MetricCard label="Процент выполнения" value={`${report.summary.completionRate}%`} />
        </div>

        <Label>Календарь активности</Label>
        {report.days.length ? (
          <div
            className="ui-stack"
            style={{
              flexDirection: 'row',
              gap: 8,
              alignItems: 'flex-start'
            }}
          >
            <div
              className="ui-stack"
              style={{
                gap: 4,
                paddingTop: 1
              }}
            >
              {weekdays.map((weekday) => (
                <span
                  className="ui-text"
                  key={weekday}
                  style={{
                    width: 22,
                    height: 14,
                    color: theme.muted,
                    fontSize: 9,
                    lineHeight: '14px'
                  }}
                >
                  {weekday}
                </span>
              ))}
            </div>
            <div className="ui-scroll" data-horizontal={true}>
              <div
                className="ui-stack ui-scroll-content"
                style={{
                  paddingRight: 8,
                  flexDirection: 'row'
                }}
              >
                <div
                  className="ui-stack"
                  style={{
                    flexDirection: 'row',
                    gap: 4
                  }}
                >
                  {weeks.map((week, weekIndex) => (
                    <div
                      className="ui-stack"
                      key={`week-${weekIndex}`}
                      style={{
                        gap: 4
                      }}
                    >
                      {week.map((day, dayIndex) =>
                        day ? (
                          <div
                            className="ui-stack"
                            key={day.date}
                            aria-label={`${day.date}: ${day.completionRate}% выполнено, ${day.completed} выполнено, ${day.missed} пропущено, ${day.skipped} осознанно пропущено`}
                            style={{
                              width: 14,
                              height: 14,
                              borderRadius: 3,
                              backgroundColor: theme.accent,
                              opacity: heatmapOpacity(day)
                            }}
                          ></div>
                        ) : (
                          <div
                            className="ui-stack"
                            key={`empty-${weekIndex}-${dayIndex}`}
                            style={{
                              width: 14,
                              height: 14
                            }}
                          ></div>
                        )
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState text="Нет календарных данных за выбранный период." />
        )}
        <div
          className="ui-stack"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Label muted>Меньше</Label>
          {[0.18, 0.38, 0.58, 0.78, 1].map((opacity) => (
            <div
              className="ui-stack"
              key={opacity}
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                backgroundColor: theme.accent,
                opacity: opacity
              }}
            ></div>
          ))}
          <Label muted>Больше</Label>
        </div>

        <Label>Статистика по привычкам</Label>
        {report.habits.length ? (
          report.habits.map((item) => (
            <Row
              key={item.habitId}
              title={`${item.title} · ${item.completionRate}%`}
              subtitle={`Выполнено ${item.completed}/${item.scheduled} · серия ${item.currentStreak} · лучшая ${item.bestStreak} · пропущено ${item.missed} · осознанно пропущено ${item.skipped} · ожидает ${item.pending} · всего ${totalValueLabel(item)}`}
            />
          ))
        ) : (
          <EmptyState text="Нет привычек в выбранной области отчёта." />
        )}
      </div>
    </div>
  )
}
