import { ipcMain } from 'electron'

import { TASKS_IPC_CHANNELS } from '../../shared/contracts/tasks'
import {
  createTaskGroupInputSchema,
  createTaskInputSchema,
  deleteTaskGroupInputSchema,
  deleteTaskInputSchema,
  updateTaskGroupInputSchema,
  updateTaskInputSchema
} from '../../shared/validation/tasks'
import {
  createTask,
  createTaskGroup,
  deleteTask,
  deleteTaskGroup,
  listTasksOverview,
  updateTask,
  updateTaskGroup
} from '../repositories/tasks.repository'
import { mainOperationTracker } from '../services/main-operation-tracker'

export function registerTasksIpcHandlers(): void {
  Object.values(TASKS_IPC_CHANNELS).forEach((channel) => ipcMain.removeHandler(channel))

  ipcMain.handle(TASKS_IPC_CHANNELS.listOverview, () =>
    mainOperationTracker.run(() => listTasksOverview())
  )
  ipcMain.handle(TASKS_IPC_CHANNELS.createGroup, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => createTaskGroup(createTaskGroupInputSchema.parse(rawInput)))
  )
  ipcMain.handle(TASKS_IPC_CHANNELS.updateGroup, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => updateTaskGroup(updateTaskGroupInputSchema.parse(rawInput)))
  )
  ipcMain.handle(TASKS_IPC_CHANNELS.deleteGroup, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => deleteTaskGroup(deleteTaskGroupInputSchema.parse(rawInput)))
  )
  ipcMain.handle(TASKS_IPC_CHANNELS.createTask, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => createTask(createTaskInputSchema.parse(rawInput)))
  )
  ipcMain.handle(TASKS_IPC_CHANNELS.updateTask, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => updateTask(updateTaskInputSchema.parse(rawInput)))
  )
  ipcMain.handle(TASKS_IPC_CHANNELS.deleteTask, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => deleteTask(deleteTaskInputSchema.parse(rawInput)))
  )
}
