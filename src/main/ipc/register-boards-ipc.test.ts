import { beforeEach, describe, expect, it, vi } from 'vitest'

import { BOARD_IPC_CHANNELS } from '../../shared/contracts/boards'

const mocks = vi.hoisted(() => ({
  handle: vi.fn(),
  removeHandler: vi.fn(),
  listBoardNodes: vi.fn()
}))

vi.mock('electron', () => ({
  ipcMain: {
    handle: mocks.handle,
    removeHandler: mocks.removeHandler
  }
}))

vi.mock('../repositories/boards.repository', () => ({
  createBoardNode: vi.fn(),
  deleteBoardNode: vi.fn(),
  ensureStudyBoard: vi.fn(),
  getBoardDocument: vi.fn(),
  listBoardNodes: mocks.listBoardNodes,
  moveBoardNode: vi.fn(),
  renameBoardNode: vi.fn(),
  saveBoardDocument: vi.fn(),
  updateBoardNodeExpansion: vi.fn()
}))

vi.mock('../services/main-operation-tracker', () => ({
  mainOperationTracker: {
    run: (operation: () => unknown) => operation()
  }
}))

import { registerBoardsIpcHandlers } from './register-boards-ipc'

beforeEach(() => {
  mocks.handle.mockClear()
  mocks.removeHandler.mockClear()
  mocks.listBoardNodes.mockReset()
})

describe('registerBoardsIpcHandlers', () => {
  it('registers every boards IPC channel and connects listNodes to the repository', () => {
    const nodes = [{ id: 'boards-study-root' }]
    mocks.listBoardNodes.mockReturnValue(nodes)

    registerBoardsIpcHandlers()

    expect(mocks.removeHandler.mock.calls.map(([channel]) => channel)).toEqual(
      Object.values(BOARD_IPC_CHANNELS)
    )
    expect(mocks.handle.mock.calls.map(([channel]) => channel)).toEqual(
      Object.values(BOARD_IPC_CHANNELS)
    )

    const listHandler = mocks.handle.mock.calls.find(
      ([channel]) => channel === BOARD_IPC_CHANNELS.listNodes
    )?.[1]

    expect(listHandler()).toBe(nodes)
    expect(mocks.listBoardNodes).toHaveBeenCalledOnce()
  })
})
