import { randomUUID } from 'node:crypto'

import type {
  CreateMovieInput,
  CreateMoviesInput,
  DeleteMovieInput,
  GetMovieInput,
  MovieRecord,
  MovieStatus,
  MovieType,
  MoviesOverview,
  UpdateMovieInput
} from '../../shared/contracts/movies'
import { getSqlite } from '../database/client'

interface MovieRow {
  id: string
  title: string
  original_title: string | null
  type: MovieType
  year: number | null
  poster_url: string | null
  director: string
  runtime_minutes: number | null
  genres_json: string
  actors_json: string
  description: string
  status: MovieStatus
  favorite: number
  rating: number | null
  comments: string
  created_at: number
  updated_at: number
}

const MOVIE_SELECT = `SELECT
  id,
  title,
  original_title,
  type,
  year,
  poster_url,
  director,
  runtime_minutes,
  genres_json,
  actors_json,
  description,
  status,
  favorite,
  rating,
  comments,
  created_at,
  updated_at
FROM movies`

function parseStringList(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : []
  } catch {
    return []
  }
}

function mapMovie(row: MovieRow): MovieRecord {
  return {
    id: row.id,
    title: row.title,
    originalTitle: row.original_title,
    type: row.type,
    year: row.year,
    posterUrl: row.poster_url,
    director: row.director,
    runtimeMinutes: row.runtime_minutes,
    genres: parseStringList(row.genres_json),
    actors: parseStringList(row.actors_json),
    description: row.description,
    status: row.status,
    favorite: Boolean(row.favorite),
    rating: row.status === 'watched' ? row.rating : null,
    comments: row.comments,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function findMovie(id: string): MovieRecord | null {
  const row = getSqlite().prepare(`${MOVIE_SELECT} WHERE id = ?`).get(id) as MovieRow | undefined
  return row ? mapMovie(row) : null
}

function requireMovie(id: string): MovieRecord {
  const movie = findMovie(id)
  if (!movie) throw new Error('Фильм не найден')
  return movie
}

function normalizedPayload(input: CreateMovieInput | UpdateMovieInput): readonly unknown[] {
  return [
    input.title,
    input.originalTitle,
    input.type,
    input.year,
    input.posterUrl,
    input.director,
    input.runtimeMinutes,
    JSON.stringify(input.genres),
    JSON.stringify(input.actors),
    input.description,
    input.status,
    input.favorite ? 1 : 0,
    input.status === 'watched' ? input.rating : null,
    input.comments
  ]
}

export function listMoviesOverview(): MoviesOverview {
  const rows = getSqlite()
    .prepare(`${MOVIE_SELECT} ORDER BY updated_at DESC, created_at DESC`)
    .all() as MovieRow[]
  return { movies: rows.map(mapMovie) }
}

export function getMovie(input: GetMovieInput): MovieRecord | null {
  return findMovie(input.id)
}

function insertMovie(input: CreateMovieInput): MovieRecord {
  const id = randomUUID()
  const now = Date.now()
  getSqlite()
    .prepare(
      `INSERT INTO movies (
        id,
        title,
        original_title,
        type,
        year,
        poster_url,
        director,
        runtime_minutes,
        genres_json,
        actors_json,
        description,
        status,
        favorite,
        rating,
        comments,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(id, ...normalizedPayload(input), now, now)

  return requireMovie(id)
}

export function createMovie(input: CreateMovieInput): MovieRecord {
  return insertMovie(input)
}

export function createMovies(input: CreateMoviesInput): MovieRecord[] {
  const transaction = getSqlite().transaction((movies: CreateMovieInput[]) =>
    movies.map((movie) => insertMovie(movie))
  )
  return transaction(input.movies)
}

export function updateMovie(input: UpdateMovieInput): MovieRecord {
  requireMovie(input.id)
  const now = Date.now()
  getSqlite()
    .prepare(
      `UPDATE movies SET
        title = ?,
        original_title = ?,
        type = ?,
        year = ?,
        poster_url = ?,
        director = ?,
        runtime_minutes = ?,
        genres_json = ?,
        actors_json = ?,
        description = ?,
        status = ?,
        favorite = ?,
        rating = ?,
        comments = ?,
        updated_at = ?
       WHERE id = ?`
    )
    .run(...normalizedPayload(input), now, input.id)

  return requireMovie(input.id)
}

export function deleteMovie(input: DeleteMovieInput): boolean {
  requireMovie(input.id)
  const result = getSqlite().prepare('DELETE FROM movies WHERE id = ?').run(input.id)
  return result.changes > 0
}
