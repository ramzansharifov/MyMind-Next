from pathlib import Path

root = Path('.')

# Ensure the main transformation reached the intended source files.
detail_path = root / 'src/renderer/src/modules/movies/components/MovieDetail.tsx'
if 'onSearchWeb' not in detail_path.read_text() or 'Личные комментарии' not in detail_path.read_text():
    raise SystemExit('MovieDetail transformation did not complete')

# Finish MoviesPage test transformation after the earlier terminology replacement.
path = root / 'src/renderer/src/modules/movies/MoviesPage.test.tsx'
text = path.read_text()
old = """    expect(screen.getByText('Matthew McConaughey, Anne Hathaway')).toBeInTheDocument()\n    expect(screen.getByText('Личные комментарии')).toBeInTheDocument()\n    expect(screen.queryByText(/Просмотрено:/)).not.toBeInTheDocument()\n\n    await user.click(screen.getByRole('button', { name: 'Открыть постер на весь экран' }))"""
new = """    expect(screen.getByText('Жанры:')).toBeInTheDocument()\n    expect(screen.getByText('Режиссёр:')).toBeInTheDocument()\n    expect(screen.getByText('Актёры:')).toBeInTheDocument()\n    expect(screen.getByText('Личные комментарии')).toBeInTheDocument()\n    expect(screen.getByRole('button', { name: 'Matthew McConaughey' })).toBeInTheDocument()\n    expect(screen.getByRole('button', { name: 'Anne Hathaway' })).toBeInTheDocument()\n\n    const director = screen.getByRole('button', { name: 'Christopher Nolan' })\n    await user.hover(director)\n    expect(await screen.findByText('Фильмография')).toBeInTheDocument()\n    expect(screen.getByText('Биография')).toBeInTheDocument()\n    await user.click(director)\n    expect(mocks.searchWeb).toHaveBeenCalledWith({ query: 'Christopher Nolan' })\n\n    await user.click(screen.getByRole('button', { name: 'Посмотреть' }))\n    expect(mocks.searchWeb).toHaveBeenCalledWith({\n      query: 'Смотреть фильм Интерстеллар Interstellar'\n    })\n\n    await user.click(screen.getByRole('button', { name: 'Открыть постер на весь экран' }))"""
if old not in text:
    raise SystemExit('Updated MoviesPage detail test block not found')
path.write_text(text.replace(old, new))

# IPC test for safe browser search (the first script exits just before creating it).
path = root / 'src/main/ipc/register-movies-ipc.test.ts'
path.write_text(r'''import { beforeEach, describe, expect, it, vi } from 'vitest'

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

    expect(mocks.openExternal).toHaveBeenCalledOnce()
    const [url] = mocks.openExternal.mock.calls[0]
    const parsed = new URL(url)
    expect(parsed.origin).toBe('https://www.google.com')
    expect(parsed.pathname).toBe('/search')
    expect(parsed.searchParams.get('q')).toBe('Смотреть фильм Интерстеллар')

    expect(() => handler({}, { query: '' })).toThrow()
    expect(mocks.openExternal).toHaveBeenCalledTimes(1)
  })
})
''')
