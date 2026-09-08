import { createHabitsRepository } from '@mymind/persistence/habits'
import { desktopRepositoryRuntime } from '../database/repository-runtime'
export type { HabitReminderTrigger } from '@mymind/persistence/habits'

export const {
  listHabitReminderTriggers,
  listDueHabitReminders,
  markHabitReminderDelivered,
  listUnreadHabitReminders,
  acknowledgeHabitReminder,
  listHabitsOverview,
  createHabitGroup,
  updateHabitGroup,
  deleteHabitGroup,
  createHabit,
  updateHabit,
  deleteHabit,
  upsertHabitEntry,
  deleteHabitEntry,
  getHabitsReport,
  isHabitScheduledOn
} = createHabitsRepository(desktopRepositoryRuntime)
