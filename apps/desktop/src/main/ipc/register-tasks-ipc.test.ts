import { beforeEach, describe, expect, it, vi } from 'vitest'

import { TASKS_IPC_CHANNELS } from '../../shared/contracts/tasks'

const mocks = vi.hoisted(() => ({
  handle: vi.fn(),
  removeHandler: vi.fn(),
  run: vi.fn((operation: () => unknown) => operation())
}))

vi.mock('electron', () => ({
  ipcMain: { handle: mocks.handle, removeHandler: mocks.removeHandler }
}))
vi.mock('../services/main-operation-tracker', () => ({ mainOperationTracker: { run: mocks.run } }))
vi.mock('../repositories/tasks.repository', () => ({
  listTasksOverview: vi.fn(),
  createTaskGroup: vi.fn(),
  updateTaskGroup: vi.fn(),
  deleteTaskGroup: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn()
}))

import { registerTasksIpcHandlers } from './register-tasks-ipc'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('registerTasksIpcHandlers', () => {
  it('registers every task channel', () => {
    registerTasksIpcHandlers()
    expect(mocks.removeHandler.mock.calls.map(([channel]) => channel)).toEqual(
      Object.values(TASKS_IPC_CHANNELS)
    )
    expect(mocks.handle.mock.calls.map(([channel]) => channel)).toEqual(
      Object.values(TASKS_IPC_CHANNELS)
    )
  })

  it('validates task input before calling repository operations', async () => {
    registerTasksIpcHandlers()
    const handler = mocks.handle.mock.calls.find(
      ([channel]) => channel === TASKS_IPC_CHANNELS.createTask
    )?.[1]

    expect(() =>
      handler(
        {},
        {
          title: 'Задача',
          description: '',
          groupId: null,
          status: 'active',
          priority: 'normal',
          dueDate: null,
          dueTime: '10:00'
        }
      )
    ).toThrow('Чтобы указать время, сначала выберите дату')
  })
})
