import { describe, expect, it } from 'vitest'
import type { TaskRecord } from '@mymind/contracts/tasks'
import { quickTaskInput, taskEditorInput, taskSearchText } from './task-presentation'

const legacyTask: TaskRecord = {
  id: 'task-1',
  title: 'Старое название',
  description: 'Скрытое описание',
  groupId: 'group-work',
  status: 'active',
  priority: 'high',
  dueDate: '2026-08-25',
  dueTime: '12:30',
  completedAt: null,
  createdAt: 1,
  updatedAt: 2
}

describe('mobile task presentation helpers', () => {
  it('preserves hidden legacy metadata when the simplified editor saves', () => {
    expect(taskEditorInput('  Новое название  ', 'group-home', 'completed', legacyTask)).toEqual({
      title: 'Новое название',
      description: 'Скрытое описание',
      groupId: 'group-home',
      status: 'completed',
      priority: 'high',
      dueDate: '2026-08-25',
      dueTime: '12:30'
    })
  })

  it('creates new editor tasks with neutral legacy metadata', () => {
    expect(taskEditorInput('Задача', null, 'active')).toEqual({
      title: 'Задача',
      description: '',
      groupId: null,
      status: 'active',
      priority: 'normal',
      dueDate: null,
      dueTime: null
    })
  })

  it('quick-adds into the selected group with neutral metadata', () => {
    expect(quickTaskInput('  Позвонить клиенту ', 'group-work')).toEqual({
      title: 'Позвонить клиенту',
      description: '',
      groupId: 'group-work',
      status: 'active',
      priority: 'normal',
      dueDate: null,
      dueTime: null
    })
  })

  it('searches only current title and group presentation like desktop', () => {
    expect(taskSearchText(legacyTask, 'Работа')).toBe('старое название работа')
  })
})
