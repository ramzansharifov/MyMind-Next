import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { DiaryReport, DiarySummary } from '../../../../../shared/contracts/diary'

const mocks = vi.hoisted(() => ({
  getReport: vi.fn()
}))

vi.mock('../api/diary-client', () => ({ diaryClient: mocks }))

import { DiaryReports } from './DiaryReports'

const diary: DiarySummary = {
  id: 'diary-default',
  title: 'Личный дневник',
  icon: 'book-heart',
  paperPattern: 'ruled',
  paperTone: 'natural',
  pageCount: 0,
  entryCount: 0,
  lastActivityAt: 1,
  createdAt: 1,
  updatedAt: 1
}

const emptyReport: DiaryReport = {
  diaryId: diary.id,
  fromDay: null,
  toDay: null,
  pageCount: 0,
  activeDays: 0,
  entryCount: 0,
  moodDays: 0,
  averageEntriesPerActiveDay: 0,
  averageMoodScore: null,
  moodBreakdown: [
    { mood: 'excellent', count: 0, sharePercent: 0 },
    { mood: 'good', count: 0, sharePercent: 0 },
    { mood: 'neutral', count: 0, sharePercent: 0 },
    { mood: 'difficult', count: 0, sharePercent: 0 },
    { mood: 'bad', count: 0, sharePercent: 0 }
  ],
  timeline: []
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getReport.mockResolvedValue(emptyReport)
})

describe('DiaryReports', () => {
  it('passes an explicit local day range for custom reports', async () => {
    const user = userEvent.setup()

    render(<DiaryReports diary={diary} refreshVersion={0} />)

    await screen.findByText('Распределение настроения')
    await user.click(screen.getByRole('button', { name: 'Свой период' }))

    fireEvent.change(screen.getByLabelText('С даты'), {
      target: { value: '2026-07-01' }
    })
    fireEvent.change(screen.getByLabelText('По дату'), {
      target: { value: '2026-08-08' }
    })

    await waitFor(() =>
      expect(mocks.getReport).toHaveBeenLastCalledWith({
        diaryId: diary.id,
        fromDay: '2026-07-01',
        toDay: '2026-08-08'
      })
    )
  })
})
