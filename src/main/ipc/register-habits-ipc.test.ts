import { beforeEach, describe, expect, it, vi } from 'vitest'

import { HABITS_IPC_CHANNELS } from '../../shared/contracts/habits'

const mocks = vi.hoisted(() => ({
  handle: vi.fn(),
  removeHandler: vi.fn(),
  run: vi.fn((operation: () => unknown) => operation())
}))

vi.mock('electron', () => ({
  ipcMain: { handle: mocks.handle, removeHandler: mocks.removeHandler }
}))
vi.mock('../services/main-operation-tracker', () => ({ mainOperationTracker: { run: mocks.run } }))
vi.mock('../repositories/habits.repository', () => ({
  listHabitsOverview: vi.fn(),
  createHabitGroup: vi.fn(),
  updateHabitGroup: vi.fn(),
  deleteHabitGroup: vi.fn(),
  createHabit: vi.fn(),
  updateHabit: vi.fn(),
  deleteHabit: vi.fn(),
  upsertHabitEntry: vi.fn(),
  deleteHabitEntry: vi.fn(),
  getHabitsReport: vi.fn()
}))

import { registerHabitsIpcHandlers } from './register-habits-ipc'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('registerHabitsIpcHandlers', () => {
  it('registers every habits channel', () => {
    registerHabitsIpcHandlers()
    expect(mocks.removeHandler.mock.calls.map(([channel]) => channel)).toEqual(
      Object.values(HABITS_IPC_CHANNELS)
    )
    expect(mocks.handle.mock.calls.map(([channel]) => channel)).toEqual(
      Object.values(HABITS_IPC_CHANNELS)
    )
  })

  it('validates recurrence before creating a habit', () => {
    registerHabitsIpcHandlers()
    const handler = mocks.handle.mock.calls.find(
      ([channel]) => channel === HABITS_IPC_CHANNELS.createHabit
    )?.[1]

    expect(() =>
      handler(
        {},
        {
          title: 'Читать',
          groupId: null,
          trackingType: 'check',
          targetValue: 1,
          unit: '',
          repeatEveryDays: 0,
          preferredTime: null
        }
      )
    ).toThrow()
  })

  it('rejects removed legacy habit fields', () => {
    registerHabitsIpcHandlers()
    const handler = mocks.handle.mock.calls.find(
      ([channel]) => channel === HABITS_IPC_CHANNELS.createHabit
    )?.[1]

    expect(() =>
      handler(
        {},
        {
          title: 'Читать',
          groupId: null,
          trackingType: 'check',
          targetValue: 1,
          unit: '',
          repeatEveryDays: 1,
          preferredTime: null,
          description: 'legacy',
          status: 'active',
          startDate: '2026-08-23',
          endDate: null,
          archivedOn: null
        }
      )
    ).toThrow()
  })
})
