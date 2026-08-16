import { randomUUID } from 'node:crypto'

import type {
  CreateTaskGroupInput,
  CreateTaskInput,
  DeleteTaskGroupInput,
  DeleteTaskInput,
  TaskGroupColor,
  TaskGroupIcon,
  TaskGroupRecord,
  TaskPriority,
  TaskRecord,
  TaskStatus,
  TasksOverview,
  UpdateTaskGroupInput,
  UpdateTaskInput
} from '../../shared/contracts/tasks'
import { getSqlite } from '../database/client'

interface TaskGroupRow {
  id: string
  name: string
  icon: TaskGroupIcon
  color: TaskGroupColor
  position: number
  created_at: number
  updated_at: number
}

interface TaskRow {
  id: string
  title: string
  description: string
  group_id: string | null
  status: TaskStatus
  priority: TaskPriority
  due_date: string | null
  due_time: string | null
  completed_at: number | null
  created_at: number
  updated_at: number
}

const TASK_GROUP_SELECT = `SELECT
  id,
  name,
  icon,
  color,
  position,
  created_at,
  updated_at
FROM task_groups`

const TASK_SELECT = `SELECT
  id,
  title,
  description,
  group_id,
  status,
  priority,
  due_date,
  due_time,
  completed_at,
  created_at,
  updated_at
FROM tasks`

function mapGroup(row: TaskGroupRow): TaskGroupRecord {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.color,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function mapTask(row: TaskRow): TaskRecord {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    groupId: row.group_id,
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date,
    dueTime: row.due_time,
    completedAt: row.status === 'completed' ? row.completed_at : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function findGroup(id: string): TaskGroupRecord | null {
  const row = getSqlite().prepare(`${TASK_GROUP_SELECT} WHERE id = ?`).get(id) as
    | TaskGroupRow
    | undefined
  return row ? mapGroup(row) : null
}

function requireGroup(id: string): TaskGroupRecord {
  const group = findGroup(id)
  if (!group) throw new Error('Группа задач не найдена')
  return group
}

function ensureGroupExists(groupId: string | null): void {
  if (groupId !== null) requireGroup(groupId)
}

function findTask(id: string): TaskRecord | null {
  const row = getSqlite().prepare(`${TASK_SELECT} WHERE id = ?`).get(id) as TaskRow | undefined
  return row ? mapTask(row) : null
}

function requireTask(id: string): TaskRecord {
  const task = findTask(id)
  if (!task) throw new Error('Задача не найдена')
  return task
}

function nextGroupPosition(): number {
  const row = getSqlite()
    .prepare('SELECT COALESCE(MAX(position), -1) + 1 AS position FROM task_groups')
    .get() as { position: number }
  return row.position
}

function normalizedTaskPayload(
  input: CreateTaskInput | UpdateTaskInput,
  previous: TaskRecord | null,
  now: number
): readonly unknown[] {
  const completedAt =
    input.status === 'completed'
      ? previous?.status === 'completed' && previous.completedAt !== null
        ? previous.completedAt
        : now
      : null

  return [
    input.title,
    input.description,
    input.groupId,
    input.status,
    input.priority,
    input.dueDate,
    input.dueDate === null ? null : input.dueTime,
    completedAt
  ]
}

export function listTasksOverview(): TasksOverview {
  const sqlite = getSqlite()
  const groups = sqlite
    .prepare(`${TASK_GROUP_SELECT} ORDER BY position ASC, created_at ASC`)
    .all() as TaskGroupRow[]
  const tasks = sqlite
    .prepare(
      `${TASK_SELECT}
       ORDER BY
         CASE status WHEN 'active' THEN 0 ELSE 1 END ASC,
         CASE WHEN due_date IS NULL THEN 1 ELSE 0 END ASC,
         due_date ASC,
         CASE WHEN due_time IS NULL THEN 1 ELSE 0 END ASC,
         due_time ASC,
         CASE priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END ASC,
         updated_at DESC,
         created_at DESC`
    )
    .all() as TaskRow[]

  return {
    groups: groups.map(mapGroup),
    tasks: tasks.map(mapTask)
  }
}

export function createTaskGroup(input: CreateTaskGroupInput): TaskGroupRecord {
  const id = randomUUID()
  const now = Date.now()
  const position = nextGroupPosition()

  getSqlite()
    .prepare(
      `INSERT INTO task_groups (id, name, icon, color, position, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(id, input.name, input.icon, input.color, position, now, now)

  return requireGroup(id)
}

export function updateTaskGroup(input: UpdateTaskGroupInput): TaskGroupRecord {
  const group = requireGroup(input.id)
  const now = Date.now()

  getSqlite()
    .prepare(
      `UPDATE task_groups
       SET name = ?, icon = ?, color = ?, updated_at = ?
       WHERE id = ?`
    )
    .run(input.name, input.icon, input.color, now, group.id)

  return requireGroup(group.id)
}

export function deleteTaskGroup(input: DeleteTaskGroupInput): boolean {
  requireGroup(input.id)
  const result = getSqlite().prepare('DELETE FROM task_groups WHERE id = ?').run(input.id)
  return result.changes > 0
}

export function createTask(input: CreateTaskInput): TaskRecord {
  ensureGroupExists(input.groupId)
  const id = randomUUID()
  const now = Date.now()

  getSqlite()
    .prepare(
      `INSERT INTO tasks (
        id,
        title,
        description,
        group_id,
        status,
        priority,
        due_date,
        due_time,
        completed_at,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(id, ...normalizedTaskPayload(input, null, now), now, now)

  return requireTask(id)
}

export function updateTask(input: UpdateTaskInput): TaskRecord {
  const previous = requireTask(input.id)
  ensureGroupExists(input.groupId)
  const now = Date.now()

  getSqlite()
    .prepare(
      `UPDATE tasks SET
        title = ?,
        description = ?,
        group_id = ?,
        status = ?,
        priority = ?,
        due_date = ?,
        due_time = ?,
        completed_at = ?,
        updated_at = ?
       WHERE id = ?`
    )
    .run(...normalizedTaskPayload(input, previous, now), now, input.id)

  return requireTask(input.id)
}

export function deleteTask(input: DeleteTaskInput): boolean {
  requireTask(input.id)
  const result = getSqlite().prepare('DELETE FROM tasks WHERE id = ?').run(input.id)
  return result.changes > 0
}
