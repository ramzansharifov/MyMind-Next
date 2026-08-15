import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { closeDatabase, getSqlite, initializeDatabaseForTesting } from '../database/client'
import { runDatabaseMigrationsFrom } from '../database/migrate'
import { createMovie, deleteMovie, getMovie, listMoviesOverview, updateMovie } from './movies.repository'

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
  it('creates, lists and loads a movie with personal metadata', () => {
    const movie = createMovie({
      title: 'Интерстеллар',
      originalTitle: 'Interstellar',
      year: 2014,
      posterUrl: 'https://example.com/interstellar.jpg',
      director: 'Christopher Nolan',
      runtimeMinutes: 169,
      genres: ['Фантастика', 'Драма'],
      description: 'Космическая история.',
      status: 'watched',
      favorite: true,
      rating: 9.5,
      watchedAt: 1_700_000_000_000,
      notes: 'Пересмотреть.'
    })

    expect(getMovie({ id: movie.id })).toEqual(movie)
    expect(listMoviesOverview().movies).toEqual([movie])
  })

  it('updates status and clears watchedAt outside watched state', () => {
    const movie = createMovie({
      title: 'Dune',
      originalTitle: null,
      year: 2021,
      posterUrl: null,
      director: '',
      runtimeMinutes: null,
      genres: [],
      description: '',
      status: 'watched',
      favorite: false,
      rating: 8,
      watchedAt: 1_700_000_000_000,
      notes: ''
    })

    const updated = updateMovie({ ...movie, status: 'watchlist', watchedAt: null })
    expect(updated.status).toBe('watchlist')
    expect(updated.watchedAt).toBeNull()
  })

  it('deletes movies permanently', () => {
    const movie = createMovie({
      title: 'Arrival',
      originalTitle: null,
      year: null,
      posterUrl: null,
      director: '',
      runtimeMinutes: null,
      genres: [],
      description: '',
      status: 'watchlist',
      favorite: false,
      rating: null,
      watchedAt: null,
      notes: ''
    })

    expect(deleteMovie({ id: movie.id })).toBe(true)
    expect(getMovie({ id: movie.id })).toBeNull()
  })
})
