import { describe, expect, it } from 'vitest'

import { createMovieInputSchema } from './movies'

const baseMovie = {
  title: 'Test',
  originalTitle: null,
  type: 'movie' as const,
  year: null,
  posterUrl: null,
  director: '',
  runtimeMinutes: null,
  seasonCount: null,
  episodesPerSeason: null,
  episodeRuntimeMinutes: null,
  genres: [],
  actors: [],
  description: '',
  status: 'watchlist' as const,
  favorite: false,
  rating: null,
  comments: ''
}

describe('movies validation', () => {
  it('accepts episodic metadata only for series and animated series', () => {
    expect(
      createMovieInputSchema.safeParse({
        ...baseMovie,
        type: 'series',
        seasonCount: 5,
        episodesPerSeason: 10,
        episodeRuntimeMinutes: 48
      }).success
    ).toBe(true)

    expect(
      createMovieInputSchema.safeParse({
        ...baseMovie,
        seasonCount: 5
      }).success
    ).toBe(false)
  })

  it('uses episode runtime instead of generic runtime for episodic types', () => {
    expect(
      createMovieInputSchema.safeParse({
        ...baseMovie,
        type: 'animated_series',
        runtimeMinutes: 42
      }).success
    ).toBe(false)
  })

  it('rejects the removed anime type', () => {
    expect(
      createMovieInputSchema.safeParse({
        ...baseMovie,
        type: 'anime'
      }).success
    ).toBe(false)
  })
})
