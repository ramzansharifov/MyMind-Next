import { describe, expect, it } from 'vitest'
import type { MovieRecord } from '@mymind/contracts/movies'

import {
  collectMovieFilterOptions,
  movieAdvancedFiltersActive,
  movieMatchesAdvancedFilters,
  sortMovieRecords,
  type MovieAdvancedFilters
} from './movie-filters'

function movie(overrides: Partial<MovieRecord> = {}): MovieRecord {
  return {
    id: 'movie-1',
    title: 'Фильм',
    originalTitle: null,
    type: 'movie',
    year: 2026,
    posterUrl: null,
    director: 'Режиссёр',
    runtimeMinutes: 120,
    seasonCount: null,
    episodesPerSeason: null,
    episodeRuntimeMinutes: null,
    genres: ['Драма'],
    actors: ['Актёр'],
    description: '',
    status: 'watchlist',
    favorite: false,
    rating: 8,
    comments: '',
    createdAt: 1,
    updatedAt: 2,
    ...overrides
  }
}

const base: MovieAdvancedFilters = {
  types: [],
  genre: '',
  year: '',
  director: '',
  actor: '',
  minRating: 0,
  sort: 'recent'
}

describe('mobile movie advanced filters', () => {
  it('supports selecting several movie types at once', () => {
    const filters = { ...base, types: ['movie', 'series'] as const }
    expect(movieMatchesAdvancedFilters(movie({ type: 'movie' }), filters)).toBe(true)
    expect(movieMatchesAdvancedFilters(movie({ type: 'series' }), filters)).toBe(true)
    expect(movieMatchesAdvancedFilters(movie({ type: 'cartoon' }), filters)).toBe(false)
  })

  it('matches exact dropdown selections case-insensitively', () => {
    const filters = {
      ...base,
      genre: 'драма',
      director: 'режиссёр',
      actor: 'актёр'
    }
    expect(
      movieMatchesAdvancedFilters(
        movie({ genres: ['Драма'], director: 'РЕЖИССЁР', actors: ['Актёр'] }),
        filters
      )
    ).toBe(true)
  })

  it('applies the selected minimum star rating', () => {
    expect(movieMatchesAdvancedFilters(movie({ rating: 7 }), { ...base, minRating: 8 })).toBe(
      false
    )
    expect(movieMatchesAdvancedFilters(movie({ rating: 9 }), { ...base, minRating: 8 })).toBe(
      true
    )
  })

  it('collects unique searchable dropdown values', () => {
    const options = collectMovieFilterOptions([
      movie({ id: '1', genres: ['Драма', 'Комедия'], director: 'Иван', actors: ['Анна'] }),
      movie({ id: '2', genres: ['драма'], director: 'иван', actors: ['Борис', 'Анна'] })
    ])

    expect(options.genres).toEqual(['Драма', 'Комедия'])
    expect(options.directors).toEqual(['Иван'])
    expect(options.actors).toEqual(['Анна', 'Борис'])
  })

  it('keeps only one sort mode and reports active filters correctly', () => {
    const items = [
      movie({ id: '1', title: 'Б', rating: 6, year: 2020, updatedAt: 5 }),
      movie({ id: '2', title: 'А', rating: 9, year: 2024, updatedAt: 2 })
    ]

    expect(sortMovieRecords(items, 'title').map((item) => item.id)).toEqual(['2', '1'])
    expect(sortMovieRecords(items, 'rating').map((item) => item.id)).toEqual(['2', '1'])
    expect(movieAdvancedFiltersActive(base)).toBe(false)
    expect(movieAdvancedFiltersActive({ ...base, sort: 'rating' })).toBe(true)
  })
})
