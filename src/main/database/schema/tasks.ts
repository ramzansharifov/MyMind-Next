import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import type {
  TaskGroupColor,
  TaskGroupIcon,
  TaskPriority,
  TaskStatus
} from '../../../shared/contracts/tasks'

export const taskGroups = sqliteTable(
  'task_groups',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    icon: text('icon').$type<TaskGroupIcon>().notNull().default('folder'),
    color: text('color').$type<TaskGroupColor>().notNull().default('violet'),
    position: integer('position').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
  },
  (table) => [
    index('task_groups_position_idx').on(table.position, table.createdAt),
    index('task_groups_name_idx').on(table.name)
  ]
)

export const tasks = sqliteTable(
  'tasks',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    groupId: text('group_id').references(() => taskGroups.id, { onDelete: 'set null' }),
    status: text('status').$type<TaskStatus>().notNull().default('active'),
    priority: text('priority').$type<TaskPriority>().notNull().default('normal'),
    dueDate: text('due_date'),
    dueTime: text('due_time'),
    completedAt: integer('completed_at', { mode: 'timestamp_ms' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
  },
  (table) => [
    index('tasks_status_due_idx').on(table.status, table.dueDate),
    index('tasks_group_status_idx').on(table.groupId, table.status),
    index('tasks_due_date_idx').on(table.dueDate),
    index('tasks_updated_idx').on(table.updatedAt)
  ]
)
