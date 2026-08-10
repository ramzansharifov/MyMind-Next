import { CalendarDays, ChevronLeft, ChevronRight, LoaderCircle } from 'lucide-react'
import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'

import type { DiaryDay, DiaryDaySummary, DiarySummary } from '../../../../../shared/contracts/diary'
import '../diary-premium.css'
import '../diary-leather-cover.css'
import '../diary-reader-behavior.css'
import { diaryClient } from '../api/diary-client'
import {
  diaryMoodMeta,
  formatDiaryDate,
  formatDiaryTime,
  getDiaryErrorMessage
} from '../lib/diary-ui'

type PageTurnDirection = 'next' | 'previous'

interface PageTurnState {
  target: DiaryDay
  direction: PageTurnDirection
}

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
  const [pageTurn, setPageTurn] = useState<PageTurnState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pageRequestPendingRef = useRef(false)

  const orderedDays = useMemo(
    () => days.slice().sort((left, right) => left.dayKey.localeCompare(right.dayKey)),
    [days]
  )
  const currentKey = day?.dayKey ?? requestedDayKey
  const currentIndex = currentKey ? orderedDays.findIndex((item) => item.dayKey === currentKey) : -1
  const previousDay = currentIndex > 0 ? orderedDays[currentIndex - 1] : null
  const nextDay =
    currentIndex >= 0 && currentIndex < orderedDays.length - 1
      ? orderedDays[currentIndex + 1]
      : null

  const pageNumberFor = useCallback(
    (dayKey: string): number => {
      const index = orderedDays.findIndex((item) => item.dayKey === dayKey)
      return Math.max(1, index + 1)
    },
    [orderedDays]
  )

  const loadDays = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setError(null)
    setPageTurn(null)
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

  const openDay = useCallback(
    async (dayKey: string): Promise<void> => {
      if (
        day?.dayKey === dayKey ||
        pageTurn ||
        pageRequestPendingRef.current ||
        orderedDays.length === 0
      ) {
        return
      }

      const sourceIndex = day ? orderedDays.findIndex((item) => item.dayKey === day.dayKey) : -1
      const targetIndex = orderedDays.findIndex((item) => item.dayKey === dayKey)

      pageRequestPendingRef.current = true
      setIsLoading(true)
      setError(null)

      try {
        const nextPage = await diaryClient.getDay({ diaryId: diary.id, dayKey })

        if (!nextPage) {
          throw new Error('Страница дневника больше недоступна.')
        }

        if (!day || sourceIndex < 0 || targetIndex < 0) {
          setDay(nextPage)
          onDayChange(dayKey)
          return
        }

        setPageTurn({
          target: nextPage,
          direction: targetIndex < sourceIndex ? 'previous' : 'next'
        })
      } catch (reason) {
        setError(getDiaryErrorMessage(reason))
      } finally {
        pageRequestPendingRef.current = false
        setIsLoading(false)
      }
    },
    [day, diary.id, onDayChange, orderedDays, pageTurn]
  )

  const finishPageTurn = useCallback((): void => {
    if (!pageTurn) return

    setDay(pageTurn.target)
    onDayChange(pageTurn.target.dayKey)
    setPageTurn(null)
  }, [onDayChange, pageTurn])

  const handlePageKeyDown = useEffectEvent((event: KeyboardEvent): void => {
    if (
      event.defaultPrevented ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      isLoading ||
      pageTurn
    ) {
      return
    }

    const target = event.target
    if (
      target instanceof HTMLElement &&
      (target.matches('input, textarea, select, button') || target.isContentEditable)
    ) {
      return
    }

    const targetDay =
      event.key === 'ArrowLeft' ? previousDay : event.key === 'ArrowRight' ? nextDay : null
    if (!targetDay) return

    event.preventDefault()
    void openDay(targetDay.dayKey)
  })

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) void loadDays()
    })
    return () => {
      cancelled = true
    }
  }, [loadDays, refreshVersion])

  useEffect(() => {
    window.addEventListener('keydown', handlePageKeyDown)
    return () => window.removeEventListener('keydown', handlePageKeyDown)
  }, [])

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
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-[var(--app-border)] bg-[var(--app-control)] text-[var(--app-accent-300)]">
          <CalendarDays className="size-6" />
        </div>
        <h2 className="mt-4 font-semibold text-[var(--app-text)]">В дневнике пока нет страниц</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-[var(--app-muted)]">
          Страница появится автоматически, когда вы добавите запись или настроение дня.
        </p>
      </section>
    )
  }

  return (
    <section className="space-y-5">
      <div className="diary-book-frame diary-premium-book diary-reader-book w-full">
        <span className="diary-back-binding" aria-hidden="true" />
        <span className="diary-side-tab" aria-hidden="true">
          Просмотр
        </span>
        <span className="diary-bookmark-ribbon" aria-hidden="true">
          <span>✦</span>
        </span>

        <button
          type="button"
          disabled={!previousDay || isLoading || pageTurn !== null}
          aria-label="Предыдущая страница"
          className="diary-page-edge-button diary-page-edge-button--previous"
          onClick={() => {
            if (previousDay) void openDay(previousDay.dayKey)
          }}
        >
          <ChevronLeft className="size-5" />
        </button>

        <div
          className="diary-reader-page-stage"
          data-turning={pageTurn ? 'true' : undefined}
          aria-busy={isLoading || undefined}
        >
          {pageTurn?.direction === 'next' && (
            <DiaryReaderPage
              key={pageTurn.target.dayKey}
              day={pageTurn.target}
              diaryTitle={diary.title}
              pageNumber={pageNumberFor(pageTurn.target.dayKey)}
              pageCount={orderedDays.length}
              className="diary-reader-page-layer--under"
              ariaHidden
            />
          )}

          {day && (
            <DiaryReaderPage
              key={day.dayKey}
              day={day}
              diaryTitle={diary.title}
              pageNumber={pageNumberFor(day.dayKey)}
              pageCount={orderedDays.length}
              className={
                pageTurn?.direction === 'next'
                  ? 'diary-reader-page-layer--turn-next'
                  : pageTurn?.direction === 'previous'
                    ? 'diary-reader-page-layer--under'
                    : undefined
              }
              ariaHidden={pageTurn?.direction === 'previous'}
              onTurnEnd={pageTurn?.direction === 'next' ? finishPageTurn : undefined}
            />
          )}

          {pageTurn?.direction === 'previous' && (
            <DiaryReaderPage
              key={pageTurn.target.dayKey}
              day={pageTurn.target}
              diaryTitle={diary.title}
              pageNumber={pageNumberFor(pageTurn.target.dayKey)}
              pageCount={orderedDays.length}
              className="diary-reader-page-layer--turn-previous"
              ariaHidden
              onTurnEnd={finishPageTurn}
            />
          )}
        </div>

        <button
          type="button"
          disabled={!nextDay || isLoading || pageTurn !== null}
          aria-label="Следующая страница"
          className="diary-page-edge-button diary-page-edge-button--next"
          onClick={() => {
            if (nextDay) void openDay(nextDay.dayKey)
          }}
        >
          <ChevronRight className="size-5" />
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

function DiaryReaderPage({
  day,
  diaryTitle,
  pageNumber,
  pageCount,
  className,
  ariaHidden = false,
  onTurnEnd
}: {
  day: DiaryDay
  diaryTitle: string
  pageNumber: number
  pageCount: number
  className?: string
  ariaHidden?: boolean
  onTurnEnd?: () => void
}): React.JSX.Element {
  const mood = day.mood ? diaryMoodMeta[day.mood] : null

  return (
    <article
      aria-hidden={ariaHidden || undefined}
      className={`diary-paper diary-premium-paper diary-paper--reader diary-reader-page-layer overflow-hidden border ${className ?? ''}`}
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) onTurnEnd?.()
      }}
    >
      <div className="diary-paper-content diary-reader-page-content">
        <header className="diary-paper-header diary-paper-masthead diary-premium-masthead border-b border-stone-300/70 px-11 max-[700px]:px-7 max-[620px]:px-6">
          <div className="flex items-start justify-between gap-8 max-[640px]:flex-col max-[640px]:gap-4">
            <div className="min-w-0 flex-1">
              <div className="diary-premium-kicker">{diaryTitle}</div>
              <h3 className="diary-premium-date capitalize">{formatDiaryDate(day.dayKey)}</h3>
            </div>
            <div className="diary-reader-meta max-[640px]:items-start">
              <div className="text-[11px] tracking-wide text-stone-400 uppercase">
                Страница {pageNumber} из {pageCount}
              </div>
              <div className="diary-reader-mood">
                {mood ? (
                  <>
                    <span className="text-base">{mood.emoji}</span>
                    <span>{mood.label}</span>
                  </>
                ) : (
                  <span>Настроение не отмечено</span>
                )}
              </div>
            </div>
          </div>

          <div className="diary-premium-divider" aria-hidden="true">
            <span>— ✦ —</span>
          </div>
        </header>

        <div className="diary-reader-scroll-viewport">
          <div className="diary-ruled-surface diary-ruled-content diary-reader-ruled-sheet">
            {day.entries.length === 0 ? (
              <div className="flex min-h-[324px] items-center justify-center pl-20 text-center max-[620px]:pl-8">
                <p className="font-serif text-sm text-stone-500 italic">
                  В этот день осталось только настроение.
                </p>
              </div>
            ) : (
              day.entries.map((entry) => (
                <div key={entry.id} className="diary-entry-row">
                  <time className="diary-entry-time">{formatDiaryTime(entry.occurredAt)}</time>
                  <p className="diary-handwriting diary-entry-text">{entry.text}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
