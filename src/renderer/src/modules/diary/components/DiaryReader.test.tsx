import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  DiaryDay,
  DiaryDaySummary,
  DiarySummary
} from '../../../../../shared/contracts/diary'

const mocks = vi.hoisted(() => ({
  listDays: vi.fn(),
  getDay: vi.fn()
}))

vi.mock('../api/diary-client', () => ({ diaryClient: mocks }))

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
  it('turns pages with keyboard arrows without entering edit mode', async () => {
    const onDayChange = vi.fn()

    render(
      <DiaryReader
        diary={diary}
        requestedDayKey="2026-08-08"
        refreshVersion={0}
        onDayChange={onDayChange}
      />
    )

    expect(await screen.findByText('Первая страница')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'ArrowRight' })

    expect(await screen.findByText('Вторая страница')).toBeInTheDocument()
    await waitFor(() =>
      expect(mocks.getDay).toHaveBeenLastCalledWith({
        diaryId: diary.id,
        dayKey: '2026-08-09'
      })
    )
    expect(onDayChange).toHaveBeenLastCalledWith('2026-08-09')
  })
})
