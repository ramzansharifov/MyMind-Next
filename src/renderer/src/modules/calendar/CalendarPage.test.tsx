import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CalendarOccurrenceRecord } from '../../../../shared/contracts/calendar'
import { CalendarPage } from './CalendarPage'

const mocks = vi.hoisted(() => ({
  listRange: vi.fn(),
  listUpcomingReminders: vi.fn(),
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
  setOccurrenceNote: vi.fn(),
  setOccurrenceHidden: vi.fn()
}))

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function todayKey(): string {
  const date = new Date()
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

beforeEach(() => {
  vi.clearAllMocks()
  const occurrenceDate = todayKey()
  const year = Number(occurrenceDate.slice(0, 4))
  const annualEvent: CalendarOccurrenceRecord = {
    eventId: '00000000-0000-4000-8000-000000000001',
    title: 'Годовщина',
    kind: 'annual',
    occurrenceDate,
    time: '19:00',
    startDate: `${year - 5}${occurrenceDate.slice(4)}`,
    note: 'Заказать столик на этот год',
    hidden: false,
    reminderOffsets: [1440, 120],
    elapsed: { years: 5, months: 0, days: 0 }
  }

  mocks.listRange.mockResolvedValue([annualEvent])
  mocks.listUpcomingReminders.mockResolvedValue([])
  mocks.deleteEvent.mockResolvedValue(true)
  mocks.setOccurrenceNote.mockResolvedValue(null)
  mocks.setOccurrenceHidden.mockResolvedValue(null)

  Object.defineProperty(window, 'api', {
    configurable: true,
    value: { calendar: mocks }
  })
})

describe('CalendarPage', () => {
  it('keeps month navigation inside the calendar and shows event details in the right panel', async () => {
    const user = userEvent.setup()
    render(<CalendarPage />)

    const eventButton = await screen.findByRole('button', { name: 'Открыть событие Годовщина' })
    const calendarGrid = screen.getByTestId('calendar-grid')
    const detailPanel = screen.getByTestId('calendar-detail-panel')
    const moduleHeader = screen
      .getByRole('heading', { name: 'Календарь' })
      .closest('[data-module-header]')

    expect(calendarGrid).toContainElement(screen.getByRole('button', { name: 'Предыдущий месяц' }))
    expect(calendarGrid).toContainElement(screen.getByRole('button', { name: 'Следующий месяц' }))
    expect(calendarGrid).toContainElement(screen.getByRole('button', { name: 'Сегодня' }))
    expect(calendarGrid).toContainElement(screen.getByLabelText('Точная дата календаря'))
    expect(moduleHeader).not.toContainElement(
      screen.getByRole('button', { name: 'Предыдущий месяц' })
    )

    await user.click(eventButton)

    expect(within(detailPanel).getByRole('heading', { name: 'Годовщина' })).toBeInTheDocument()
    expect(within(detailPanel).getByText('Ежегодное')).toBeInTheDocument()
    expect(within(detailPanel).getByText('Заказать столик на этот год')).toBeInTheDocument()
    expect(within(detailPanel).getByText('За 1 день')).toBeInTheDocument()
    expect(within(detailPanel).getByText('За 2 часа')).toBeInTheDocument()
    expect(within(detailPanel).getByText('Прошло 5 лет, 0 дней')).toBeInTheDocument()
    const editButton = within(detailPanel).getByRole('button', { name: 'Редактировать событие' })
    expect(editButton).toBeInTheDocument()

    await user.click(editButton)

    expect(screen.getByLabelText('День ежегодного события')).toBeInTheDocument()
    expect(screen.getByLabelText('Месяц ежегодного события')).toBeInTheDocument()
    expect(screen.getByLabelText('Год начала')).toHaveValue(Number(todayKey().slice(0, 4)) - 5)
    expect(screen.getByLabelText('Часы события')).toBeInTheDocument()
    expect(screen.getByLabelText('Минуты события')).toBeInTheDocument()
    expect(screen.queryByLabelText('Дата события')).not.toBeInTheDocument()
  })
})
