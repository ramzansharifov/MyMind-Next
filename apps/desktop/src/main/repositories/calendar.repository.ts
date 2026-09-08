import { createCalendarRepository } from '@mymind/persistence/calendar'
import { desktopRepositoryRuntime } from '../database/repository-runtime'

export const {
  calculateCalendarElapsed,
  listCalendarOccurrences,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  setCalendarOccurrenceNote,
  setCalendarOccurrenceHidden,
  listCalendarReminderTriggers,
  listDueCalendarReminders,
  markCalendarReminderDelivered,
  listUnreadCalendarReminders,
  acknowledgeCalendarReminder
} = createCalendarRepository(desktopRepositoryRuntime)
