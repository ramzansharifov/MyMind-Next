import { describe, expect, it } from 'vitest'

import {
  createTaskGroupInputSchema,
  createTaskInputSchema,
  updateTaskInputSchema
} from './tasks'

const baseTask = {
  title: 'Подготовить отчёт',
  description: '',
  groupId: null,
  status: 'active' as const,
  priority: 'normal' as const,
  dueDate: null,
  dueTime: null
}

describe('tasks validation', () => {
  it('accepts a task with a valid local date and time', () => {
    expect(
      createTaskInputSchema.parse({
        ...baseTask,
        priority: 'high',
        dueDate: '2026-08-17',
        dueTime: '09:30'
      })
    ).toEqual({
      ...baseTask,
      priority: 'high',
      dueDate: '2026-08-17',
      dueTime: '09:30'
    })
  })

  it('rejects impossible dates and time without a date', () => {
    expect(() =>
      createTaskInputSchema.parse({
        ...baseTask,
        dueDate: '2026-02-31'
      })
    ).toThrow('Введите корректную дату')

    expect(() =>
      createTaskInputSchema.parse({
        ...baseTask,
        dueTime: '10:00'
      })
    ).toThrow('Чтобы указать время, сначала выберите дату')
  })

  it('validates update ids and group appearance values strictly', () => {
    expect(() => updateTaskInputSchema.parse({ ...baseTask, id: '../unsafe' })).toThrow()
    expect(
      createTaskGroupInputSchema.parse({
        name: 'Работа',
        icon: 'briefcase',
        color: 'blue'
      })
    ).toEqual({ name: 'Работа', icon: 'briefcase', color: 'blue' })
    expect(
      createTaskGroupInputSchema.parse({
        name: 'Без собственного цвета',
        icon: 'folder',
        color: 'accent'
      })
    ).toEqual({ name: 'Без собственного цвета', icon: 'folder', color: 'accent' })
    expect(() =>
      createTaskGroupInputSchema.parse({
        name: 'Работа',
        icon: 'briefcase',
        color: 'unknown'
      })
    ).toThrow()
  })
})
