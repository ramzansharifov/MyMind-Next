import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { HabitGroupRecord, HabitRecord } from '../../../../shared/contracts/habits'
import { TooltipProvider } from '../../shared/ui/tooltip'

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

function renderHabitsPage(): ReturnType<typeof render> {
  return render(
    <TooltipProvider>
      <HabitsPage />
    </TooltipProvider>
  )
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

function makeHabit(overrides: Partial<HabitRecord> = {}): HabitRecord {
  return {
    id: 'habit-water',
    title: 'Пить воду',
    groupId: healthGroup.id,
    trackingType: 'check',
    targetValue: 1,
    unit: '',
    repeatEveryDays: 1,
    preferredTimes: [{ unit: 1, time: '09:00' }],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  const habit = makeHabit()
  mocks.listOverview.mockResolvedValue({ groups: [healthGroup], habits: [habit], entries: [] })
  mocks.deleteHabit.mockResolvedValue(true)
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
  it('shows the habit cleanly and moves metadata into the details popover', async () => {
    const user = userEvent.setup()
    renderHabitsPage()

    expect(await screen.findByRole('heading', { name: 'Привычки' })).toBeInTheDocument()
    expect(screen.getByText('Пить воду')).toBeInTheDocument()
    expect(screen.queryByText('Каждый день')).not.toBeInTheDocument()
    expect(screen.queryByText('09:00')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Подробнее о привычке «Пить воду»' }))

    const popover = await screen.findByTestId('habit-details-popover')
    expect(popover).toHaveTextContent('Здоровье')
    expect(popover).toHaveTextContent('Каждый день')
    expect(popover).toHaveTextContent('09:00')
  })

  it('does not truncate a long habit title', async () => {
    const longTitle =
      'Пить креатин и ещё что-нибудь делать потом там например по дому и обязательно дописать привычку полностью'
    mocks.listOverview.mockResolvedValue({
      groups: [healthGroup],
      habits: [makeHabit({ title: longTitle })],
      entries: []
    })

    renderHabitsPage()

    const title = await screen.findByText(longTitle)
    expect(title).not.toHaveClass('truncate')
    expect(title).toHaveClass('whitespace-normal')
  })

  it('keeps search, views and date navigation in the header and opens the custom calendar', async () => {
    const user = userEvent.setup()
    renderHabitsPage()

    expect(await screen.findByRole('searchbox', { name: 'Поиск по привычкам' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Сегодня', pressed: true })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Все привычки', pressed: false })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Отчёты', pressed: false })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Предыдущий день' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Следующий день' })).toBeDisabled()
    expect(document.querySelector('input[type="date"]')).not.toBeInTheDocument()
    expect(screen.queryByText('Выполнено')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Открыть календарь привычек' }))
    expect(await screen.findByTestId('habit-date-picker-popover')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Предыдущий месяц' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Следующий месяц' })).toBeDisabled()
  })

  it('does not expose removed habit fields in the editor', async () => {
    const user = userEvent.setup()
    renderHabitsPage()

    await user.click(await screen.findByRole('button', { name: 'Новая привычка' }))

    expect(await screen.findByText('Предпочтительное время')).toBeInTheDocument()
    expect(screen.queryByText('Описание')).not.toBeInTheDocument()
    expect(screen.queryByText('Состояние')).not.toBeInTheDocument()
    expect(screen.queryByText('Период действия')).not.toBeInTheDocument()
  })

  it('marks a check habit complete when the habit itself is clicked', async () => {
    const user = userEvent.setup()
    renderHabitsPage()

    await user.click(await screen.findByRole('button', { name: 'Выполнить привычку «Пить воду»' }))

    await waitFor(() =>
      expect(mocks.upsertEntry).toHaveBeenCalledWith({
        habitId: 'habit-water',
        date: todayKey(),
        value: 1,
        skipped: false
      })
    )
    await waitFor(() =>
      expect(document.querySelector('[data-habit-row="habit-water"]')).toHaveAttribute(
        'data-completed',
        'true'
      )
    )
    expect(screen.queryByText('Выполнено')).not.toBeInTheDocument()
  })

  it('adds one count unit per habit click and keeps progress controls in the details popover', async () => {
    const user = userEvent.setup()
    const habit = makeHabit({
      trackingType: 'count',
      targetValue: 3,
      unit: 'приёма',
      preferredTimes: [
        { unit: 1, time: '09:00' },
        { unit: 2, time: '15:00' },
        { unit: 3, time: '21:00' }
      ]
    })
    mocks.listOverview.mockResolvedValue({ groups: [healthGroup], habits: [habit], entries: [] })

    renderHabitsPage()

    await user.click(
      await screen.findByRole('button', {
        name: 'Добавить выполнение привычки «Пить воду»: 0 из 3'
      })
    )
    await user.click(
      await screen.findByRole('button', {
        name: 'Добавить выполнение привычки «Пить воду»: 1 из 3'
      })
    )
    await user.click(
      await screen.findByRole('button', {
        name: 'Добавить выполнение привычки «Пить воду»: 2 из 3'
      })
    )

    expect(mocks.upsertEntry).toHaveBeenNthCalledWith(1, {
      habitId: 'habit-water',
      date: todayKey(),
      value: 1,
      skipped: false
    })
    expect(mocks.upsertEntry).toHaveBeenNthCalledWith(2, {
      habitId: 'habit-water',
      date: todayKey(),
      value: 2,
      skipped: false
    })
    expect(mocks.upsertEntry).toHaveBeenNthCalledWith(3, {
      habitId: 'habit-water',
      date: todayKey(),
      value: 3,
      skipped: false
    })
    await waitFor(() =>
      expect(document.querySelector('[data-habit-row="habit-water"]')).toHaveAttribute(
        'data-completed',
        'true'
      )
    )

    await user.click(screen.getByRole('button', { name: 'Подробнее о привычке «Пить воду»' }))
    const popover = await screen.findByTestId('habit-details-popover')
    expect(popover).toHaveTextContent('3 / 3 приёма')
    expect(popover).toHaveTextContent('1 · 09:00')
    expect(popover).toHaveTextContent('2 · 15:00')
    expect(popover).toHaveTextContent('3 · 21:00')
  })

  it('deletes a habit from the details popover after confirmation', async () => {
    const user = userEvent.setup()
    renderHabitsPage()

    await user.click(
      await screen.findByRole('button', { name: 'Подробнее о привычке «Пить воду»' })
    )
    await user.click(screen.getByRole('button', { name: 'Удалить привычку «Пить воду»' }))

    expect(await screen.findByRole('heading', { name: 'Удалить привычку?' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Удалить' }))

    await waitFor(() => expect(mocks.deleteHabit).toHaveBeenCalledWith({ id: 'habit-water' }))
    await waitFor(() => expect(screen.queryByText('Пить воду')).not.toBeInTheDocument())
  })

  it('opens a dedicated reports page with completion analytics', async () => {
    const user = userEvent.setup()
    renderHabitsPage()

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
