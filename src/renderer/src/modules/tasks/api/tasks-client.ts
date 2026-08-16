import type {
  CreateTaskGroupInput,
  CreateTaskInput,
  DeleteTaskGroupInput,
  DeleteTaskInput,
  TaskGroupRecord,
  TaskRecord,
  TasksOverview,
  UpdateTaskGroupInput,
  UpdateTaskInput
} from '../../../../../shared/contracts/tasks'

export const tasksClient = {
  listOverview(): Promise<TasksOverview> {
    return window.api.tasks.listOverview()
  },
  createGroup(input: CreateTaskGroupInput): Promise<TaskGroupRecord> {
    return window.api.tasks.createGroup(input)
  },
  updateGroup(input: UpdateTaskGroupInput): Promise<TaskGroupRecord> {
    return window.api.tasks.updateGroup(input)
  },
  deleteGroup(input: DeleteTaskGroupInput): Promise<boolean> {
    return window.api.tasks.deleteGroup(input)
  },
  createTask(input: CreateTaskInput): Promise<TaskRecord> {
    return window.api.tasks.createTask(input)
  },
  updateTask(input: UpdateTaskInput): Promise<TaskRecord> {
    return window.api.tasks.updateTask(input)
  },
  deleteTask(input: DeleteTaskInput): Promise<boolean> {
    return window.api.tasks.deleteTask(input)
  }
}
