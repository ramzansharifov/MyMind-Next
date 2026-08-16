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
    expect(screen.getByPlaceholderText('https://example.com/poster.jpg')).toHaveAttribute(
      'type',
      'url'
    )
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

  it('shows interactive metadata, confirms watched rollback and opens fullscreen poster', async () => {
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

    const watched = screen.getByRole('button', { name: 'Просмотрено' })
    const watchlist = screen.getByRole('button', { name: 'Хочу посмотреть' })
    expect(watched).toHaveAttribute('aria-pressed', 'true')
    expect(watchlist).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Убрать из избранного' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(screen.queryByText('В избранном')).not.toBeInTheDocument()

    const genre = screen.getByRole('button', { name: 'Фантастика' })
    expect(genre).toHaveClass('border')
    fireEvent.mouseEnter(genre)
    expect(await screen.findByText('Поиск по жанру')).toBeInTheDocument()
    expect(screen.getByText('Лучшие фильмы')).toBeInTheDocument()
    expect(screen.getByText('Новинки жанра')).toBeInTheDocument()
    await user.click(genre)
    expect(mocks.searchWeb).toHaveBeenCalledWith({ query: 'фильмы жанра Фантастика' })

    const director = screen.getByRole('button', { name: 'Christopher Nolan' })
    fireEvent.mouseEnter(director)
    expect(await screen.findByText('Фильмография')).toBeInTheDocument()
    expect(screen.getByText('Биография')).toBeInTheDocument()
    await user.click(director)
    expect(mocks.searchWeb).toHaveBeenCalledWith({ query: 'Christopher Nolan' })

    await user.click(watchlist)
    expect(mocks.updateMovie).not.toHaveBeenCalled()
    expect(
      screen.getByRole('heading', { name: 'Вернуть фильм в «Хочу посмотреть»?' })
    ).toBeInTheDocument()
    expect(screen.getByText('Текущая оценка фильма будет удалена')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Отмена' }))
    expect(mocks.updateMovie).not.toHaveBeenCalled()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()

    await user.click(watchlist)
    await user.click(screen.getByRole('button', { name: 'Вернуть' }))
    await waitFor(() =>
      expect(mocks.updateMovie).toHaveBeenCalledWith(
        expect.objectContaining({ id: movie.id, status: 'watchlist', rating: null })
      )
    )
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Посмотреть' }))
    expect(mocks.searchWeb).toHaveBeenCalledWith({
      query: 'Смотреть фильм Интерстеллар Interstellar'
    })

    await user.click(screen.getByRole('button', { name: 'Открыть постер на весь экран' }))
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Закрыть полноэкранный постер' })
      ).toBeInTheDocument()
    )
  })
})
