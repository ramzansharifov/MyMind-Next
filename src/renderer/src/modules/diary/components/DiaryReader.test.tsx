import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { DiaryDay, DiaryDaySummary, DiarySummary } from '../../../../../shared/contracts/diary'

const mocks = vi.hoisted(() => ({
  listDays: vi.fn(),
  getDay: vi.fn()
}))

vi.mock('../api/diary-client', () => ({ diaryClient: mocks }))

vi.mock('react-pageflip', async () => {
  const React = await vi.importActual<typeof import('react')>('react')

  type FlipController = {
    flipNext: () => void
    flipPrev: () => void
  }

  type FlipEvent<T> = {
    data: T
    object: FlipController
  }

  type MockFlipBookProps = {
    children: import('react').ReactNode
    startPage: number
    onInit?: (event: FlipEvent<{ page: number; mode: 'portrait' }>) => void
    onFlip?: (event: FlipEvent<number>) => void
    onChangeState?: (event: FlipEvent<string>) => void
  }

  function MockFlipBook(props: MockFlipBookProps): import('react').ReactElement {
    const controller = React.useMemo<FlipController>(() => {
      const nextController: FlipController = {
        flipNext: () => {
          props.onFlip?.({ data: 1, object: nextController })
          props.onChangeState?.({ data: 'read', object: nextController })
        },
        flipPrev: () => {
          props.onFlip?.({ data: 0, object: nextController })
          props.onChangeState?.({ data: 'read', object: nextController })
        }
      }
      return nextController
    }, [props.onChangeState, props.onFlip])

    React.useEffect(() => {
      props.onInit?.({
        data: { page: props.startPage, mode: 'portrait' },
        object: controller
      })
    }, [controller, props.onInit, props.startPage])

    return React.createElement('div', { 'data-testid': 'mock-pageflip' }, props.children)
  }

  return { default: MockFlipBook }
})

import { DiaryReader } from './DiaryReader'

const diary: DiarySummary = {
  id: 'diary-default',
  title: 'Личный дневник',
  icon: 'book-heart',
  pageCount: 2,
  entryCount: 2,
  lastActivityAt: 2,
  createdAt: 1,
  updatedAt: 2
}

const days: DiaryDaySummary[] = [
  {
    id: 'day-1',
    diaryId: diary.id,
    dayKey: '2026-08-08',
    mood: 'good',
    entryCount: 1,
    createdAt: 1,
    updatedAt: 1
  },
  {
    id: 'day-2',
    diaryId: diary.id,
    dayKey: '2026-08-09',
    mood: 'excellent',
    entryCount: 1,
    createdAt: 2,
    updatedAt: 2
  }
]

const pages: Record<string, DiaryDay> = {
  '2026-08-08': {
    ...days[0],
    entries: [
      {
        id: 'entry-1',
        diaryDayId: 'day-1',
        text: 'Первая страница',
        occurredAt: 1_786_185_600_000,
        createdAt: 1_786_185_600_000,
        updatedAt: 1_786_185_600_000
      }
    ]
  },
  '2026-08-09': {
    ...days[1],
    entries: [
      {
        id: 'entry-2',
        diaryDayId: 'day-2',
        text: 'Вторая страница',
        occurredAt: 1_786_272_000_000,
        createdAt: 1_786_272_000_000,
        updatedAt: 1_786_272_000_000
      }
    ]
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.listDays.mockResolvedValue(days)
  mocks.getDay.mockImplementation(({ dayKey }: { dayKey: string }) =>
    Promise.resolve(pages[dayKey] ?? null)
  )
})

describe('DiaryReader', () => {
  it('keeps the ruled sheet inside the scrolling viewport while the masthead stays outside', async () => {
    render(
      <DiaryReader
        diary={diary}
        requestedDayKey="2026-08-08"
        refreshVersion={0}
        onDayChange={vi.fn()}
      />
    )

    const entry = await screen.findByText('Первая страница')
    const ruledSheet = entry.closest('.diary-reader-ruled-sheet')
    const viewport = ruledSheet?.parentElement
    const masthead = screen.getByText('Личный дневник').closest('header')

    expect(ruledSheet).toHaveClass('diary-ruled-surface')
    expect(viewport).toHaveClass('diary-reader-scroll-viewport')
    expect(viewport).not.toContainElement(masthead)
  })

  it('commits a keyboard page turn after StPageFlip finishes the page curl', async () => {
    const onDayChange = vi.fn()

    render(
      <DiaryReader
        diary={diary}
        requestedDayKey="2026-08-08"
        refreshVersion={0}
        onDayChange={onDayChange}
      />
    )

    await screen.findByText('Первая страница')
    expect(onDayChange).toHaveBeenLastCalledWith('2026-08-08')

    fireEvent.keyDown(window, { key: 'ArrowRight' })

    await waitFor(() =>
      expect(mocks.getDay).toHaveBeenLastCalledWith({
        diaryId: diary.id,
        dayKey: '2026-08-09'
      })
    )

    expect(await screen.findByTestId('mock-pageflip')).toBeInTheDocument()

    await waitFor(() => expect(onDayChange).toHaveBeenLastCalledWith('2026-08-09'))
    expect(screen.getByText('Вторая страница')).toBeInTheDocument()
  })
})
