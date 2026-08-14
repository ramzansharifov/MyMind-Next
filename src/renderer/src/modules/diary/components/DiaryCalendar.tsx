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
      <div className="overflow-hidden rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[var(--app-shadow-card)]">
        <div className="grid grid-cols-7 border-b border-[var(--app-border)] bg-[var(--app-overlay-faint)]">
          {weekdayLabels.map((label) => (
            <div
              key={label}
              className="px-2 py-3 text-center text-xs font-semibold text-[var(--app-muted)]"
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
              if (!cell) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="min-h-28 border-r border-b border-[var(--app-border)] bg-[var(--app-overlay-faint)]"
                  />
                )
              }

              const page = byKey.get(cell.dayKey)
              const today = cell.dayKey === localDayKey()

              return (
                <button
                  key={cell.dayKey}
                  type="button"
                  disabled={!page}
                  className={`relative min-h-28 border-r border-b border-[var(--app-border)] p-3 text-left transition-colors outline-none ${page ? 'hover:bg-[var(--app-control-hover)] focus-visible:bg-[var(--app-control-hover)]' : 'cursor-default'} ${today ? 'bg-violet-500/[0.045]' : ''}`}
                  onClick={() => {
                    if (page) onOpenDay(cell.dayKey)
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`flex size-7 items-center justify-center rounded-lg text-xs font-semibold ${today ? 'bg-violet-500 text-white' : 'text-[var(--app-text)]'}`}
                    >
                      {cell.dayNumber}
                    </span>
                    {page?.mood && (
                      <span className="text-lg" title={diaryMoodMeta[page.mood].label}>
                        {diaryMoodMeta[page.mood].emoji}
                      </span>
                    )}
                  </div>
                  {page && (
                    <div className="absolute right-3 bottom-3 left-3 text-[10px] text-[var(--app-muted)]">
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
