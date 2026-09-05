import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'

import type { HabitUnreadReminderRecord } from '../../../../shared/contracts/habits'
import { HabitReminderInbox } from './HabitReminderInbox'

it('keeps an unread habit reminder visible until the explicit Понятно action is used', async () => {
  const user = userEvent.setup()
  const onAcknowledge = vi.fn().mockResolvedValue(undefined)
  const reminder: HabitUnreadReminderRecord = {
    deliveryId: '00000000-0000-4000-8000-000000000020',
    habitId: '00000000-0000-4000-8000-000000000021',
    title: 'Пить воду',
    occurrenceDate: '2026-09-02',
    unit: 2,
    targetValue: 3,
    habitUnit: 'стакана',
    preferredTime: '23:45',
    triggerAt: Date.now() - 1000,
    deliveredAt: Date.now()
  }

  render(<HabitReminderInbox reminders={[reminder]} onAcknowledge={onAcknowledge} />)

  expect(screen.getByText('Пить воду')).toBeInTheDocument()
  expect(screen.getByText(/исчезнут только после/)).toBeInTheDocument()
  expect(screen.getByText(/Шаг 2 из 3/)).toBeInTheDocument()
  expect(onAcknowledge).not.toHaveBeenCalled()

  await user.click(screen.getByRole('button', { name: /Понятно/ }))
  expect(onAcknowledge).toHaveBeenCalledWith(reminder)
})
