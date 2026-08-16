import { BarChart3, CheckCircle2, Flame, SkipForward, TriangleAlert } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import type { HabitGroupRecord, HabitReport } from '../../../../../shared/contracts/habits'
import { cn } from '../../../shared/lib/cn'
import { AppSelect } from '../../../shared/ui/AppSelect'
import { habitsClient } from '../api/habits-client'
import { habitRepeatLabel } from '../habit-options'
import { addDays, formatHabitDate, localDateKey } from '../habit-schedule'

interface HabitReportsProps {
  groups: HabitGroupRecord[]
  groupId: string | null
  ungroupedOnly: boolean
}

type ReportPeriod = '7' | '30' | '90' | '365' | 'custom'

function errorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : 'Не удалось построить отчёт'
}

function heatClass(scheduled: number, rate: number, missed: number): string {
  if (scheduled === 0) return 'bg-[var(--app-control)]'
  if (rate >= 100) return 'bg-emerald-400/80'
  if (rate >= 75) return 'bg-violet-400/70'
  if (rate >= 50) return 'bg-violet-400/45'
  if (rate > 0) return 'bg-amber-400/45'
  if (missed > 0) return 'bg-rose-400/45'
  return 'bg-[var(--app-control-hover)]'
}

export function HabitReports({
  groups,
  groupId,
  ungroupedOnly
}: HabitReportsProps): React.JSX.Element {
  const today = localDateKey()
  const [period, setPeriod] = useState<ReportPeriod>('30')
  const [customFrom, setCustomFrom] = useState(addDays(today, -29))
  const [customTo, setCustomTo] = useState(today)
  const [includeArchived, setIncludeArchived] = useState(true)
  const [report, setReport] = useState<HabitReport | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const range = useMemo(() => {
    if (period === 'custom') return { dateFrom: customFrom, dateTo: customTo }
    const days = Number(period)
    return { dateFrom: addDays(today, -(days - 1)), dateTo: today }
  }, [customFrom, customTo, period, today])

  const loadReport = useCallback(async (): Promise<void> => {
    if (!range.dateFrom || !range.dateTo || range.dateTo < range.dateFrom) {
      setError('Проверьте границы периода отчёта')
      setReport(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const next = await habitsClient.getReport({
        dateFrom: range.dateFrom,
        dateTo: range.dateTo,
        groupId,
        ungroupedOnly,
        includeArchived
      })
      setReport(next)
    } catch (reason) {
      setError(errorMessage(reason))
      setReport(null)
    } finally {
      setIsLoading(false)
    }
  }, [groupId, includeArchived, range.dateFrom, range.dateTo, ungroupedOnly])

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) void loadReport()
    })
    return () => {
      cancelled = true
    }
  }, [loadReport])

  const groupById = useMemo(() => new Map(groups.map((group) => [group.id, group])), [groups])

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow-card)]">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[180px]">
            <span className="mb-1.5 block text-xs font-medium text-[var(--app-muted)]">Период</span>
            <AppSelect
              ariaLabel="Период отчёта привычек"
              value={period}
              options={[
                { value: '7', label: 'Последние 7 дней' },
                { value: '30', label: 'Последние 30 дней' },
                { value: '90', label: 'Последние 90 дней' },
                { value: '365', label: 'Последний год' },
                { value: 'custom', label: 'Свой период' }
              ]}
              onValueChange={(value) => setPeriod(value as ReportPeriod)}
            />
          </div>

          {period === 'custom' && (
            <>
              <label className="space-y-1.5">
                <span className="block text-xs font-medium text-[var(--app-muted)]">От</span>
                <input
                  type="date"
                  value={customFrom}
                  max={customTo}
                  className="h-10 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-violet-500/45 focus:ring-2 focus:ring-violet-500/15"
                  onChange={(event) => setCustomFrom(event.target.value)}
                />
              </label>
              <label className="space-y-1.5">
                <span className="block text-xs font-medium text-[var(--app-muted)]">До</span>
                <input
                  type="date"
                  value={customTo}
                  min={customFrom}
                  max={today}
                  className="h-10 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-violet-500/45 focus:ring-2 focus:ring-violet-500/15"
                  onChange={(event) => setCustomTo(event.target.value)}
                />
              </label>
            </>
          )}

          <label className="ml-auto flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm text-[var(--app-muted)]">
            <input
              type="checkbox"
              checked={includeArchived}
              className="accent-violet-500"
              onChange={(event) => setIncludeArchived(event.target.checked)}
            />
            Учитывать архив
          </label>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex min-h-64 items-center justify-center rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] text-sm text-[var(--app-muted)]">
          Строим отчёт…
        </div>
      ) : report ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: 'Выполнение',
                value: `${report.summary.completionRate}%`,
                detail: `${report.summary.completed} из ${report.summary.completed + report.summary.missed}`,
                icon: BarChart3,
                tone: 'text-violet-300'
              },
              {
                label: 'Выполнено',
                value: report.summary.completed,
                detail: `Запланировано: ${report.summary.scheduled}`,
                icon: CheckCircle2,
                tone: 'text-emerald-300'
              },
              {
                label: 'Пропущено',
                value: report.summary.missed,
                detail: 'Прошедшие невыполненные',
                icon: TriangleAlert,
                tone: 'text-rose-300'
              },
              {
                label: 'Осознанно пропущено',
                value: report.summary.skipped,
                detail: `Ожидают: ${report.summary.pending}`,
                icon: SkipForward,
                tone: 'text-amber-300'
              }
            ].map((stat) => {
              const Icon = stat.icon
              return (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow-card)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-[var(--app-muted)]">{stat.label}</span>
                    <Icon className={cn('size-4', stat.tone)} />
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-[var(--app-text)]">{stat.value}</div>
                  <div className="mt-1 text-xs text-[var(--app-muted)]">{stat.detail}</div>
                </div>
              )
            })}
          </section>

          <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow-card)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-[var(--app-text)]">Календарь выполнения</h2>
                <p className="mt-1 text-xs text-[var(--app-muted)]">
                  Цвет показывает долю выполненных привычек среди тех, по которым уже можно оценить результат.
                </p>
              </div>
              <div className="text-xs text-[var(--app-muted)]">
                {formatHabitDate(report.dateFrom)} — {formatHabitDate(report.dateTo)}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-[repeat(31,minmax(0,1fr))] gap-1 max-[900px]:grid-cols-[repeat(14,minmax(0,1fr))] max-[560px]:grid-cols-[repeat(7,minmax(0,1fr))]">
              {report.days.map((day) => (
                <div
                  key={day.date}
                  title={`${day.date}: ${day.completionRate}% · выполнено ${day.completed}, пропущено ${day.missed}, осознанно пропущено ${day.skipped}`}
                  aria-label={`${day.date}: выполнение ${day.completionRate}%`}
                  className={cn(
                    'aspect-square min-h-2 rounded-[4px] border border-white/[0.03]',
                    heatClass(day.scheduled, day.completionRate, day.missed)
                  )}
                />
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[var(--app-shadow-card)]">
            <div className="flex items-center gap-2 border-b border-[var(--app-border)] px-4 py-3">
              <Flame className="size-4 text-violet-300" />
              <h2 className="text-sm font-semibold text-[var(--app-text)]">По привычкам</h2>
              <span className="ml-auto rounded-lg bg-[var(--app-control)] px-2 py-0.5 text-xs text-[var(--app-muted)]">
                {report.habits.length}
              </span>
            </div>

            {report.habits.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-[var(--app-muted)]">
                В выбранном периоде нет запланированных привычек.
              </div>
            ) : (
              <div className="divide-y divide-[var(--app-border)]">
                {report.habits.map((habit) => {
                  const groupName = habit.groupId ? groupById.get(habit.groupId)?.name : null
                  return (
                    <article key={habit.habitId} className="px-4 py-4">
                      <div className="flex flex-wrap items-start gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-[var(--app-text)]">{habit.title}</h3>
                            {groupName && (
                              <span className="rounded-lg border border-[var(--app-border)] bg-[var(--app-control)] px-2 py-0.5 text-[11px] text-[var(--app-muted)]">
                                {groupName}
                              </span>
                            )}
                            <span className="rounded-lg border border-violet-400/20 bg-violet-500/10 px-2 py-0.5 text-[11px] text-violet-200">
                              {habitRepeatLabel(habit.repeatEveryDays)}
                            </span>
                          </div>
                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--app-control)]">
                            <div
                              className="h-full rounded-full bg-violet-400 transition-[width]"
                              style={{ width: `${habit.completionRate}%` }}
                            />
                          </div>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--app-muted)]">
                            <span>Выполнено: {habit.completed}</span>
                            <span>Пропущено: {habit.missed}</span>
                            <span>Пропущено осознанно: {habit.skipped}</span>
                            <span>Запланировано: {habit.scheduled}</span>
                            {habit.trackingType === 'count' && (
                              <span>
                                Сумма: {habit.totalValue} {habit.unit}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid shrink-0 grid-cols-3 gap-2 text-center">
                          <div className="min-w-16 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-2 py-2">
                            <div className="text-lg font-semibold text-[var(--app-text)]">
                              {habit.completionRate}%
                            </div>
                            <div className="text-[10px] text-[var(--app-muted)]">результат</div>
                          </div>
                          <div className="min-w-16 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-2 py-2">
                            <div className="text-lg font-semibold text-orange-200">
                              {habit.currentStreak}
                            </div>
                            <div className="text-[10px] text-[var(--app-muted)]">серия</div>
                          </div>
                          <div className="min-w-16 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-2 py-2">
                            <div className="text-lg font-semibold text-amber-200">{habit.bestStreak}</div>
                            <div className="text-[10px] text-[var(--app-muted)]">рекорд</div>
                          </div>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  )
}
