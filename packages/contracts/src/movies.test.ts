import { describe, expect, it } from 'vitest'

import { stringifyMovieJson, type MovieRecord } from './movies'

const movie: MovieRecord = {
  id: 'movie-json-1',
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
  description: 'Описание',
  status: 'watched',
  favorite: true,
  rating: 10,
  comments: 'Комментарий',
  createdAt: 123,
  updatedAt: 456
}

describe('stringifyMovieJson', () => {
  it('keeps every persisted field for one movie', () => {
    const parsed = JSON.parse(stringifyMovieJson(movie)) as MovieRecord

    expect(parsed).toEqual(movie)
    expect(parsed).toMatchObject({
      id: 'movie-json-1',
      createdAt: 123,
      updatedAt: 456,
      seasonCount: null,
      episodesPerSeason: null,
      episodeRuntimeMinutes: null
    })
  })

  it('serializes the complete library as an array', () => {
    const second: MovieRecord = {
      ...movie,
      id: 'movie-json-2',
      title: 'Аркейн',
      type: 'animated_series',
      runtimeMinutes: null,
      seasonCount: 2,
      episodesPerSeason: 9,
      episodeRuntimeMinutes: 42
    }

    expect(JSON.parse(stringifyMovieJson([movie, second]))).toEqual([movie, second])
  })
})
