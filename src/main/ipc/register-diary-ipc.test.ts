import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DIARY_IPC_CHANNELS } from '../../shared/contracts/diary'

const mocks = vi.hoisted(() => ({
  handle: vi.fn(),
  removeHandler: vi.fn(),
  run: vi.fn((operation: () => unknown) => operation()),
  createDiary: vi.fn(),
  setDiaryMood: vi.fn(),
  createDiaryEntry: vi.fn()
}))

vi.mock('electron', () => ({
  ipcMain: { handle: mocks.handle, removeHandler: mocks.removeHandler }
}))

vi.mock('../services/main-operation-tracker', () => ({
  mainOperationTracker: { run: mocks.run }
}))

vi.mock('../repositories/diary.repository', () => ({
  listDiaryOverview: vi.fn(),
  createDiary: mocks.createDiary,
  updateDiary: vi.fn(),
  deleteDiary: vi.fn(),
  getDiaryDay: vi.fn(),
  listDiaryDays: vi.fn(),
  setDiaryMood: mocks.setDiaryMood,
  createDiaryEntry: mocks.createDiaryEntry,
  updateDiaryEntry: vi.fn(),
  deleteDiaryEntry: vi.fn(),
  getDiaryReport: vi.fn()
}))

import { registerDiaryIpcHandlers } from './register-diary-ipc'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('registerDiaryIpcHandlers', () => {
  it('replaces and registers every diary channel', () => {
    registerDiaryIpcHandlers()

    expect(mocks.removeHandler.mock.calls.map(([channel]) => channel)).toEqual(
      Object.values(DIARY_IPC_CHANNELS)
    )
    expect(mocks.handle.mock.calls.map(([channel]) => channel)).toEqual(
      Object.values(DIARY_IPC_CHANNELS)
    )
  })

  it('validates diary metadata and rejects configurable colors', () => {
    registerDiaryIpcHandlers()
    const handler = mocks.handle.mock.calls.find(
      ([channel]) => channel === DIARY_IPC_CHANNELS.createDiary
    )?.[1]

    handler({}, { title: 'Личный дневник', icon: 'book-heart' })
    expect(mocks.createDiary).toHaveBeenCalledWith({
      title: 'Личный дневник',
      icon: 'book-heart'
    })
    expect(() =>
      handler({}, { title: 'Личный дневник', icon: 'book-heart', color: '#ffffff' })
    ).toThrow()
    expect(mocks.createDiary).toHaveBeenCalledTimes(1)
  })

  it('validates local page dates before changing mood', () => {
    registerDiaryIpcHandlers()
    const handler = mocks.handle.mock.calls.find(
      ([channel]) => channel === DIARY_IPC_CHANNELS.setMood
    )?.[1]

    handler({}, { diaryId: 'diary-default', dayKey: '2026-08-08', mood: 'good' })
    expect(mocks.setDiaryMood).toHaveBeenCalledWith({
      diaryId: 'diary-default',
      dayKey: '2026-08-08',
      mood: 'good'
    })
    expect(() =>
      handler({}, { diaryId: 'diary-default', dayKey: '2026-02-31', mood: 'good' })
    ).toThrow()
  })

  it('does not allow empty diary entries through IPC', () => {
    registerDiaryIpcHandlers()
    const handler = mocks.handle.mock.calls.find(
      ([channel]) => channel === DIARY_IPC_CHANNELS.createEntry
    )?.[1]

    expect(() =>
      handler({}, { diaryId: 'diary-default', dayKey: '2026-08-08', text: '   ' })
    ).toThrow()
    expect(mocks.createDiaryEntry).not.toHaveBeenCalled()
  })
})
