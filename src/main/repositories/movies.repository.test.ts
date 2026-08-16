import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { closeDatabase, getSqlite, initializeDatabaseForTesting } from '../database/client'
import { runDatabaseMigrationsFrom } from '../database/migrate'
import {
  createMovie,
  createMovies,
  deleteMovie,
  getMovie,
  listMoviesOverview,
  updateMovie
} from './movies.repository'

let root = ''

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'mymind-movies-'))
  initializeDatabaseForTesting(join(root, 'movies.sqlite'))
  runDatabaseMigrationsFrom(resolve(process.cwd(), 'drizzle'))
})

beforeEach(() => {
  getSqlite().exec('DELETE FROM movies;')
})

afterAll(async () => {
  closeDatabase()
  await rm(root, { recursive: true, force: true })
})

describe('movies repository', () => {
  it('persists type, actors, comments and personal rating', () => {
    const movie = createMovie({
      title: 'Интерстеллар',
      originalTitle: 'Interstellar',
      type: 'movie',
      year: 2014,
      posterUrl: 'https://example.com/interstellar.jpg',
      director: 'Christopher Nolan',
      runtimeMinutes: 169,
      genres: ['Фантастика', 'Драма'],
      actors: ['Matthew McConaughey', 'Anne Hathaway'],
      description: 'Космическая история.',
      status: 'watched',
      favorite: true,
      rating: 9,
      comments: 'Пересмотреть.'
    })

    expect(getMovie({ id: movie.id })).toEqual(movie)
    expect(movie.type).toBe('movie')
    expect(listMoviesOverview().movies).toEqual([movie])
  })

  it('creates multiple content types in one transaction and rolls back the whole batch on failure', () => {
    const base = {
      originalTitle: null,
      type: 'movie' as const,
      year: null,
      posterUrl: null,
      director: '',
      runtimeMinutes: null,
      genres: [],
      actors: [],
      description: '',
      status: 'watchlist' as const,
      favorite: false,
      rating: null,
      comments: ''
    }

    const created = createMovies({
      movies: [
        { ...base, title: 'Movie A' },
        { ...base, title: 'Series B', type: 'series' }
      ]
    })
    expect(created.map((movie) => [movie.title, movie.type])).toEqual([
      ['Movie A', 'movie'],
      ['Series B', 'series']
    ])
    expect(listMoviesOverview().movies).toHaveLength(2)

    getSqlite().exec('DELETE FROM movies;')
    expect(() =>
      createMovies({
        movies: [
          { ...base, title: 'Will roll back' },
          { ...base, title: null as unknown as string }
        ]
      })
    ).toThrow()
    expect(listMoviesOverview().movies).toHaveLength(0)
  })

  it('clears rating outside watched state', () => {
    const movie = createMovie({
      title: 'Dune',
      originalTitle: null,
      type: 'movie',
      year: 2021,
      posterUrl: null,
      director: '',
      runtimeMinutes: null,
      genres: [],
      actors: [],
      description: '',
      status: 'watched',
      favorite: false,
      rating: 8,
      comments: ''
    })

    const updated = updateMovie({ ...movie, status: 'watchlist', rating: 8 })
    expect(updated.status).toBe('watchlist')
    expect(updated.rating).toBeNull()
  })

  it('deletes movies permanently', () => {
    const movie = createMovie({
      title: 'Arrival',
      originalTitle: null,
      type: 'movie',
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
    })

    expect(deleteMovie({ id: movie.id })).toBe(true)
    expect(getMovie({ id: movie.id })).toBeNull()
  })
})
