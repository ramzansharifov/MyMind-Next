import { describe, expect, it } from 'vitest'
import { normalizeMovieFormValues } from './catalog-forms'

describe('normalizeMovieFormValues', () => {
  it('clears episodic fields for movies and cartoons', () => {
    expect(
      normalizeMovieFormValues({
        type: 'movie',
        status: 'watched',
        runtimeMinutes: 120,
        seasonCount: 4,
        episodesPerSeason: 10,
        episodeRuntimeMinutes: 45,
        rating: 8
      })
    ).toMatchObject({
      runtimeMinutes: 120,
      seasonCount: null,
      episodesPerSeason: null,
      episodeRuntimeMinutes: null,
      rating: 8
    })
  })

  it('clears movie runtime for series and keeps episodic values', () => {
    expect(
      normalizeMovieFormValues({
        type: 'series',
        status: 'watched',
        runtimeMinutes: 120,
        seasonCount: 4,
        episodesPerSeason: 10,
        episodeRuntimeMinutes: 45,
        rating: 9
      })
    ).toMatchObject({
      runtimeMinutes: null,
      seasonCount: 4,
      episodesPerSeason: 10,
      episodeRuntimeMinutes: 45,
      rating: 9
    })
  })

  it('clears rating when the item is not watched', () => {
    expect(
      normalizeMovieFormValues({
        type: 'cartoon',
        status: 'watchlist',
        runtimeMinutes: 90,
        rating: 10
      })
    ).toMatchObject({
      runtimeMinutes: 90,
      rating: null
    })
  })
})
