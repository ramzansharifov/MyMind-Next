import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { DiaryDay, DiaryDaySummary, DiarySummary } from '../../../../../shared/contracts/diary'

const mocks = vi.hoisted(() => ({
  listDays: vi.fn(),
  getDay: vi.fn(),
  completeCurl: null as (() => void) | null
}))

vi.mock('../api/diary-client', () => ({ diaryClient: mocks }))

vi.mock('./DiaryPageCurlOverlay', async () => {
  const React = await vi.importActual<typeof import('react')>('react')

  type MockCurlProps = {
    turn: { id: string } | null
    onComplete: () => void
  }

  function MockCurlOverlay({ turn, onComplete }: MockCurlProps): import('react').ReactElement {
    React.useEffect(() => {
      mocks.completeCurl = turn ? onComplete : null
      return () => {
        if (mocks.completeCurl === onComplete) mocks.completeCurl = null
      }
    }, [onComplete, turn])

    return React.createElement('div', {
      'data-testid': 'mock-page-curl',
      'data-active': turn ? 'true' : 'false'
    })
  }

  return { DiaryPageCurlOverlay: MockCurlOverlay }
})

import { DiaryReader } from './DiaryReader'

const diary: DiarySummary = {
  id: 'diary-default',
  title: 'Личный дневник',
  icon: 'book-heart',
  paperPattern: 'ruled',
  paperTone: 'natural',
  coverTone: 'walnut',
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
  mocks.completeCurl = null
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
    const masthead = screen.getByRole('heading', { name: /8 августа 2026/i }).closest('header')

    expect(ruledSheet).toHaveClass('diary-ruled-surface')
    expect(viewport).toHaveClass('diary-reader-scroll-viewport')
    expect(viewport).not.toContainElement(masthead)
  })

  it('commits a keyboard page turn only after the WebGL curl completes', async () => {
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

    await waitFor(() =>
      expect(screen.getByTestId('mock-page-curl')).toHaveAttribute('data-active', 'true')
    )
    expect(onDayChange).toHaveBeenLastCalledWith('2026-08-08')
    expect(mocks.completeCurl).not.toBeNull()

    act(() => {
      mocks.completeCurl?.()
    })

    await waitFor(() => expect(onDayChange).toHaveBeenLastCalledWith('2026-08-09'))
    expect(await screen.findByText('Вторая страница')).toBeInTheDocument()
  })
})
