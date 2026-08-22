import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { HabitGroupRecord, HabitRecord } from '../../../../shared/contracts/habits'

const mocks = vi.hoisted(() => ({
  listOverview: vi.fn(),
  createGroup: vi.fn(),
  updateGroup: vi.fn(),
  deleteGroup: vi.fn(),
  createHabit: vi.fn(),
  updateHabit: vi.fn(),
  deleteHabit: vi.fn(),
  upsertEntry: vi.fn(),
  deleteEntry: vi.fn(),
  getReport: vi.fn()
}))

vi.mock('./api/habits-client', () => ({ habitsClient: mocks }))

import { HabitsPage } from './HabitsPage'

function todayKey(): string {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`
}

const healthGroup: HabitGroupRecord = {
  id: 'group-health',
  name: 'Здоровье',
  icon: 'heart-pulse',
  color: 'emerald',
  position: 0,
  createdAt: 1,
  updatedAt: 1
}

function makeHabit(): HabitRecord {
  return {
    id: 'habit-water',
    title: 'Пить воду',
    groupId: healthGroup.id,
    trackingType: 'check',
    targetValue: 1,
    unit: '',
    repeatEveryDays: 1,
    preferredTime: '09:00',
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  const habit = makeHabit()
  mocks.listOverview.mockResolvedValue({ groups: [healthGroup], habits: [habit], entries: [] })
  mocks.upsertEntry.mockImplementation(async (input) => ({
    id: 'entry-1',
    ...input,
    createdAt: 3,
    updatedAt: 3
  }))
  mocks.deleteEntry.mockResolvedValue(true)
  mocks.getReport.mockResolvedValue({
    dateFrom: todayKey(),
    dateTo: todayKey(),
    summary: {
      scheduled: 1,
      completed: 1,
      missed: 0,
      skipped: 0,
      pending: 0,
      completionRate: 100
    },
    days: [
      {
        date: todayKey(),
        scheduled: 1,
        completed: 1,
        missed: 0,
        skipped: 0,
        pending: 0,
        completionRate: 100
      }
    ],
    habits: [
      {
        habitId: habit.id,
        title: habit.title,
        groupId: habit.groupId,
        trackingType: habit.trackingType,
        targetValue: habit.targetValue,
        unit: habit.unit,
        repeatEveryDays: habit.repeatEveryDays,
        scheduled: 1,
        completed: 1,
        missed: 0,
        skipped: 0,
        pending: 0,
        completionRate: 100,
        currentStreak: 1,
        bestStreak: 1,
        totalValue: 1
      }
    ]
  })
})

describe('HabitsPage', () => {
  it('shows groups, recurrence and habits scheduled for today', async () => {
    render(<HabitsPage />)

    expect(await screen.findByRole('heading', { name: 'Привычки' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Здоровье/ })).toBeInTheDocument()
    expect(screen.getByText('Пить воду')).toBeInTheDocument()
    expect(screen.getByText('Каждый день')).toBeInTheDocument()
  })

  it('does not expose removed habit fields in the editor', async () => {
    const user = userEvent.setup()
    render(<HabitsPage />)

    await user.click(await screen.findByRole('button', { name: 'Новая привычка' }))

    expect(await screen.findByText('Предпочтительное время')).toBeInTheDocument()
    expect(screen.queryByText('Описание')).not.toBeInTheDocument()
    expect(screen.queryByText('Состояние')).not.toBeInTheDocument()
    expect(screen.queryByText('Период действия')).not.toBeInTheDocument()
  })

  it('marks a check habit complete for the selected date', async () => {
    const user = userEvent.setup()
    render(<HabitsPage />)

    await user.click(
      await screen.findByRole('button', { name: 'Выполнить привычку «Пить воду»' })
    )

    await waitFor(() =>
      expect(mocks.upsertEntry).toHaveBeenCalledWith({
        habitId: 'habit-water',
        date: todayKey(),
        value: 1,
        skipped: false
      })
    )
  })

  it('opens a dedicated reports page with completion analytics', async () => {
    const user = userEvent.setup()
    render(<HabitsPage />)

    await user.click(await screen.findByRole('button', { name: /Отчёты/ }))

    expect(await screen.findByText('Календарь выполнения')).toBeInTheDocument()
    expect(screen.getAllByText('100%').length).toBeGreaterThan(0)
    expect(mocks.getReport).toHaveBeenCalledWith({
      dateFrom: expect.any(String),
      dateTo: expect.any(String),
      groupId: null,
      ungroupedOnly: false
    })
  })
})
