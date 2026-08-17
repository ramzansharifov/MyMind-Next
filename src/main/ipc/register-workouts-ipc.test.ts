import { beforeEach, describe, expect, it, vi } from 'vitest'

import { WORKOUTS_IPC_CHANNELS } from '../../shared/contracts/workouts'

const mocks = vi.hoisted(() => ({
  handle: vi.fn(),
  removeHandler: vi.fn(),
  run: vi.fn((operation: () => unknown) => Promise.resolve().then(operation))
}))

vi.mock('electron', () => ({
  BrowserWindow: { fromWebContents: vi.fn(() => null) },
  ipcMain: { handle: mocks.handle, removeHandler: mocks.removeHandler }
}))
vi.mock('../services/main-operation-tracker', () => ({ mainOperationTracker: { run: mocks.run } }))
vi.mock('../repositories/workouts.repository', () => ({
  listWorkoutsOverview: vi.fn(),
  createWorkoutExercise: vi.fn(),
  updateWorkoutExercise: vi.fn(),
  deleteWorkoutExercise: vi.fn(),
  createWorkoutProgram: vi.fn(),
  updateWorkoutProgram: vi.fn(),
  deleteWorkoutProgram: vi.fn(),
  createWorkoutSession: vi.fn(),
  updateWorkoutSession: vi.fn(),
  deleteWorkoutSession: vi.fn(),
  getWorkoutSession: vi.fn(),
  createWorkoutProgressEntry: vi.fn(),
  updateWorkoutProgressEntry: vi.fn(),
  deleteWorkoutProgressEntry: vi.fn(),
  getWorkoutReport: vi.fn()
}))
vi.mock('../services/workout-progress-assets', () => ({
  importWorkoutProgressPhoto: vi.fn(),
  removeWorkoutProgressEntryAssets: vi.fn(),
  removeWorkoutProgressPhoto: vi.fn()
}))

import { registerWorkoutsIpcHandlers } from './register-workouts-ipc'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('registerWorkoutsIpcHandlers', () => {
  it('registers every workouts channel', () => {
    registerWorkoutsIpcHandlers()

    expect(mocks.removeHandler.mock.calls.map(([channel]) => channel)).toEqual(
      Object.values(WORKOUTS_IPC_CHANNELS)
    )
    expect(mocks.handle.mock.calls.map(([channel]) => channel)).toEqual(
      Object.values(WORKOUTS_IPC_CHANNELS)
    )
  })

  it('validates every workout set before creating a session', async () => {
    registerWorkoutsIpcHandlers()
    const handler = mocks.handle.mock.calls.find(
      ([channel]) => channel === WORKOUTS_IPC_CHANNELS.createSession
    )?.[1]

    await expect(
      handler({}, {
        programId: null,
        title: '',
        date: '2026-08-17',
        durationMinutes: null,
        comment: '',
        exercises: [
          {
            exerciseId: '123e4567-e89b-12d3-a456-426614174000',
            comment: '',
            sets: [{ reps: 0, weightKg: 20 }]
          }
        ]
      })
    ).rejects.toThrow()
  })

  it('rejects photo import from a non-main frame', async () => {
    registerWorkoutsIpcHandlers()
    const handler = mocks.handle.mock.calls.find(
      ([channel]) => channel === WORKOUTS_IPC_CHANNELS.importProgressPhoto
    )?.[1]

    const sender = { mainFrame: {} }
    await expect(
      handler(
        { sender, senderFrame: {} },
        { entryId: '123e4567-e89b-12d3-a456-426614174000' }
      )
    ).rejects.toThrow('Untrusted workout photo request')
  })
})
