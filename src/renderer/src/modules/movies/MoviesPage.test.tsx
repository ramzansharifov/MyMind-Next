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
  type: 'movie',
  year: 2014,
  posterUrl: 'https://example.com/interstellar.jpg',
  director: 'Christopher Nolan',
  runtimeMinutes: 169,
  seasonCount: null,
  episodesPerSeason: null,
  episodeRuntimeMinutes: null,
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
  it('imports one or many typed movies with episodic metadata from GPT-friendly JSON', async () => {
    const user = userEvent.setup()
    const secondMovie: MovieRecord = {
      ...movie,
      id: 'movie-2',
      title: 'Аркейн',
      originalTitle: 'Arcane',
      type: 'animated_series',
      runtimeMinutes: null,
      seasonCount: 2,
      episodesPerSeason: 9,
      episodeRuntimeMinutes: 42,
      favorite: false,
      rating: null,
      status: 'watchlist'
    }
    mocks.createMovies.mockResolvedValue([movie, secondMovie])

    render(<MoviesPage />)
    await screen.findByText('Библиотека пока пустая')
    await user.click(screen.getByRole('button', { name: 'Из JSON' }))

    const input = screen.getByRole('textbox', { name: 'JSON фильмов' })
    fireEvent.change(input, {
      target: {
        value:
          '```json\n[{"title":"Интерстеллар","type":"movie","status":"watched","rating":9},{"title":"Аркейн","type":"animated_series","seasonCount":2,"episodesPerSeason":9,"episodeRuntimeMinutes":42}]\n```'
      }
    })

    expect(screen.getByText('Готово к добавлению: 2')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Добавить 2 фильма' }))

    await waitFor(() => expect(mocks.createMovies).toHaveBeenCalledOnce())
    expect(mocks.createMovies).toHaveBeenCalledWith({
      movies: [
        expect.objectContaining({ title: 'Интерстеллар', type: 'movie' }),
        expect.objectContaining({
          title: 'Аркейн',
          type: 'animated_series',
          seasonCount: 2,
          episodesPerSeason: 9,
          episodeRuntimeMinutes: 42,
          runtimeMinutes: null
        })
      ]
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('Аркейн')).toBeInTheDocument()
    expect(screen.getByText('Мультсериал')).toBeInTheDocument()
  })

  it('keeps JSON import backward-compatible by defaulting omitted type to movie', async () => {
    const user = userEvent.setup()
    render(<MoviesPage />)
    await screen.findByText('Библиотека пока пустая')
    await user.click(screen.getByRole('button', { name: 'Из JSON' }))

    fireEvent.change(screen.getByRole('textbox', { name: 'JSON фильмов' }), {
      target: { value: '{"title":"Дюна"}' }
    })
    await user.click(screen.getByRole('button', { name: 'Добавить' }))

    await waitFor(() =>
      expect(mocks.createMovies).toHaveBeenCalledWith({
        movies: [
          expect.objectContaining({
            title: 'Дюна',
            type: 'movie',
            seasonCount: null,
            episodesPerSeason: null,
            episodeRuntimeMinutes: null
          })
        ]
      })
    )
  })

  it('rejects the removed anime type in JSON', async () => {
    const user = userEvent.setup()
    render(<MoviesPage />)
    await screen.findByText('Библиотека пока пустая')
    await user.click(screen.getByRole('button', { name: 'Из JSON' }))

    fireEvent.change(screen.getByRole('textbox', { name: 'JSON фильмов' }), {
      target: { value: '{"title":"Test","type":"anime"}' }
    })

    expect(await screen.findByText(/Тип должен быть одним из/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Добавить' })).toBeDisabled()
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

  it('uses a clean dedicated form with four content types and URL-only poster', async () => {
    const user = userEvent.setup()
    const { container } = render(<MoviesPage />)

    await screen.findByText('Библиотека пока пустая')
    await user.click(screen.getAllByRole('button', { name: 'Добавить фильм' })[0])

    expect(screen.getByRole('heading', { name: 'Добавить фильм' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Тип: Фильм' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Тип: Сериал' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Тип: Мультфильм' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Тип: Мультсериал' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Тип: Аниме' })).not.toBeInTheDocument()
    expect(screen.getByText('Актёры')).toBeInTheDocument()
    expect(screen.getByText('Личные комментарии')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('https://example.com/poster.jpg')).toHaveAttribute(
      'type',
      'url'
    )
    expect(screen.queryByText('Дата просмотра')).not.toBeInTheDocument()
    expect(container.querySelector('input[type="file"]')).toBeNull()
  })

  it('shows and saves episodic fields only for series types', async () => {
    const user = userEvent.setup()
    render(<MoviesPage />)

    await screen.findByText('Библиотека пока пустая')
    await user.click(screen.getAllByRole('button', { name: 'Добавить фильм' })[0])
    await user.type(screen.getByPlaceholderText('Интерстеллар'), 'Во все тяжкие')
    await user.click(screen.getByRole('button', { name: 'Тип: Сериал' }))

    expect(screen.getByText('Количество сезонов')).toBeInTheDocument()
    expect(screen.getByText('Серий в сезоне')).toBeInTheDocument()
    expect(screen.getByText('Длительность серии, мин.')).toBeInTheDocument()
    expect(screen.queryByText('Длительность, мин.')).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('Количество сезонов'), '5')
    await user.type(screen.getByLabelText('Серий в сезоне'), '13')
    await user.type(screen.getByLabelText('Длительность серии, мин.'), '47')
    await user.click(screen.getByRole('button', { name: 'Добавить фильм' }))

    await waitFor(() =>
      expect(mocks.createMovie).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Во все тяжкие',
          type: 'series',
          runtimeMinutes: null,
          seasonCount: 5,
          episodesPerSeason: 13,
          episodeRuntimeMinutes: 47
        })
      )
    )
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
    expect(screen.getByRole('button', { name: 'Тип: Фильм' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByDisplayValue('Matthew McConaughey, Anne Hathaway')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'К фильму' }))
    expect(screen.getByRole('button', { name: 'Изменить' })).toBeInTheDocument()
  })

  it('shows episodic metadata on the detail page and searches by display title only', async () => {
    const user = userEvent.setup()
    const seriesMovie: MovieRecord = {
      ...movie,
      id: 'series-1',
      title: 'Во все тяжкие',
      originalTitle: 'Breaking Bad',
      type: 'series',
      runtimeMinutes: null,
      seasonCount: 5,
      episodesPerSeason: 13,
      episodeRuntimeMinutes: 47,
      status: 'watchlist',
      favorite: false,
      rating: null
    }
    mocks.listOverview.mockResolvedValue({ movies: [seriesMovie] })
    render(<MoviesPage />)

    await user.click(await screen.findByRole('button', { name: 'Открыть фильм «Во все тяжкие»' }))
    expect(screen.getByText('Сезонов: 5')).toBeInTheDocument()
    expect(screen.getByText('Серий в сезоне: 13')).toBeInTheDocument()
    expect(screen.getByText('Серия: 47 мин.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Посмотреть' }))
    expect(mocks.searchWeb).toHaveBeenCalledWith({ query: 'Во все тяжкие' })
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
    expect(screen.getByRole('heading', { name: 'Вернуть в «Хочу посмотреть»?' })).toBeInTheDocument()
    expect(screen.getByText('Текущая оценка будет удалена')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Отмена' }))
    expect(mocks.updateMovie).not.toHaveBeenCalled()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()

    await user.click(watchlist)
    await user.click(screen.getByRole('button', { name: 'Вернуть' }))
    await waitFor(() =>
      expect(mocks.updateMovie).toHaveBeenCalledWith(
        expect.objectContaining({ id: movie.id, type: 'movie', status: 'watchlist', rating: null })
      )
    )
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Посмотреть' }))
    expect(mocks.searchWeb).toHaveBeenCalledWith({ query: 'Интерстеллар' })

    await user.click(screen.getByRole('button', { name: 'Открыть постер на весь экран' }))
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Закрыть полноэкранный постер' })
      ).toBeInTheDocument()
    )
  })
})
