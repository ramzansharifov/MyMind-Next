from pathlib import Path

root = Path('.')

detail_path = root / 'src/renderer/src/modules/movies/components/MovieDetail.tsx'
if 'onSearchWeb' not in detail_path.read_text() or 'Личные комментарии' not in detail_path.read_text():
    raise SystemExit('MovieDetail transformation did not complete')

# Rewrite the MoviesPage test deterministically for the new UI contract.
path = root / 'src/renderer/src/modules/movies/MoviesPage.test.tsx'
path.write_text(r'''import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { MovieRecord } from '../../../../shared/contracts/movies'

const mocks = vi.hoisted(() => ({
  listOverview: vi.fn(),
  getMovie: vi.fn(),
  createMovie: vi.fn(),
  createMovies: vi.fn(),
  updateMovie: vi.fn(),
  deleteMovie: vi.fn(),
  searchWeb: vi.fn()
}))

vi.mock('./api/movies-client', () => ({ moviesClient: mocks }))

import { MoviesPage } from './MoviesPage'

const movie: MovieRecord = {
  id: 'movie-1',
  title: 'Интерстеллар',
  originalTitle: 'Interstellar',
  year: 2014,
  posterUrl: 'https://example.com/interstellar.jpg',
  director: 'Christopher Nolan',
  runtimeMinutes: 169,
  genres: ['Фантастика', 'Драма'],
  actors: ['Matthew McConaughey', 'Anne Hathaway'],
  description: 'История о путешествии к звёздам.',
  status: 'watched',
  favorite: true,
  rating: 9,
  comments: 'Сильный фильм.',
  createdAt: 1,
  updatedAt: 2
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.listOverview.mockResolvedValue({ movies: [] })
  mocks.getMovie.mockResolvedValue(null)
  mocks.createMovie.mockResolvedValue(movie)
  mocks.createMovies.mockResolvedValue([movie])
  mocks.updateMovie.mockImplementation(async (input) => ({ ...movie, ...input, updatedAt: 3 }))
  mocks.deleteMovie.mockResolvedValue(true)
  mocks.searchWeb.mockResolvedValue(undefined)
})

describe('MoviesPage', () => {
  it('imports one or many movies from GPT-friendly JSON', async () => {
    const user = userEvent.setup()
    const secondMovie = {
      ...movie,
      id: 'movie-2',
      title: 'Дюна',
      favorite: false,
      rating: null,
      status: 'watchlist' as const
    }
    mocks.createMovies.mockResolvedValue([movie, secondMovie])

    render(<MoviesPage />)
    await screen.findByText('Библиотека пока пустая')
    await user.click(screen.getByRole('button', { name: 'Из JSON' }))

    const input = screen.getByRole('textbox', { name: 'JSON фильмов' })
    fireEvent.change(input, {
      target: {
        value:
          '```json\n[{"title":"Интерстеллар","status":"watched","rating":9},{"title":"Дюна"}]\n```'
      }
    })

    expect(screen.getByText('Готово к добавлению: 2')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Добавить 2 фильма' }))

    await waitFor(() => expect(mocks.createMovies).toHaveBeenCalledOnce())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('Дюна')).toBeInTheDocument()
  })

  it('keeps the module header clean and puts movie actions into it', async () => {
    const user = userEvent.setup()
    mocks.listOverview.mockResolvedValue({ movies: [movie] })
    const { container } = render(<MoviesPage />)

    await user.click(await screen.findByRole('button', { name: 'Открыть фильм «Интерстеллар»' }))
    const header = container.querySelector('header')
    expect(header).not.toBeNull()
    expect(header).toContainElement(screen.getByRole('button', { name: 'К библиотеке' }))
    expect(header).toContainElement(screen.getByRole('button', { name: 'Изменить' }))
    expect(header).toContainElement(screen.getByRole('button', { name: 'Удалить' }))
  })

  it('uses a clean dedicated form with actors, personal comments and URL-only poster', async () => {
    const user = userEvent.setup()
    const { container } = render(<MoviesPage />)

    await screen.findByText('Библиотека пока пустая')
    await user.click(screen.getAllByRole('button', { name: 'Добавить фильм' })[0])

    expect(screen.getByRole('heading', { name: 'Добавить фильм' })).toBeInTheDocument()
    expect(screen.getByText('Актёры')).toBeInTheDocument()
    expect(screen.getByText('Личные комментарии')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('https://example.com/poster.jpg')).toHaveAttribute('type', 'url')
    expect(screen.queryByText('Дата просмотра')).not.toBeInTheDocument()
    expect(container.querySelector('input[type="file"]')).toBeNull()
  })

  it('shows numeric rating only for watched movies and clears it when status changes', async () => {
    const user = userEvent.setup()
    render(<MoviesPage />)

    await screen.findByText('Библиотека пока пустая')
    await user.click(screen.getAllByRole('button', { name: 'Добавить фильм' })[0])
    await user.click(screen.getByRole('button', { name: 'Просмотрено' }))
    await user.click(screen.getByRole('button', { name: 'Оценка 8' }))
    expect(screen.getByRole('button', { name: 'Оценка 8' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Хочу посмотреть' }))
    expect(screen.queryByText('Моя оценка')).not.toBeInTheDocument()
  })

  it('opens editing as a dedicated page and returns to the movie view', async () => {
    const user = userEvent.setup()
    mocks.listOverview.mockResolvedValue({ movies: [movie] })
    render(<MoviesPage />)

    await user.click(await screen.findByRole('button', { name: 'Открыть фильм «Интерстеллар»' }))
    await user.click(screen.getByRole('button', { name: 'Изменить' }))
    expect(screen.getByRole('heading', { name: 'Редактировать фильм' })).toBeInTheDocument()
    expect(screen.getByDisplayValue('Matthew McConaughey, Anne Hathaway')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'К фильму' }))
    expect(screen.getByRole('button', { name: 'Изменить' })).toBeInTheDocument()
  })

  it('shows structured metadata, person search, watch action and fullscreen poster', async () => {
    const user = userEvent.setup()
    mocks.listOverview.mockResolvedValue({ movies: [movie] })
    render(<MoviesPage />)

    await user.click(await screen.findByRole('button', { name: 'Открыть фильм «Интерстеллар»' }))
    expect(screen.getByText('Жанры:')).toBeInTheDocument()
    expect(screen.getByText('Режиссёр:')).toBeInTheDocument()
    expect(screen.getByText('Актёры:')).toBeInTheDocument()
    expect(screen.getByText('Личные комментарии')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Matthew McConaughey' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Anne Hathaway' })).toBeInTheDocument()

    const director = screen.getByRole('button', { name: 'Christopher Nolan' })
    fireEvent.mouseEnter(director)
    expect(await screen.findByText('Фильмография')).toBeInTheDocument()
    expect(screen.getByText('Биография')).toBeInTheDocument()
    await user.click(director)
    expect(mocks.searchWeb).toHaveBeenCalledWith({ query: 'Christopher Nolan' })

    await user.click(screen.getByRole('button', { name: 'Посмотреть' }))
    expect(mocks.searchWeb).toHaveBeenCalledWith({
      query: 'Смотреть фильм Интерстеллар Interstellar'
    })

    await user.click(screen.getByRole('button', { name: 'Открыть постер на весь экран' }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Закрыть полноэкранный постер' })).toBeInTheDocument()
    )
  })
})
''')

# IPC test for safe browser search.
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
