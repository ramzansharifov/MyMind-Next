import { describe, expect, it } from 'vitest'
import type { MovieRecord } from '@mymind/contracts/movies'
import { updateMovieInputSchema } from '@mymind/core/validation/movies'
import {
  formatMovieRuntime,
  isEpisodicMovieType,
  movieLibraryStats,
  movieRecordToUpdateInput,
  movieTypeLabel
} from './movie-presentation'

function movie(overrides: Partial<MovieRecord> = {}): MovieRecord {
  return {
    id: 'movie-1',
    title: 'Фильм',
    originalTitle: null,
    type: 'movie',
    year: 2026,
    posterUrl: null,
    director: '',
    runtimeMinutes: 120,
    seasonCount: null,
    episodesPerSeason: null,
    episodeRuntimeMinutes: null,
    genres: [],
    actors: [],
    description: '',
    status: 'watchlist',
    favorite: false,
    rating: null,
    comments: '',
    createdAt: 1,
    updatedAt: 2,
    ...overrides
  }
}

describe('mobile movie presentation helpers', () => {
  it('uses the same type semantics as desktop movies', () => {
    expect(movieTypeLabel('movie')).toBe('Фильм')
    expect(movieTypeLabel('series')).toBe('Сериал')
    expect(movieTypeLabel('cartoon')).toBe('Мультфильм')
    expect(movieTypeLabel('animated_series')).toBe('Мультсериал')
    expect(isEpisodicMovieType('series')).toBe(true)
    expect(isEpisodicMovieType('animated_series')).toBe(true)
    expect(isEpisodicMovieType('movie')).toBe(false)
  })

  it('formats runtimes without losing exact minutes', () => {
    expect(formatMovieRuntime(null)).toBeNull()
    expect(formatMovieRuntime(45)).toBe('45 мин')
    expect(formatMovieRuntime(60)).toBe('1 ч')
    expect(formatMovieRuntime(145)).toBe('2 ч 25 мин')
  })

  it('maps records to strict update inputs without persistence timestamps', () => {
    const input = movieRecordToUpdateInput(
      movie({ status: 'watched', favorite: true, rating: 9, createdAt: 100, updatedAt: 200 })
    )

    expect(input).not.toHaveProperty('createdAt')
    expect(input).not.toHaveProperty('updatedAt')
    expect(updateMovieInputSchema.parse(input)).toEqual(input)
  })

  it('derives overview statistics only from the existing movie records', () => {
    const stats = movieLibraryStats([
      movie({ id: '1', status: 'watched', favorite: true, rating: 8 }),
      movie({ id: '2', status: 'watched', rating: 9 }),
      movie({ id: '3', status: 'watchlist', favorite: true }),
      movie({ id: '4', status: 'watchlist' })
    ])

    expect(stats).toEqual({
      total: 4,
      watched: 2,
      watchlist: 2,
      favorites: 2,
      rated: 2,
      averageRating: 8.5
    })
  })

  it('keeps average rating empty when nothing has been rated', () => {
    expect(movieLibraryStats([movie(), movie({ id: '2' })]).averageRating).toBeNull()
  })
})
