import { ipcMain } from 'electron'

import { HABITS_IPC_CHANNELS } from '../../shared/contracts/habits'
import {
  createHabitGroupInputSchema,
  createHabitInputSchema,
  deleteHabitEntryInputSchema,
  deleteHabitGroupInputSchema,
  deleteHabitInputSchema,
  habitAcknowledgeReminderInputSchema,
  habitReportInputSchema,
  habitsOverviewInputSchema,
  updateHabitGroupInputSchema,
  updateHabitInputSchema,
  upsertHabitEntryInputSchema
} from '../../shared/validation/habits'
import {
  acknowledgeHabitReminder,
  createHabit,
  createHabitGroup,
  deleteHabit,
  deleteHabitEntry,
  deleteHabitGroup,
  getHabitsReport,
  listHabitsOverview,
  listUnreadHabitReminders,
  updateHabit,
  updateHabitGroup,
  upsertHabitEntry
} from '../repositories/habits.repository'
import { mainOperationTracker } from '../services/main-operation-tracker'

export function registerHabitsIpcHandlers(): void {
  Object.values(HABITS_IPC_CHANNELS).forEach((channel) => ipcMain.removeHandler(channel))

  ipcMain.handle(HABITS_IPC_CHANNELS.listOverview, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => listHabitsOverview(habitsOverviewInputSchema.parse(rawInput)))
  )
  ipcMain.handle(HABITS_IPC_CHANNELS.listUnreadReminders, () =>
    mainOperationTracker.run(() => listUnreadHabitReminders())
  )
  ipcMain.handle(HABITS_IPC_CHANNELS.acknowledgeReminder, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() =>
      acknowledgeHabitReminder(habitAcknowledgeReminderInputSchema.parse(rawInput))
    )
  )
  ipcMain.handle(HABITS_IPC_CHANNELS.createGroup, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => createHabitGroup(createHabitGroupInputSchema.parse(rawInput)))
  )
  ipcMain.handle(HABITS_IPC_CHANNELS.updateGroup, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => updateHabitGroup(updateHabitGroupInputSchema.parse(rawInput)))
  )
  ipcMain.handle(HABITS_IPC_CHANNELS.deleteGroup, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => deleteHabitGroup(deleteHabitGroupInputSchema.parse(rawInput)))
  )
  ipcMain.handle(HABITS_IPC_CHANNELS.createHabit, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => createHabit(createHabitInputSchema.parse(rawInput)))
  )
  ipcMain.handle(HABITS_IPC_CHANNELS.updateHabit, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => updateHabit(updateHabitInputSchema.parse(rawInput)))
  )
  ipcMain.handle(HABITS_IPC_CHANNELS.deleteHabit, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => deleteHabit(deleteHabitInputSchema.parse(rawInput)))
  )
  ipcMain.handle(HABITS_IPC_CHANNELS.upsertEntry, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => upsertHabitEntry(upsertHabitEntryInputSchema.parse(rawInput)))
  )
  ipcMain.handle(HABITS_IPC_CHANNELS.deleteEntry, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => deleteHabitEntry(deleteHabitEntryInputSchema.parse(rawInput)))
  )
  ipcMain.handle(HABITS_IPC_CHANNELS.getReport, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => getHabitsReport(habitReportInputSchema.parse(rawInput)))
  )
}
