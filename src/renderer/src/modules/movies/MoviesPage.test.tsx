import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { MovieRecord } from '../../../../shared/contracts/movies'

const mocks = vi.hoisted(() => ({
  listOverview: vi.fn(),
  getMovie: vi.fn(),
  createMovie: vi.fn(),
  createMovies: vi.fn(),
  updateMovie: vi.fn(),
  deleteMovie: vi.fn()
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

    await waitFor(() =>
      expect(mocks.createMovies).toHaveBeenCalledWith({
        movies: [
          {
            title: 'Интерстеллар',
            originalTitle: null,
            year: null,
            posterUrl: null,
            director: '',
            runtimeMinutes: null,
            genres: [],
            actors: [],
            description: '',
            status: 'watched',
            favorite: false,
            rating: 9,
            comments: ''
          },
          {
            title: 'Дюна',
            originalTitle: null,
            year: null,
            posterUrl: null,
            director: '',
            runtimeMinutes: null,
            genres: [],
            actors: [],
            description: '',
            status: 'watchlist',
            favorite: false,
            rating: null,
            comments: ''
          }
        ]
      })
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('Дюна')).toBeInTheDocument()
  })

  it('keeps the module header clean and puts movie actions into it', async () => {
    const user = userEvent.setup()
    mocks.listOverview.mockResolvedValue({ movies: [movie] })

    const { container } = render(<MoviesPage />)

    await screen.findByRole('button', { name: 'Открыть фильм «Интерстеллар»' })
    expect(
      screen.queryByText('Личная библиотека просмотренного и будущих просмотров')
    ).not.toBeInTheDocument()
    expect(screen.queryByText('2014')).not.toBeInTheDocument()

    const movieTitleButton = screen.getByRole('button', { name: 'Интерстеллар' })
    expect(movieTitleButton.parentElement).toHaveClass('overflow-hidden')

    await user.click(screen.getByRole('button', { name: 'Открыть фильм «Интерстеллар»' }))
    const header = container.querySelector('header')
    expect(header).not.toBeNull()
    expect(header).toContainElement(screen.getByRole('button', { name: 'К библиотеке' }))
    expect(header).toContainElement(screen.getByRole('button', { name: 'Изменить' }))
    expect(header).toContainElement(screen.getByRole('button', { name: 'Удалить' }))
  })

  it('uses a clean dedicated form with actors, comments and URL-only poster', async () => {
    const user = userEvent.setup()
    const { container } = render(<MoviesPage />)

    await screen.findByText('Библиотека пока пустая')
    await user.click(screen.getAllByRole('button', { name: 'Добавить фильм' })[0])

    expect(screen.getByRole('heading', { name: 'Добавить фильм' })).toBeInTheDocument()
    expect(screen.getByText('Актёры')).toBeInTheDocument()
    expect(screen.getByText('Комментарии')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('https://example.com/poster.jpg')).toHaveAttribute(
      'type',
      'url'
    )
    expect(screen.queryByText('Дата просмотра')).not.toBeInTheDocument()
    expect(screen.queryByText('Моя оценка')).not.toBeInTheDocument()
    expect(container.querySelector('input[type="file"]')).toBeNull()
    expect(container.querySelector('[data-app-dialog-content]')).toBeNull()
  })

  it('shows numeric rating only for watched movies and clears it when status changes', async () => {
    const user = userEvent.setup()
    render(<MoviesPage />)

    await screen.findByText('Библиотека пока пустая')
    await user.click(screen.getAllByRole('button', { name: 'Добавить фильм' })[0])
    await user.click(screen.getByRole('button', { name: 'Просмотрено' }))

    expect(screen.getByText('Моя оценка')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Оценка 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Оценка 10' })).toBeInTheDocument()

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
    expect(screen.getByRole('button', { name: 'К фильму' })).toBeInTheDocument()
    expect(screen.getByDisplayValue('Matthew McConaughey, Anne Hathaway')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'К фильму' }))
    expect(screen.getByRole('button', { name: 'Изменить' })).toBeInTheDocument()
  })

  it('shows actors and comments in movie view and opens fullscreen poster', async () => {
    const user = userEvent.setup()
    mocks.listOverview.mockResolvedValue({ movies: [movie] })

    render(<MoviesPage />)

    await user.click(await screen.findByRole('button', { name: 'Открыть фильм «Интерстеллар»' }))
    expect(screen.getByText('Matthew McConaughey, Anne Hathaway')).toBeInTheDocument()
    expect(screen.getByText('Комментарии')).toBeInTheDocument()
    expect(screen.queryByText(/Просмотрено:/)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Открыть постер на весь экран' }))
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Закрыть полноэкранный постер' })
      ).toBeInTheDocument()
    )
  })
})
