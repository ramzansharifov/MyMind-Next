import { ListTree } from 'lucide-react'
import { useEffect, useMemo, useState, type RefObject } from 'react'

import type { StudyBlock } from '../../../../../shared/contracts/study'
import { cn } from '../../../shared/lib/cn'
import {
  getStudyHeadingElementId,
  STUDY_REVEAL_HEADING_EVENT,
  type StudyRevealHeadingDetail
} from '../lib/study-read-navigation'

type StudyHeadingBlock = Extract<
  StudyBlock,
  {
    type: 'heading'
  }
>

interface StudyReadNavigationProps {
  blocks: StudyBlock[]
  scrollContainerRef: RefObject<HTMLDivElement | null>
}

export function StudyReadNavigation({
  blocks,
  scrollContainerRef
}: StudyReadNavigationProps): React.JSX.Element {
  const headings = useMemo(
    () => blocks.filter((block): block is StudyHeadingBlock => block.type === 'heading'),
    [blocks]
  )

  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(headings[0]?.id ?? null)

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current

    if (!scrollContainer) {
      return
    }

    let frameId: number | null = null

    function updateActiveHeading(): void {
      frameId = null

      const currentScrollContainer = scrollContainerRef.current

      if (!currentScrollContainer) {
        setActiveHeadingId(null)
        return
      }

      const headingElements = Array.from(
        currentScrollContainer.querySelectorAll<HTMLElement>('[data-study-heading-id]')
      )

      if (headingElements.length === 0) {
        setActiveHeadingId(null)
        return
      }

      const containerTop = currentScrollContainer.getBoundingClientRect().top

      const activationLine = containerTop + 56

      let nextHeadingId = headingElements[0].dataset.studyHeadingId ?? null

      headingElements.forEach((element) => {
        if (element.getBoundingClientRect().top <= activationLine) {
          nextHeadingId = element.dataset.studyHeadingId ?? nextHeadingId
        }
      })

      const isAtBottom =
        currentScrollContainer.scrollTop + currentScrollContainer.clientHeight >=
        currentScrollContainer.scrollHeight - 4

      if (isAtBottom) {
        nextHeadingId =
          headingElements[headingElements.length - 1].dataset.studyHeadingId ?? nextHeadingId
      }

      setActiveHeadingId(nextHeadingId)
    }

    function scheduleUpdate(): void {
      if (frameId !== null) {
        return
      }

      frameId = window.requestAnimationFrame(updateActiveHeading)
    }

    const mutationObserver = new MutationObserver(scheduleUpdate)

    mutationObserver.observe(scrollContainer, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-state']
    })

    scheduleUpdate()

    scrollContainer.addEventListener('scroll', scheduleUpdate, {
      passive: true
    })

    window.addEventListener('resize', scheduleUpdate)

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId)
      }

      mutationObserver.disconnect()

      scrollContainer.removeEventListener('scroll', scheduleUpdate)

      window.removeEventListener('resize', scheduleUpdate)
    }
  }, [headings, scrollContainerRef])

  function navigateToHeading(headingId: string): void {
    setActiveHeadingId(headingId)

    function revealHeading(attempt: number): void {
      window.dispatchEvent(
        new CustomEvent<StudyRevealHeadingDetail>(STUDY_REVEAL_HEADING_EVENT, {
          detail: {
            headingId
          }
        })
      )

      if (attempt < 3) {
        window.requestAnimationFrame(() => {
          revealHeading(attempt + 1)
        })

        return
      }

      window.requestAnimationFrame(() => {
        const scrollContainer = scrollContainerRef.current

        const target = document.getElementById(getStudyHeadingElementId(headingId))

        if (!scrollContainer || !target) {
          return
        }

        const containerRect = scrollContainer.getBoundingClientRect()

        const targetRect = target.getBoundingClientRect()

        const targetTop = scrollContainer.scrollTop + targetRect.top - containerRect.top - 24

        scrollContainer.scrollTo({
          top: Math.max(targetTop, 0),
          behavior: 'smooth'
        })
      })
    }

    revealHeading(0)
  }

  return (
    <aside className="sticky top-0 min-w-0 self-start max-[1180px]:static max-[1180px]:order-first">
      <nav
        aria-label="Навигация по заголовкам материала"
        className="flex max-h-[calc(100vh-12rem)] min-h-40 flex-col overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] max-[1180px]:max-h-64"
      >
        <header className="flex shrink-0 items-center gap-3 border-b border-[var(--app-border)] px-4 py-3.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300">
            <ListTree aria-hidden="true" className="size-4" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[var(--app-text)]">Содержание</p>

            <p className="mt-0.5 text-[11px] text-[var(--app-muted)]">
              {headings.length === 0
                ? 'Заголовков нет'
                : `${headings.length} ${getHeadingCountLabel(headings.length)}`}
            </p>
          </div>
        </header>

        {headings.length > 0 ? (
          <ol className="min-h-0 overflow-y-auto p-2">
            {headings.map((heading) => {
              const isActive = heading.id === activeHeadingId

              const title = heading.text.trim() || 'Без заголовка'

              return (
                <li key={heading.id}>
                  <button
                    type="button"
                    title={title}
                    aria-current={isActive ? 'location' : undefined}
                    className={cn(
                      'group relative flex min-h-9 w-full min-w-0 items-center gap-2 rounded-lg pr-2 text-left outline-none',
                      'transition-colors',
                      'focus-visible:ring-2 focus-visible:ring-violet-500/35',
                      heading.level === 1 && 'pl-3',
                      heading.level === 2 && 'pl-6',
                      heading.level === 3 && 'pl-9',
                      isActive
                        ? 'bg-violet-500/12 text-violet-200'
                        : 'text-[var(--app-muted)] hover:bg-white/[0.04] hover:text-[var(--app-text)]'
                    )}
                    onClick={() => {
                      navigateToHeading(heading.id)
                    }}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'absolute top-2 bottom-2 left-1 w-0.5 rounded-full transition-colors',
                        isActive ? 'bg-violet-400' : 'bg-transparent'
                      )}
                    />

                    <span
                      className={cn(
                        'w-5 shrink-0 text-[9px] font-semibold tracking-wide',
                        isActive ? 'text-violet-300' : 'text-[var(--app-muted)]/65'
                      )}
                    >
                      H{heading.level}
                    </span>

                    <span className="min-w-0 flex-1 truncate text-xs leading-5">{title}</span>
                  </button>
                </li>
              )
            })}
          </ol>
        ) : (
          <div className="flex min-h-32 flex-1 flex-col items-center justify-center px-5 py-8 text-center">
            <ListTree aria-hidden="true" className="size-6 text-[var(--app-muted)]/60" />

            <p className="mt-3 text-xs font-medium text-[var(--app-text)]">Нет разделов</p>

            <p className="mt-1 max-w-44 text-[11px] leading-5 text-[var(--app-muted)]">
              Добавь блоки заголовков, чтобы появилась навигация.
            </p>
          </div>
        )}
      </nav>
    </aside>
  )
}

function getHeadingCountLabel(count: number): string {
  const lastTwoDigits = count % 100

  const lastDigit = count % 10

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return 'заголовков'
  }

  if (lastDigit === 1) {
    return 'заголовок'
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'заголовка'
  }

  return 'заголовков'
}
