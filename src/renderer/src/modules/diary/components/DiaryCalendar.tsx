import { LoaderCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import type { DiaryDaySummary, DiarySummary } from '../../../../../shared/contracts/diary'
import { diaryClient } from '../api/diary-client'
import { diaryMoodMeta, getDiaryErrorMessage, localDayKey, monthRange } from '../lib/diary-ui'

const weekdayLabels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const calendarGridLineColor =
  'color-mix(in srgb, var(--app-border) 62%, var(--app-text) 38%)'

function entryWord(count: number): string {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return 'запись'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'записи'
  return 'записей'
}

export function DiaryCalendar({
  diary,
  refreshVersion,
  cursor,
  onOpenDay
}: {
  diary: DiarySummary
  refreshVersion: number
  cursor: Date
  onOpenDay: (dayKey: string) => void
}): React.JSX.Element {
  const [days, setDays] = useState<DiaryDaySummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const range = useMemo(() => monthRange(cursor), [cursor])

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      setIsLoading(true)
      setError(null)
    })

    void diaryClient
      .listDays({ diaryId: diary.id, ...range })
      .then((result) => {
        if (!cancelled) setDays(result)
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
  }, [diary.id, range, refreshVersion])

  const byKey = useMemo(() => new Map(days.map((day) => [day.dayKey, day])), [days])
  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
  const mondayOffset = (monthStart.getDay() + 6) % 7
  const cells = Array.from(
    { length: Math.ceil((mondayOffset + daysInMonth) / 7) * 7 },
    (_, index) => {
      const dayNumber = index - mondayOffset + 1
      if (dayNumber < 1 || dayNumber > daysInMonth) return null
      const date = new Date(cursor.getFullYear(), cursor.getMonth(), dayNumber)
      return { dayNumber, dayKey: localDayKey(date) }
    }
  )

  return (
    <section className="space-y-4">
      <div
        className="overflow-hidden rounded-[24px] border bg-[var(--app-surface)] shadow-[var(--app-shadow-card)]"
        style={{ borderColor: calendarGridLineColor }}
      >
        <div
          className="grid grid-cols-7 border-b bg-[var(--app-overlay-faint)]"
          style={{ borderColor: calendarGridLineColor }}
        >
          {weekdayLabels.map((label, index) => (
            <div
              key={label}
              className={`px-2 py-3.5 text-center text-xs font-semibold tracking-wide text-[var(--app-muted)] ${index < weekdayLabels.length - 1 ? 'border-r' : ''}`}
              style={{ borderColor: calendarGridLineColor }}
            >
              {label}
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="flex min-h-96 items-center justify-center text-sm text-[var(--app-muted)]">
            <LoaderCircle className="mr-2 size-4 animate-spin" /> Загружаем месяц…
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {cells.map((cell, index) => {
              const isLastColumn = index % 7 === 6
              const isLastRow = index >= cells.length - 7
              const cellBorders = `${isLastColumn ? '' : 'border-r'} ${isLastRow ? '' : 'border-b'}`

              if (!cell) {
                return (
                  <div
                    key={`empty-${index}`}
                    className={`min-h-32 bg-[var(--app-overlay-faint)] ${cellBorders}`}
                    style={{ borderColor: calendarGridLineColor }}
                  />
                )
              }

              const page = byKey.get(cell.dayKey)
              const today = cell.dayKey === localDayKey()
              const interactiveState = page
                ? today
                  ? 'hover:bg-violet-500/[0.16] focus-visible:bg-violet-500/[0.16]'
                  : 'hover:bg-[var(--app-control-hover)] focus-visible:bg-[var(--app-control-hover)]'
                : 'cursor-default'

              return (
                <button
                  key={cell.dayKey}
                  type="button"
                  disabled={!page}
                  className={`relative min-h-32 p-4 text-left transition-colors outline-none ${cellBorders} ${interactiveState} ${today ? 'bg-violet-500/[0.12] ring-1 ring-inset ring-violet-400/35' : ''} focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-400/55`}
                  style={{ borderColor: calendarGridLineColor }}
                  onClick={() => {
                    if (page) onOpenDay(cell.dayKey)
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={`text-lg font-semibold leading-none ${today ? 'text-violet-200' : 'text-[var(--app-text)]'}`}
                    >
                      {cell.dayNumber}
                    </span>
                    {page?.mood && (
                      <span
                        className="text-xl leading-none"
                        title={diaryMoodMeta[page.mood].label}
                        aria-label={diaryMoodMeta[page.mood].label}
                      >
                        {diaryMoodMeta[page.mood].emoji}
                      </span>
                    )}
                  </div>

                  {page && (
                    <div
                      className={`absolute right-4 bottom-4 left-4 text-xs font-medium leading-4 ${today ? 'text-violet-100/75' : 'text-[var(--app-muted)]'}`}
                    >
                      {page.entryCount > 0
                        ? `${page.entryCount} ${entryWord(page.entryCount)}`
                        : 'Только настроение'}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

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
