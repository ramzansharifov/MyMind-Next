import { createTasksRepository } from '@mymind/persistence/tasks'
import { desktopRepositoryRuntime } from '../database/repository-runtime'

export const {
  listTasksOverview,
  createTaskGroup,
  updateTaskGroup,
  deleteTaskGroup,
  createTask,
  updateTask,
  deleteTask
} = createTasksRepository(desktopRepositoryRuntime)
