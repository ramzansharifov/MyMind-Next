import { BrowserWindow, ipcMain } from 'electron'

import { WORKOUTS_IPC_CHANNELS } from '../../shared/contracts/workouts'
import {
  createWorkoutExerciseInputSchema,
  createWorkoutProgramInputSchema,
  createWorkoutProgressEntryInputSchema,
  createWorkoutSessionInputSchema,
  deleteWorkoutExerciseInputSchema,
  deleteWorkoutProgramInputSchema,
  deleteWorkoutProgressEntryInputSchema,
  deleteWorkoutProgressPhotoInputSchema,
  deleteWorkoutSessionInputSchema,
  getWorkoutSessionInputSchema,
  importWorkoutProgressPhotoInputSchema,
  updateWorkoutExerciseInputSchema,
  updateWorkoutProgramInputSchema,
  updateWorkoutProgressEntryInputSchema,
  updateWorkoutSessionInputSchema,
  workoutReportInputSchema
} from '../../shared/validation/workouts'
import { getSqlite } from '../database/client'
import {
  createWorkoutExercise,
  createWorkoutProgram,
  createWorkoutProgressEntry,
  createWorkoutSession,
  deleteWorkoutExercise,
  deleteWorkoutProgram,
  deleteWorkoutProgressEntry,
  deleteWorkoutSession,
  getWorkoutReport,
  getWorkoutSession,
  listWorkoutsOverview,
  updateWorkoutExercise,
  updateWorkoutProgram,
  updateWorkoutProgressEntry,
  updateWorkoutSession
} from '../repositories/workouts.repository'
import { mainOperationTracker } from '../services/main-operation-tracker'
import {
  importWorkoutProgressPhoto,
  removeWorkoutProgressEntryAssets,
  removeWorkoutProgressPhoto
} from '../services/workout-progress-assets'

function assertExerciseCanBeDeleted(id: string): void {
  const reference = getSqlite()
    .prepare(
      `SELECT 1 AS referenced FROM workout_program_exercises WHERE exercise_id = ?
       UNION ALL
       SELECT 1 AS referenced FROM workout_session_exercises WHERE exercise_id = ?
       UNION ALL
       SELECT 1 AS referenced FROM workout_progress_metrics WHERE exercise_id = ?
       LIMIT 1`
    )
    .get(id, id, id)

  if (reference) {
    throw new Error(
      'Упражнение уже используется в программе, истории тренировок или прогрессе. Архивируйте его вместо удаления.'
    )
  }
}

export function registerWorkoutsIpcHandlers(): void {
  Object.values(WORKOUTS_IPC_CHANNELS).forEach((channel) => ipcMain.removeHandler(channel))

  ipcMain.handle(WORKOUTS_IPC_CHANNELS.listOverview, () =>
    mainOperationTracker.run(() => listWorkoutsOverview())
  )
  ipcMain.handle(WORKOUTS_IPC_CHANNELS.createExercise, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() =>
      createWorkoutExercise(createWorkoutExerciseInputSchema.parse(rawInput))
    )
  )
  ipcMain.handle(WORKOUTS_IPC_CHANNELS.updateExercise, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() =>
      updateWorkoutExercise(updateWorkoutExerciseInputSchema.parse(rawInput))
    )
  )
  ipcMain.handle(WORKOUTS_IPC_CHANNELS.deleteExercise, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => {
      const input = deleteWorkoutExerciseInputSchema.parse(rawInput)
      assertExerciseCanBeDeleted(input.id)
      return deleteWorkoutExercise(input)
    })
  )
  ipcMain.handle(WORKOUTS_IPC_CHANNELS.createProgram, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() =>
      createWorkoutProgram(createWorkoutProgramInputSchema.parse(rawInput))
    )
  )
  ipcMain.handle(WORKOUTS_IPC_CHANNELS.updateProgram, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() =>
      updateWorkoutProgram(updateWorkoutProgramInputSchema.parse(rawInput))
    )
  )
  ipcMain.handle(WORKOUTS_IPC_CHANNELS.deleteProgram, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() =>
      deleteWorkoutProgram(deleteWorkoutProgramInputSchema.parse(rawInput))
    )
  )
  ipcMain.handle(WORKOUTS_IPC_CHANNELS.createSession, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() =>
      createWorkoutSession(createWorkoutSessionInputSchema.parse(rawInput))
    )
  )
  ipcMain.handle(WORKOUTS_IPC_CHANNELS.updateSession, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() =>
      updateWorkoutSession(updateWorkoutSessionInputSchema.parse(rawInput))
    )
  )
  ipcMain.handle(WORKOUTS_IPC_CHANNELS.deleteSession, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() =>
      deleteWorkoutSession(deleteWorkoutSessionInputSchema.parse(rawInput))
    )
  )
  ipcMain.handle(WORKOUTS_IPC_CHANNELS.getSession, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => {
      const input = getWorkoutSessionInputSchema.parse(rawInput)
      return getWorkoutSession(input.id)
    })
  )
  ipcMain.handle(WORKOUTS_IPC_CHANNELS.createProgressEntry, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() =>
      createWorkoutProgressEntry(createWorkoutProgressEntryInputSchema.parse(rawInput))
    )
  )
  ipcMain.handle(WORKOUTS_IPC_CHANNELS.updateProgressEntry, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() =>
      updateWorkoutProgressEntry(updateWorkoutProgressEntryInputSchema.parse(rawInput))
    )
  )
  ipcMain.handle(WORKOUTS_IPC_CHANNELS.deleteProgressEntry, (_event, rawInput: unknown) =>
    mainOperationTracker.run(async () => {
      const input = deleteWorkoutProgressEntryInputSchema.parse(rawInput)
      const deleted = deleteWorkoutProgressEntry(input)
      if (deleted) await removeWorkoutProgressEntryAssets(input.id)
      return deleted
    })
  )
  ipcMain.handle(WORKOUTS_IPC_CHANNELS.importProgressPhoto, (event, rawInput: unknown) =>
    mainOperationTracker.run(() => {
      if (!event.senderFrame || event.senderFrame !== event.sender.mainFrame) {
        throw new Error('Untrusted workout photo request')
      }
      const input = importWorkoutProgressPhotoInputSchema.parse(rawInput)
      const parentWindow = BrowserWindow.fromWebContents(event.sender)
      return importWorkoutProgressPhoto(input.entryId, parentWindow)
    })
  )
  ipcMain.handle(WORKOUTS_IPC_CHANNELS.deleteProgressPhoto, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => {
      const input = deleteWorkoutProgressPhotoInputSchema.parse(rawInput)
      return removeWorkoutProgressPhoto(input.id)
    })
  )
  ipcMain.handle(WORKOUTS_IPC_CHANNELS.getReport, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => getWorkoutReport(workoutReportInputSchema.parse(rawInput)))
  )
}
