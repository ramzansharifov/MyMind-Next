import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { MovieRecord } from '../../../../shared/contracts/movies'

const mocks = vi.hoisted(() => ({
  listOverview: vi.fn(),
  getMovie: vi.fn(),
  createMovie: vi.fn(),
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
  description: 'История о путешествии к звёздам.',
  status: 'watched',
  favorite: true,
  rating: 9.5,
  watchedAt: 1_700_000_000_000,
  notes: 'Сильный фильм.',
  createdAt: 1,
  updatedAt: 2
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.listOverview.mockResolvedValue({ movies: [] })
  mocks.getMovie.mockResolvedValue(null)
  mocks.createMovie.mockResolvedValue(movie)
  mocks.updateMovie.mockImplementation(async (input) => ({ ...movie, ...input, updatedAt: 3 }))
  mocks.deleteMovie.mockResolvedValue(true)
})

describe('MoviesPage', () => {
  it('opens movie creation as a dedicated page with URL-only poster input', async () => {
    const user = userEvent.setup()
    const { container } = render(<MoviesPage />)

    await screen.findByText('Библиотека пока пустая')
    await user.click(screen.getAllByRole('button', { name: 'Добавить фильм' })[0])

    expect(screen.getByRole('heading', { name: 'Добавить фильм в библиотеку' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'К библиотеке' })).toBeInTheDocument()
    expect(screen.getByText('Основная информация')).toBeInTheDocument()
    expect(screen.getByText('Моя библиотека')).toBeInTheDocument()
    expect(screen.getByText('Ссылка на постер')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('https://example.com/poster.jpg')).toHaveAttribute(
      'type',
      'url'
    )
    expect(container.querySelector('input[type="file"]')).toBeNull()
    expect(container.querySelector('[data-app-dialog-content]')).toBeNull()
  })

  it('opens editing as a dedicated page and returns to the movie view', async () => {
    const user = userEvent.setup()
    mocks.listOverview.mockResolvedValue({ movies: [movie] })

    render(<MoviesPage />)

    await user.click(await screen.findByRole('button', { name: 'Открыть фильм «Интерстеллар»' }))
    await user.click(screen.getByRole('button', { name: 'Изменить' }))

    expect(screen.getByText('Редактирование')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Интерстеллар' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'К фильму' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'К фильму' }))
    expect(screen.getByRole('button', { name: 'Изменить' })).toBeInTheDocument()
  })

  it('opens a separate movie view and fullscreen poster dialog', async () => {
    const user = userEvent.setup()
    mocks.listOverview.mockResolvedValue({ movies: [movie] })

    render(<MoviesPage />)

    await user.click(await screen.findByRole('button', { name: 'Открыть фильм «Интерстеллар»' }))
    expect(screen.getByRole('heading', { name: 'Интерстеллар' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Открыть постер на весь экран' }))
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Закрыть полноэкранный постер' })
      ).toBeInTheDocument()
    )
  })
})
