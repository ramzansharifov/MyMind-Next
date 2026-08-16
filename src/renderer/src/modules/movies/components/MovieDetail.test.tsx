import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { MovieRecord } from '../../../../../shared/contracts/movies'
import { MovieDetail } from './MovieDetail'

const watchlistMovie: MovieRecord = {
  id: 'movie-1',
  title: 'Интерстеллар',
  originalTitle: 'Interstellar',
  type: 'movie',
  year: 2014,
  posterUrl: null,
  director: 'Christopher Nolan',
  runtimeMinutes: 169,
  seasonCount: null,
  episodesPerSeason: null,
  episodeRuntimeMinutes: null,
  genres: ['Фантастика'],
  actors: ['Matthew McConaughey'],
  description: '',
  status: 'watchlist',
  favorite: false,
  rating: null,
  comments: '',
  createdAt: 1,
  updatedAt: 2
}

describe('MovieDetail', () => {
  it('requires a rating before moving a watchlist item to watched', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn().mockResolvedValue(undefined)

    render(
      <MovieDetail
        movie={watchlistMovie}
        busy={false}
        onUpdate={onUpdate}
        onSearchWeb={vi.fn().mockResolvedValue(undefined)}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Просмотрено' }))

    expect(screen.getByRole('heading', { name: 'Отметить как просмотрено' })).toBeInTheDocument()
    expect(onUpdate).not.toHaveBeenCalled()

    const confirm = screen.getByRole('button', { name: 'Отметить просмотренным' })
    expect(confirm).toBeDisabled()

    const rating = screen.getByRole('radio', { name: 'Оценка 8' })
    await user.click(rating)
    expect(rating).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByText('Выбрано: 8 / 10')).toBeInTheDocument()
    expect(confirm).toBeEnabled()

    await user.click(confirm)

    await waitFor(() =>
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ id: watchlistMovie.id, status: 'watched', rating: 8 })
      )
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('does not change status when the rating dialog is cancelled', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn().mockResolvedValue(undefined)

    render(
      <MovieDetail
        movie={watchlistMovie}
        busy={false}
        onUpdate={onUpdate}
        onSearchWeb={vi.fn().mockResolvedValue(undefined)}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Просмотрено' }))
    await user.click(screen.getByRole('radio', { name: 'Оценка 10' }))
    await user.click(screen.getByRole('button', { name: 'Отмена' }))

    expect(onUpdate).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
