import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { closeDatabase, getSqlite, initializeDatabaseForTesting } from '../database/client'
import { runDatabaseMigrationsFrom } from '../database/migrate'
import {
  createTask,
  createTaskGroup,
  deleteTask,
  deleteTaskGroup,
  listTasksOverview,
  updateTask,
  updateTaskGroup
} from './tasks.repository'

let root = ''

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'mymind-tasks-'))
  initializeDatabaseForTesting(join(root, 'tasks.sqlite'))
  runDatabaseMigrationsFrom(resolve(process.cwd(), 'drizzle'))
})

beforeEach(() => {
  getSqlite().exec('DELETE FROM tasks; DELETE FROM task_groups;')
})

afterAll(async () => {
  closeDatabase()
  await rm(root, { recursive: true, force: true })
})

describe('tasks repository', () => {
  it('persists groups and tasks with their metadata', () => {
    const work = createTaskGroup({ name: 'Работа', icon: 'briefcase', color: 'blue' })
    const task = createTask({
      title: 'Подготовить презентацию',
      description: 'Собрать финальную версию для встречи.',
      groupId: work.id,
      status: 'active',
      priority: 'high',
      dueDate: '2026-08-18',
      dueTime: '12:30'
    })

    const overview = listTasksOverview()
    expect(overview.groups).toEqual([work])
    expect(overview.tasks).toEqual([task])
    expect(task.groupId).toBe(work.id)
    expect(task.completedAt).toBeNull()

    const renamed = updateTaskGroup({
      id: work.id,
      name: 'Рабочие задачи',
      icon: 'briefcase',
      color: 'cyan'
    })
    expect(renamed.name).toBe('Рабочие задачи')
    expect(renamed.color).toBe('cyan')
  })

  it('moves tasks to ungrouped when a group is deleted', () => {
    const home = createTaskGroup({ name: 'Дом', icon: 'home', color: 'emerald' })
    const task = createTask({
      title: 'Купить лампочки',
      description: '',
      groupId: home.id,
      status: 'active',
      priority: 'normal',
      dueDate: null,
      dueTime: null
    })

    expect(deleteTaskGroup({ id: home.id })).toBe(true)
    const stored = listTasksOverview().tasks.find((item) => item.id === task.id)
    expect(stored).toMatchObject({ id: task.id, groupId: null, title: task.title })
  })

  it('sets, preserves and clears completion time across status transitions', () => {
    const task = createTask({
      title: 'Закрыть задачу',
      description: '',
      groupId: null,
      status: 'active',
      priority: 'normal',
      dueDate: null,
      dueTime: null
    })

    const completed = updateTask({
      id: task.id,
      title: task.title,
      description: task.description,
      groupId: task.groupId,
      status: 'completed',
      priority: task.priority,
      dueDate: task.dueDate,
      dueTime: task.dueTime
    })
    expect(completed.completedAt).not.toBeNull()

    const edited = updateTask({
      id: completed.id,
      title: 'Закрыть задачу полностью',
      description: completed.description,
      groupId: completed.groupId,
      status: 'completed',
      priority: 'high',
      dueDate: completed.dueDate,
      dueTime: completed.dueTime
    })
    expect(edited.completedAt).toBe(completed.completedAt)

    const reopened = updateTask({
      id: edited.id,
      title: edited.title,
      description: edited.description,
      groupId: edited.groupId,
      status: 'active',
      priority: edited.priority,
      dueDate: edited.dueDate,
      dueTime: edited.dueTime
    })
    expect(reopened.completedAt).toBeNull()
  })

  it('rejects a missing group and permanently deletes tasks', () => {
    expect(() =>
      createTask({
        title: 'Некорректная задача',
        description: '',
        groupId: 'missing-group',
        status: 'active',
        priority: 'normal',
        dueDate: null,
        dueTime: null
      })
    ).toThrow('Группа задач не найдена')

    const task = createTask({
      title: 'Удалить меня',
      description: '',
      groupId: null,
      status: 'active',
      priority: 'low',
      dueDate: null,
      dueTime: null
    })
    expect(deleteTask({ id: task.id })).toBe(true)
    expect(listTasksOverview().tasks).toHaveLength(0)
  })
})
