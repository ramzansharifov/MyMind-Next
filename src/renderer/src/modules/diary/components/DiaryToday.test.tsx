import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { DiaryDay, DiarySummary } from '../../../../../shared/contracts/diary'

const mocks = vi.hoisted(() => ({
  getDay: vi.fn(),
  setMood: vi.fn(),
  createEntry: vi.fn(),
  updateEntry: vi.fn(),
  deleteEntry: vi.fn()
}))

vi.mock('../api/diary-client', () => ({ diaryClient: mocks }))

import { DiaryToday } from './DiaryToday'

const diary: DiarySummary = {
  id: 'diary-default',
  title: 'Личный дневник',
  icon: 'book-heart',
  pageCount: 0,
  entryCount: 0,
  lastActivityAt: 1,
  createdAt: 1,
  updatedAt: 1
}

const moodOnlyDay: DiaryDay = {
  id: 'day-1',
  diaryId: diary.id,
  dayKey: '2026-08-08',
  mood: 'good',
  entryCount: 0,
  entries: [],
  createdAt: 1,
  updatedAt: 2
}

const dayWithEntry: DiaryDay = {
  ...moodOnlyDay,
  entryCount: 1,
  entries: [
    {
      id: 'entry-1',
      diaryDayId: 'day-1',
      text: 'Сегодня было спокойно.',
      occurredAt: 1_786_185_600_000,
      createdAt: 1_786_185_600_000,
      updatedAt: 1_786_185_600_000
    }
  ]
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getDay.mockResolvedValue(null)
  mocks.setMood.mockResolvedValue(moodOnlyDay)
  mocks.createEntry.mockResolvedValue(dayWithEntry.entries[0])
  mocks.updateEntry.mockResolvedValue(dayWithEntry.entries[0])
  mocks.deleteEntry.mockResolvedValue(true)
})

describe('DiaryToday', () => {
  it('stores one mood for the whole local diary day', async () => {
    const user = userEvent.setup()
    const onChanged = vi.fn()

    render(<DiaryToday diary={diary} dayKey="2026-08-08" onChanged={onChanged} />)

    await screen.findByText('Здесь пока тихо. Добавьте первую мысль этого дня.')
    await user.click(screen.getByRole('button', { name: /Хорошее/ }))

    await waitFor(() =>
      expect(mocks.setMood).toHaveBeenCalledWith({
        diaryId: diary.id,
        dayKey: '2026-08-08',
        mood: 'good'
      })
    )
    expect(onChanged).toHaveBeenCalled()
  })

  it('adds multiple quick notes to the same day instead of creating pages in the UI', async () => {
    const user = userEvent.setup()
    const onChanged = vi.fn()
    mocks.getDay.mockResolvedValueOnce(moodOnlyDay).mockResolvedValueOnce(dayWithEntry)

    render(<DiaryToday diary={diary} dayKey="2026-08-08" onChanged={onChanged} />)

    const editor = await screen.findByPlaceholderText('Что хочется запомнить?')
    await user.type(editor, 'Сегодня было спокойно.')
    await user.click(screen.getByRole('button', { name: 'Добавить запись' }))

    await waitFor(() =>
      expect(mocks.createEntry).toHaveBeenCalledWith({
        diaryId: diary.id,
        dayKey: '2026-08-08',
        text: 'Сегодня было спокойно.'
      })
    )
    expect(await screen.findByText('Сегодня было спокойно.')).toBeInTheDocument()
    expect(onChanged).toHaveBeenCalled()
  })
})
