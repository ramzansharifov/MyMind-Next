export const TASK_STATUSES = ['active', 'completed'] as const
export const TASK_PRIORITIES = ['low', 'normal', 'high'] as const
export const TASK_GROUP_ICONS = [
  'folder',
  'briefcase',
  'home',
  'user',
  'shopping-cart',
  'wallet',
  'book-open',
  'heart-pulse',
  'dumbbell',
  'plane',
  'rocket',
  'bell'
] as const
export const TASK_GROUP_COLORS = [
  'accent',
  'violet',
  'blue',
  'cyan',
  'emerald',
  'amber',
  'orange',
  'rose',
  'pink'
] as const

export type TaskStatus = (typeof TASK_STATUSES)[number]
export type TaskPriority = (typeof TASK_PRIORITIES)[number]
export type TaskGroupIcon = (typeof TASK_GROUP_ICONS)[number]
export type TaskGroupColor = (typeof TASK_GROUP_COLORS)[number]

export interface TaskGroupRecord {
  id: string
  name: string
  icon: TaskGroupIcon
  color: TaskGroupColor
  position: number
  createdAt: number
  updatedAt: number
}

export interface TaskRecord {
  id: string
  title: string
  description: string
  groupId: string | null
  status: TaskStatus
  priority: TaskPriority
  dueDate: string | null
  dueTime: string | null
  completedAt: number | null
  createdAt: number
  updatedAt: number
}

export interface TasksOverview {
  groups: TaskGroupRecord[]
  tasks: TaskRecord[]
}

export interface CreateTaskGroupInput {
  name: string
  icon: TaskGroupIcon
  color: TaskGroupColor
}

export interface UpdateTaskGroupInput extends CreateTaskGroupInput {
  id: string
}

export interface DeleteTaskGroupInput {
  id: string
}

export interface CreateTaskInput {
  title: string
  description: string
  groupId: string | null
  status: TaskStatus
  priority: TaskPriority
  dueDate: string | null
  dueTime: string | null
}

export interface UpdateTaskInput extends CreateTaskInput {
  id: string
}

export interface DeleteTaskInput {
  id: string
}

export const TASKS_IPC_CHANNELS = {
  listOverview: 'tasks:list-overview',
  createGroup: 'tasks:create-group',
  updateGroup: 'tasks:update-group',
  deleteGroup: 'tasks:delete-group',
  createTask: 'tasks:create-task',
  updateTask: 'tasks:update-task',
  deleteTask: 'tasks:delete-task'
} as const

export interface TasksApi {
  listOverview(): Promise<TasksOverview>
  createGroup(input: CreateTaskGroupInput): Promise<TaskGroupRecord>
  updateGroup(input: UpdateTaskGroupInput): Promise<TaskGroupRecord>
  deleteGroup(input: DeleteTaskGroupInput): Promise<boolean>
  createTask(input: CreateTaskInput): Promise<TaskRecord>
  updateTask(input: UpdateTaskInput): Promise<TaskRecord>
  deleteTask(input: DeleteTaskInput): Promise<boolean>
}
