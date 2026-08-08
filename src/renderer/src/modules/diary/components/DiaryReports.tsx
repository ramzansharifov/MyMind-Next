import {
  Activity,
  BookOpen,
  CalendarDays,
  LoaderCircle,
  MessageSquareText,
  Smile
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import type {
  DiaryReport,
  DiaryReportPoint,
  DiarySummary
} from '../../../../../shared/contracts/diary'
import { diaryClient } from '../api/diary-client'
import {
  diaryMoodMeta,
  expandDiaryTimeline,
  getDiaryErrorMessage,
  reportRange
} from '../lib/diary-ui'

type ReportPeriod = 'week' | 'month' | 'three-months' | 'year' | 'all'

const periodOptions: Array<[ReportPeriod, string]> = [
  ['week', '7 дней'],
  ['month', '30 дней'],
  ['three-months', '3 месяца'],
  ['year', 'Год'],
  ['all', 'Всё время']
]

export function DiaryReports({
  diary,
  refreshVersion
}: {
  diary: DiarySummary
  refreshVersion: number
}): React.JSX.Element {
  const [period, setPeriod] = useState<ReportPeriod>('month')
  const [report, setReport] = useState<DiaryReport | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const range = reportRange(period)
    setIsLoading(true)
    setError(null)

    void diaryClient
      .getReport({ diaryId: diary.id, ...range })
      .then((result) => {
        if (!cancelled) setReport(result)
      })
      .catch((reason) => {
        if (!cancelled) setError(getDiaryErrorMessage(reason))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [diary.id, period, refreshVersion])

  const activityTimeline = useMemo(
    () =>
      report
        ? expandDiaryTimeline(report.timeline, report.fromDay, report.toDay)
        : [],
    [report]
  )
  const activityPercent =
    activityTimeline.length > 0
      ? Math.round(((report?.activeDays ?? 0) / activityTimeline.length) * 100)
      : 0

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4 max-[760px]:flex-col max-[760px]:items-start">
        <div>
          <h2 className="text-lg font-semibold text-[var(--app-text)]">Отчёты</h2>
          <p className="mt-1 text-sm text-[var(--app-muted)]">
            Ритм ведения дневника и динамика общего настроения.
          </p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-1">
          {periodOptions.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${period === value ? 'bg-violet-500 text-white' : 'text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'}`}
              onClick={() => setPeriod(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && !report ? (
        <div className="flex min-h-72 items-center justify-center text-sm text-[var(--app-muted)]">
          <LoaderCircle className="mr-2 size-4 animate-spin" /> Собираем отчёт…
        </div>
      ) : report ? (
        <>
          <div className="grid grid-cols-4 gap-3 max-[980px]:grid-cols-2 max-[520px]:grid-cols-1">
            <Metric
              icon={<CalendarDays />}
              label="Страниц"
              value={`${report.pageCount}`}
              hint={`${report.activeDays} дней с записями`}
            />
            <Metric
              icon={<MessageSquareText />}
              label="Записей"
              value={`${report.entryCount}`}
              hint={`${report.averageEntriesPerActiveDay.toFixed(1)} в активный день`}
            />
            <Metric
              icon={<Smile />}
              label="Среднее настроение"
              value={
                report.averageMoodScore == null
                  ? '—'
                  : `${report.averageMoodScore.toFixed(1)} / 5`
              }
              hint={`${report.moodDays} дней с настроением`}
            />
            <Metric
              icon={<BookOpen />}
              label="Регулярность"
              value={`${activityPercent}%`}
              hint="Доля календарных дней, в которые были записи"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 max-[900px]:grid-cols-1">
            <ReportSurface
              title="Распределение настроения"
              icon={<Smile className="size-4" />}
            >
              <div className="space-y-3">
                {report.moodBreakdown.map((item) => {
                  const meta = diaryMoodMeta[item.mood]
                  return (
                    <div
                      key={item.mood}
                      className="grid grid-cols-[8.5rem_minmax(0,1fr)_3.5rem] items-center gap-3 text-sm"
                    >
                      <div className="flex items-center gap-2 text-[var(--app-text)]">
                        <span>{meta.emoji}</span>
                        <span>{meta.label}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[var(--app-overlay-subtle)]">
                        <div
                          className="h-full rounded-full bg-violet-500"
                          style={{ width: `${item.sharePercent}%` }}
                        />
                      </div>
                      <div className="text-right text-xs text-[var(--app-muted)]">
                        {item.count}
                      </div>
                    </div>
                  )
                })}
              </div>
            </ReportSurface>

            <ReportSurface
              title="Динамика настроения"
              icon={<Activity className="size-4" />}
            >
              <MoodTrend points={activityTimeline} />
            </ReportSurface>
          </div>

          <ReportSurface
            title="Календарь активности"
            icon={<CalendarDays className="size-4" />}
          >
            {activityTimeline.length === 0 ? (
              <EmptyReport label="За выбранный период пока нет страниц" />
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(1.15rem,1fr))] gap-1.5">
                {activityTimeline.map((point) => {
                  const level = Math.min(4, point.entryCount)
                  return (
                    <div
                      key={point.dayKey}
                      title={`${point.dayKey}: ${point.entryCount} записей${point.mood ? ` · ${diaryMoodMeta[point.mood].label}` : ''}`}
                      className={`aspect-square min-h-4 rounded-[5px] border border-violet-500/10 ${level === 0 ? 'bg-[var(--app-overlay-faint)]' : level === 1 ? 'bg-violet-500/20' : level === 2 ? 'bg-violet-500/35' : level === 3 ? 'bg-violet-500/55' : 'bg-violet-500/80'}`}
                    />
                  )
                })}
              </div>
            )}
            <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-[var(--app-muted)]">
              Реже
              <span className="size-3 rounded bg-[var(--app-overlay-faint)]" />
              <span className="size-3 rounded bg-violet-500/20" />
              <span className="size-3 rounded bg-violet-500/40" />
              <span className="size-3 rounded bg-violet-500/60" />
              <span className="size-3 rounded bg-violet-500/80" />
              Чаще
            </div>
          </ReportSurface>
        </>
      ) : null}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-200"
        >
          {error}
        </div>
      )}
    </section>
  )
}

function Metric({
  icon,
  label,
  value,
  hint
}: {
  icon: React.ReactNode
  label: string
  value: string
  hint: string
}): React.JSX.Element {
  return (
    <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow-card)]">
      <div className="flex items-center justify-between gap-3 text-xs text-[var(--app-muted)]">
        <span>{label}</span>
        <span className="text-violet-300 [&>svg]:size-4">{icon}</span>
      </div>
      <div className="mt-2 text-xl font-semibold text-[var(--app-text)] tabular-nums">
        {value}
      </div>
      <div className="mt-1 text-[10px] leading-4 text-[var(--app-muted)]">{hint}</div>
    </div>
  )
}

function ReportSurface({
  title,
  icon,
  children
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="rounded-[22px] border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-[var(--app-shadow-card)]">
      <div className="mb-5 flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-lg border border-violet-500/15 bg-violet-500/10 text-violet-300">
          {icon}
        </span>
        <h3 className="font-semibold text-[var(--app-text)]">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function MoodTrend({ points }: { points: DiaryReportPoint[] }): React.JSX.Element {
  if (!points.some((point) => point.moodScore !== null)) {
    return <EmptyReport label="Настроение пока не отмечалось" />
  }

  const width = 640
  const height = 180
  const padding = 18
  const xForIndex = (index: number): number =>
    padding + (index * (width - padding * 2)) / Math.max(1, points.length - 1)
  const yForScore = (score: number): number =>
    height - padding - ((score - 1) / 4) * (height - padding * 2)

  const paths: string[] = []
  let currentPath = ''

  points.forEach((point, index) => {
    if (point.moodScore === null) {
      if (currentPath) paths.push(currentPath)
      currentPath = ''
      return
    }

    const command = currentPath ? 'L' : 'M'
    currentPath += `${command} ${xForIndex(index)} ${yForScore(point.moodScore)} `
  })
  if (currentPath) paths.push(currentPath)

  return (
    <figure>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-44 w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label="Динамика настроения"
      >
        {[1, 2, 3, 4, 5].map((score) => {
          const y = yForScore(score)
          return (
            <line
              key={score}
              x1={padding}
              x2={width - padding}
              y1={y}
              y2={y}
              stroke="var(--app-border)"
              strokeDasharray="3 5"
            />
          )
        })}
        {paths.map((path, index) => (
          <path
            key={`${path}-${index}`}
            d={path}
            fill="none"
            stroke="var(--app-accent-500)"
            strokeWidth="3"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {points.map((point, index) =>
          point.moodScore === null ? null : (
            <circle
              key={point.dayKey}
              cx={xForIndex(index)}
              cy={yForScore(point.moodScore)}
              r="3.5"
              fill="var(--app-surface-raised)"
              stroke="var(--app-accent-500)"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            >
              <title>
                {point.dayKey}: {point.mood ? diaryMoodMeta[point.mood].label : ''}
              </title>
            </circle>
          )
        )}
      </svg>
      <div className="mt-2 flex justify-between text-[10px] text-[var(--app-muted)]">
        <span>😞 Плохое</span>
        <span>😄 Отличное</span>
      </div>
    </figure>
  )
}

function EmptyReport({ label }: { label: string }): React.JSX.Element {
  return (
    <div className="flex h-36 items-center justify-center rounded-xl border border-dashed border-[var(--app-border)] text-sm text-[var(--app-muted)]">
      {label}
    </div>
  )
}
