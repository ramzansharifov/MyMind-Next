import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MOVIES_IPC_CHANNELS } from '../../shared/contracts/movies'

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
vi.mock('../repositories/movies.repository', () => ({
  listMoviesOverview: vi.fn(),
  getMovie: vi.fn(),
  createMovie: vi.fn(),
  createMovies: vi.fn(),
  updateMovie: vi.fn(),
  deleteMovie: vi.fn()
}))

import { registerMoviesIpcHandlers } from './register-movies-ipc'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('registerMoviesIpcHandlers', () => {
  it('registers every movies channel', () => {
    registerMoviesIpcHandlers()
    expect(mocks.removeHandler.mock.calls.map(([channel]) => channel)).toEqual(
      Object.values(MOVIES_IPC_CHANNELS)
    )
    expect(mocks.handle.mock.calls.map(([channel]) => channel)).toEqual(
      Object.values(MOVIES_IPC_CHANNELS)
    )
  })

  it('opens only a generated Google search URL from a validated query', async () => {
    registerMoviesIpcHandlers()
    const handler = mocks.handle.mock.calls.find(
      ([channel]) => channel === MOVIES_IPC_CHANNELS.searchWeb
    )?.[1]

    await handler({}, { query: 'Смотреть фильм Интерстеллар' })
    const [url] = mocks.openExternal.mock.calls[0]
    const parsed = new URL(url)
    expect(parsed.origin).toBe('https://www.google.com')
    expect(parsed.pathname).toBe('/search')
    expect(parsed.searchParams.get('q')).toBe('Смотреть фильм Интерстеллар')

    await expect(handler({}, { query: '' })).rejects.toThrow()
    expect(mocks.openExternal).toHaveBeenCalledTimes(1)
  })
})
