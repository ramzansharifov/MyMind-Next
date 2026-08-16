import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MUSIC_IPC_CHANNELS } from '../../shared/contracts/music'

const mocks = vi.hoisted(() => ({
  handle: vi.fn(),
  removeHandler: vi.fn(),
  openExternal: vi.fn().mockResolvedValue(undefined),
  run: vi.fn((operation: () => unknown) => operation())
}))

vi.mock('electron', () => ({
  ipcMain: { handle: mocks.handle, removeHandler: mocks.removeHandler },
  shell: { openExternal: mocks.openExternal }
}))
vi.mock('../services/main-operation-tracker', () => ({ mainOperationTracker: { run: mocks.run } }))
vi.mock('../repositories/music.repository', () => ({
  listMusicOverview: vi.fn(),
  getMusicItem: vi.fn(),
  createMusicItem: vi.fn(),
  createMusicItems: vi.fn(),
  updateMusicItem: vi.fn(),
  deleteMusicItem: vi.fn()
}))

import { registerMusicIpcHandlers } from './register-music-ipc'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('registerMusicIpcHandlers', () => {
  it('registers every music channel', () => {
    registerMusicIpcHandlers()
    expect(mocks.removeHandler.mock.calls.map(([channel]) => channel)).toEqual(
      Object.values(MUSIC_IPC_CHANNELS)
    )
    expect(mocks.handle.mock.calls.map(([channel]) => channel)).toEqual(
      Object.values(MUSIC_IPC_CHANNELS)
    )
  })

  it('opens only a generated Google search URL from a validated query', async () => {
    registerMusicIpcHandlers()
    const handler = mocks.handle.mock.calls.find(
      ([channel]) => channel === MUSIC_IPC_CHANNELS.searchWeb
    )?.[1]

    await handler({}, { query: 'Слушать Blinding Lights The Weeknd' })
    const [url] = mocks.openExternal.mock.calls[0]
    const parsed = new URL(url)
    expect(parsed.origin).toBe('https://www.google.com')
    expect(parsed.pathname).toBe('/search')
    expect(parsed.searchParams.get('q')).toBe('Слушать Blinding Lights The Weeknd')

    await expect(handler({}, { query: '' })).rejects.toThrow()
    expect(mocks.openExternal).toHaveBeenCalledTimes(1)
  })
})
