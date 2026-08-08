import { ipcMain } from 'electron'

import { DIARY_IPC_CHANNELS } from '../../shared/contracts/diary'
import {
  createDiaryEntryInputSchema,
  createDiaryInputSchema,
  deleteDiaryEntryInputSchema,
  deleteDiaryInputSchema,
  getDiaryDayInputSchema,
  getDiaryReportInputSchema,
  listDiaryDaysInputSchema,
  setDiaryMoodInputSchema,
  updateDiaryEntryInputSchema,
  updateDiaryInputSchema
} from '../../shared/validation/diary'
import {
  createDiary,
  createDiaryEntry,
  deleteDiary,
  deleteDiaryEntry,
  getDiaryDay,
  getDiaryReport,
  listDiaryDays,
  listDiaryOverview,
  setDiaryMood,
  updateDiary,
  updateDiaryEntry
} from '../repositories/diary.repository'
import { mainOperationTracker } from '../services/main-operation-tracker'

export function registerDiaryIpcHandlers(): void {
  Object.values(DIARY_IPC_CHANNELS).forEach((channel) => ipcMain.removeHandler(channel))

  ipcMain.handle(DIARY_IPC_CHANNELS.listOverview, () =>
    mainOperationTracker.run(() => listDiaryOverview())
  )
  ipcMain.handle(DIARY_IPC_CHANNELS.createDiary, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => createDiary(createDiaryInputSchema.parse(rawInput)))
  )
  ipcMain.handle(DIARY_IPC_CHANNELS.updateDiary, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => updateDiary(updateDiaryInputSchema.parse(rawInput)))
  )
  ipcMain.handle(DIARY_IPC_CHANNELS.deleteDiary, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => deleteDiary(deleteDiaryInputSchema.parse(rawInput)))
  )
  ipcMain.handle(DIARY_IPC_CHANNELS.getDay, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => getDiaryDay(getDiaryDayInputSchema.parse(rawInput)))
  )
  ipcMain.handle(DIARY_IPC_CHANNELS.listDays, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => listDiaryDays(listDiaryDaysInputSchema.parse(rawInput)))
  )
  ipcMain.handle(DIARY_IPC_CHANNELS.setMood, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => setDiaryMood(setDiaryMoodInputSchema.parse(rawInput)))
  )
  ipcMain.handle(DIARY_IPC_CHANNELS.createEntry, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => createDiaryEntry(createDiaryEntryInputSchema.parse(rawInput)))
  )
  ipcMain.handle(DIARY_IPC_CHANNELS.updateEntry, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => updateDiaryEntry(updateDiaryEntryInputSchema.parse(rawInput)))
  )
  ipcMain.handle(DIARY_IPC_CHANNELS.deleteEntry, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => deleteDiaryEntry(deleteDiaryEntryInputSchema.parse(rawInput)))
  )
  ipcMain.handle(DIARY_IPC_CHANNELS.getReport, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => getDiaryReport(getDiaryReportInputSchema.parse(rawInput)))
  )
}
