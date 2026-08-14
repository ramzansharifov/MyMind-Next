import { LoaderCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import type { DiaryDaySummary, DiarySummary } from '../../../../../shared/contracts/diary'
import { diaryClient } from '../api/diary-client'
import { diaryMoodMeta, getDiaryErrorMessage, localDayKey, monthRange } from '../lib/diary-ui'

const weekdayLabels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

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
      <div className="overflow-hidden rounded-[24px] border border-[var(--app-border)] bg-[var(--app-border)] shadow-[var(--app-shadow-card)]">
        <div className="grid grid-cols-7 gap-px border-b border-[var(--app-border)] bg-[var(--app-border)]">
          {weekdayLabels.map((label) => (
            <div
              key={label}
              className="bg-[var(--app-overlay-faint)] px-2 py-3.5 text-center text-xs font-semibold tracking-wide text-[var(--app-muted)]"
            >
              {label}
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="flex min-h-96 items-center justify-center bg-[var(--app-surface)] text-sm text-[var(--app-muted)]">
            <LoaderCircle className="mr-2 size-4 animate-spin" /> Загружаем месяц…
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-px bg-[var(--app-border)]">
            {cells.map((cell, index) => {
              if (!cell) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="min-h-32 bg-[var(--app-workspace)]"
                    aria-hidden="true"
                  />
                )
              }

              const page = byKey.get(cell.dayKey)
              const today = cell.dayKey === localDayKey()
              const interactiveState = page
                ? today
                  ? 'hover:bg-violet-500/[0.15] focus-visible:bg-violet-500/[0.15]'
                  : 'hover:bg-[var(--app-control-hover)] focus-visible:bg-[var(--app-control-hover)]'
                : 'cursor-default'

              return (
                <button
                  key={cell.dayKey}
                  type="button"
                  disabled={!page}
                  aria-current={today ? 'date' : undefined}
                  className={`relative flex min-h-32 flex-col items-stretch justify-start bg-[var(--app-surface)] p-4 text-left transition-colors outline-none ${interactiveState} ${today ? 'bg-violet-500/[0.10] before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:bg-violet-400/70' : ''} focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-violet-400/55 focus-visible:ring-inset`}
                  onClick={() => {
                    if (page) onOpenDay(cell.dayKey)
                  }}
                >
                  <div className="flex w-full shrink-0 items-start justify-between gap-3">
                    <span
                      className={`text-[20px] leading-none font-semibold tracking-tight ${today ? 'text-violet-100' : 'text-[var(--app-text)]'}`}
                    >
                      {cell.dayNumber}
                    </span>

                    {page?.mood && (
                      <span
                        className={`flex size-8 items-center justify-center rounded-xl text-xl leading-none ${today ? 'bg-violet-500/10' : 'bg-[var(--app-overlay-faint)]'}`}
                        title={diaryMoodMeta[page.mood].label}
                        aria-label={diaryMoodMeta[page.mood].label}
                      >
                        {diaryMoodMeta[page.mood].emoji}
                      </span>
                    )}
                  </div>

                  {page && (
                    <div
                      className={`absolute right-4 bottom-4 left-4 text-xs leading-4 font-medium ${today ? 'text-violet-100/70' : 'text-[var(--app-muted)]'}`}
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
