import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'

import type { CalendarUnreadReminderRecord } from '../../../../shared/contracts/calendar'
import { CalendarReminderInbox } from './CalendarReminderInbox'

it('keeps an unread reminder visible until the explicit Понятно action is used', async () => {
  const user = userEvent.setup()
  const onAcknowledge = vi.fn().mockResolvedValue(undefined)
  const reminder: CalendarUnreadReminderRecord = {
    deliveryId: '00000000-0000-4000-8000-000000000010',
    reminderId: '00000000-0000-4000-8000-000000000011',
    eventId: '00000000-0000-4000-8000-000000000012',
    title: 'Встреча',
    occurrenceDate: '2026-08-29',
    eventTime: '10:00',
    offsetMinutes: 60,
    triggerAt: Date.now() - 1000,
    deliveredAt: Date.now()
  }

  render(<CalendarReminderInbox reminders={[reminder]} onAcknowledge={onAcknowledge} />)

  expect(screen.getByText('Встреча')).toBeInTheDocument()
  expect(screen.getByText(/исчезнут только после/)).toBeInTheDocument()
  expect(onAcknowledge).not.toHaveBeenCalled()

  await user.click(screen.getByRole('button', { name: /Понятно/ }))
  expect(onAcknowledge).toHaveBeenCalledWith(reminder)
})
