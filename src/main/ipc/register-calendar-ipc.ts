import { ipcMain } from 'electron'

import { CALENDAR_IPC_CHANNELS } from '../../shared/contracts/calendar'
import {
  calendarCreateEventInputSchema,
  calendarDeleteEventInputSchema,
  calendarRangeInputSchema,
  calendarSetOccurrenceHiddenInputSchema,
  calendarSetOccurrenceNoteInputSchema,
  calendarUpdateEventInputSchema
} from '../../shared/validation/calendar'
import {
  createCalendarEvent,
  deleteCalendarEvent,
  listCalendarOccurrences,
  listCalendarReminderTriggers,
  setCalendarOccurrenceHidden,
  setCalendarOccurrenceNote,
  updateCalendarEvent
} from '../repositories/calendar.repository'
import { mainOperationTracker } from '../services/main-operation-tracker'

export function registerCalendarIpcHandlers(): void {
  for (const channel of Object.values(CALENDAR_IPC_CHANNELS)) ipcMain.removeHandler(channel)

  ipcMain.handle(CALENDAR_IPC_CHANNELS.listRange, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => listCalendarOccurrences(calendarRangeInputSchema.parse(rawInput)))
  )
  ipcMain.handle(CALENDAR_IPC_CHANNELS.listUpcomingReminders, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() =>
      listCalendarReminderTriggers(calendarRangeInputSchema.parse(rawInput))
    )
  )
  ipcMain.handle(CALENDAR_IPC_CHANNELS.createEvent, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => createCalendarEvent(calendarCreateEventInputSchema.parse(rawInput)))
  )
  ipcMain.handle(CALENDAR_IPC_CHANNELS.updateEvent, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => updateCalendarEvent(calendarUpdateEventInputSchema.parse(rawInput)))
  )
  ipcMain.handle(CALENDAR_IPC_CHANNELS.deleteEvent, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => {
      const input = calendarDeleteEventInputSchema.parse(rawInput)
      return deleteCalendarEvent(input.id)
    })
  )
  ipcMain.handle(CALENDAR_IPC_CHANNELS.setOccurrenceNote, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() =>
      setCalendarOccurrenceNote(calendarSetOccurrenceNoteInputSchema.parse(rawInput))
    )
  )
  ipcMain.handle(CALENDAR_IPC_CHANNELS.setOccurrenceHidden, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() =>
      setCalendarOccurrenceHidden(calendarSetOccurrenceHiddenInputSchema.parse(rawInput))
    )
  )
}
