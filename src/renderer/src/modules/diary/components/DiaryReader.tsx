import { CalendarDays, ChevronLeft, ChevronRight, LoaderCircle } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import type {
  DiaryDay,
  DiaryDaySummary,
  DiarySummary
} from '../../../../../shared/contracts/diary'
import { diaryClient } from '../api/diary-client'
import {
  diaryMoodMeta,
  formatDiaryDate,
  formatDiaryTime,
  getDiaryErrorMessage,
  localDayKey
} from '../lib/diary-ui'

export function DiaryReader({
  diary,
  requestedDayKey,
  refreshVersion,
  onDayChange
}: {
  diary: DiarySummary
  requestedDayKey: string | null
  refreshVersion: number
  onDayChange: (dayKey: string) => void
}): React.JSX.Element {
  const [days, setDays] = useState<DiaryDaySummary[]>([])
  const [day, setDay] = useState<DiaryDay | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const orderedDays = useMemo(
    () => days.slice().sort((left, right) => left.dayKey.localeCompare(right.dayKey)),
    [days]
  )
  const currentKey = day?.dayKey ?? requestedDayKey
  const currentIndex = currentKey
    ? orderedDays.findIndex((item) => item.dayKey === currentKey)
    : -1
  const previousDay = currentIndex > 0 ? orderedDays[currentIndex - 1] : null
  const nextDay =
    currentIndex >= 0 && currentIndex < orderedDays.length - 1
      ? orderedDays[currentIndex + 1]
      : null

  const loadDays = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setError(null)
    try {
      const nextDays = await diaryClient.listDays({ diaryId: diary.id })
      setDays(nextDays)
      if (nextDays.length === 0) {
        setDay(null)
        return
      }
      const target =
        (requestedDayKey && nextDays.find((item) => item.dayKey === requestedDayKey)?.dayKey) ??
        nextDays[0].dayKey
      const nextPage = await diaryClient.getDay({ diaryId: diary.id, dayKey: target })
      setDay(nextPage)
      onDayChange(target)
    } catch (reason) {
      setError(getDiaryErrorMessage(reason))
    } finally {
      setIsLoading(false)
    }
  }, [diary.id, onDayChange, requestedDayKey])

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) void loadDays()
    })
    return () => {
      cancelled = true
    }
  }, [loadDays, refreshVersion])

  async function openDay(dayKey: string): Promise<void> {
    setIsLoading(true)
    setError(null)
    try {
      setDay(await diaryClient.getDay({ diaryId: diary.id, dayKey }))
      onDayChange(dayKey)
    } catch (reason) {
      setError(getDiaryErrorMessage(reason))
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading && !day) {
    return (
      <div className="flex min-h-80 items-center justify-center text-sm text-[var(--app-muted)]">
        <LoaderCircle className="mr-2 size-4 animate-spin" /> Открываем дневник…
      </div>
    )
  }

  if (orderedDays.length === 0) {
    return (
      <section className="rounded-[24px] border border-dashed border-[var(--app-border)] bg-[var(--app-surface)] px-6 py-16 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-violet-500/15 bg-violet-500/10 text-violet-300">
          <CalendarDays className="size-6" />
        </div>
        <h2 className="mt-4 font-semibold text-[var(--app-text)]">
          В дневнике пока нет страниц
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-[var(--app-muted)]">
          Страница появится автоматически, когда вы добавите запись или настроение дня.
        </p>
      </section>
    )
  }

  const mood = day?.mood ? diaryMoodMeta[day.mood] : null

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4 max-[700px]:flex-col max-[700px]:items-start">
        <div>
          <h2 className="text-lg font-semibold text-[var(--app-text)]">Просмотр дневника</h2>
          <p className="mt-1 text-sm text-[var(--app-muted)]">
            Только чтение — спокойно листайте уже прожитые страницы.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!previousDay}
            aria-label="Предыдущая страница"
            className="flex size-10 items-center justify-center rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-muted)] hover:text-[var(--app-text)] disabled:opacity-35"
            onClick={() => {
              if (previousDay) void openDay(previousDay.dayKey)
            }}
          >
            <ChevronLeft className="size-4" />
          </button>
          <select
            aria-label="Страница дневника"
            value={currentKey ?? ''}
            className="h-10 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-sm text-[var(--app-text)] outline-none"
            onChange={(event) => void openDay(event.target.value)}
          >
            {orderedDays.map((item) => (
              <option key={item.id} value={item.dayKey}>
                {formatDiaryDate(item.dayKey, {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!nextDay}
            aria-label="Следующая страница"
            className="flex size-10 items-center justify-center rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-muted)] hover:text-[var(--app-text)] disabled:opacity-35"
            onClick={() => {
              if (nextDay) void openDay(nextDay.dayKey)
            }}
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="diary-book-frame mx-auto max-w-[980px] rounded-[32px] p-3 max-[620px]:p-0">
        <article className="diary-paper min-h-[610px] overflow-hidden rounded-[24px] border shadow-2xl">
          <div className="diary-paper-content relative min-h-[610px] px-10 py-10 max-[620px]:px-5">
            {day && (
              <>
                <header className="flex items-start justify-between gap-6 border-b border-stone-300/70 pb-5 max-[560px]:flex-col">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                      {diary.title}
                    </div>
                    <h3 className="mt-2 font-serif text-2xl font-semibold capitalize text-stone-900">
                      {formatDiaryDate(day.dayKey)}
                    </h3>
                  </div>
                  <div className="text-right max-[560px]:text-left">
                    <div className="text-xs text-stone-400">
                      Страница {Math.max(1, currentIndex + 1)} из {orderedDays.length}
                    </div>
                    <div className="mt-2 text-sm text-stone-600">
                      {mood ? `${mood.emoji} ${mood.label}` : 'Настроение не отмечено'}
                    </div>
                  </div>
                </header>

                <div className="mt-8 space-y-7">
                  {day.entries.length === 0 ? (
                    <p className="py-14 text-center font-serif text-sm italic text-stone-500">
                      В этот день осталось только настроение.
                    </p>
                  ) : (
                    day.entries.map((entry) => (
                      <div
                        key={entry.id}
                        className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-4 max-[480px]:grid-cols-1 max-[480px]:gap-1"
                      >
                        <time className="pt-1 font-mono text-xs text-stone-400">
                          {formatDiaryTime(entry.occurredAt)}
                        </time>
                        <p className="diary-handwriting whitespace-pre-wrap break-words text-[15px] leading-8 text-stone-800">
                          {entry.text}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </article>
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          disabled={!orderedDays.some((item) => item.dayKey === localDayKey())}
          className="text-xs font-medium text-[var(--app-muted)] hover:text-violet-300 disabled:opacity-40"
          onClick={() => void openDay(localDayKey())}
        >
          Перейти к сегодняшней странице
        </button>
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
