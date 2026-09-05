import type { RepositoryRuntime } from '@mymind/contracts/storage'
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
} from '@mymind/contracts/movies'

export function createMoviesRepository(runtime: RepositoryRuntime): MoviesRepository {
  const getSqlite = runtime.database
  const randomUUID = runtime.createId
  interface MovieRow {
    id: string
    title: string
    original_title: string | null
    type: MovieType
    year: number | null
    poster_url: string | null
    director: string
    runtime_minutes: number | null
    season_count: number | null
    episodes_per_season: number | null
    episode_runtime_minutes: number | null
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
  season_count,
  episodes_per_season,
  episode_runtime_minutes,
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

  function isEpisodicType(type: MovieType): boolean {
    return type === 'series' || type === 'animated_series'
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
      seasonCount: row.season_count,
      episodesPerSeason: row.episodes_per_season,
      episodeRuntimeMinutes: row.episode_runtime_minutes,
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

  function resolvedOptionalNumber(
    value: number | null | undefined,
    fallback: number | null
  ): number | null {
    return value === undefined ? fallback : value
  }

  function normalizedPayload(
    input: CreateMovieInput | UpdateMovieInput,
    existing: MovieRecord | null = null
  ): readonly unknown[] {
    const episodic = isEpisodicType(input.type)
    const seasonCount = episodic
      ? resolvedOptionalNumber(input.seasonCount, existing?.seasonCount ?? null)
      : null
    const episodesPerSeason = episodic
      ? resolvedOptionalNumber(input.episodesPerSeason, existing?.episodesPerSeason ?? null)
      : null
    const episodeRuntimeMinutes = episodic
      ? resolvedOptionalNumber(input.episodeRuntimeMinutes, existing?.episodeRuntimeMinutes ?? null)
      : null

    return [
      input.title,
      input.originalTitle,
      input.type,
      input.year,
      input.posterUrl,
      input.director,
      episodic ? null : input.runtimeMinutes,
      seasonCount,
      episodesPerSeason,
      episodeRuntimeMinutes,
      JSON.stringify(input.genres),
      JSON.stringify(input.actors),
      input.description,
      input.status,
      input.favorite ? 1 : 0,
      input.status === 'watched' ? input.rating : null,
      input.comments
    ]
  }

  function listMoviesOverview(): MoviesOverview {
    const rows = getSqlite()
      .prepare(`${MOVIE_SELECT} ORDER BY updated_at DESC, created_at DESC`)
      .all() as MovieRow[]
    return { movies: rows.map(mapMovie) }
  }

  function getMovie(input: GetMovieInput): MovieRecord | null {
    return findMovie(input.id)
  }

  function insertMovie(input: CreateMovieInput): MovieRecord {
    const id = randomUUID()
    const now = runtime.now()
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
        season_count,
        episodes_per_season,
        episode_runtime_minutes,
        genres_json,
        actors_json,
        description,
        status,
        favorite,
        rating,
        comments,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(id, ...normalizedPayload(input), now, now)

    return requireMovie(id)
  }

  function createMovie(input: CreateMovieInput): MovieRecord {
    return insertMovie(input)
  }

  function createMovies(input: CreateMoviesInput): MovieRecord[] {
    const transaction = getSqlite().transaction((movies: CreateMovieInput[]) =>
      movies.map((movie) => insertMovie(movie))
    )
    return transaction(input.movies)
  }

  function updateMovie(input: UpdateMovieInput): MovieRecord {
    const existing = requireMovie(input.id)
    const now = runtime.now()
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
        season_count = ?,
        episodes_per_season = ?,
        episode_runtime_minutes = ?,
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
      .run(...normalizedPayload(input, existing), now, input.id)

    return requireMovie(input.id)
  }

  function deleteMovie(input: DeleteMovieInput): boolean {
    requireMovie(input.id)
    const result = getSqlite().prepare('DELETE FROM movies WHERE id = ?').run(input.id)
    return result.changes > 0
  }
  return { listMoviesOverview, getMovie, createMovie, createMovies, updateMovie, deleteMovie }
}

export interface MoviesRepository {
  listMoviesOverview(): MoviesOverview
  getMovie(input: GetMovieInput): MovieRecord | null
  createMovie(input: CreateMovieInput): MovieRecord
  createMovies(input: CreateMoviesInput): MovieRecord[]
  updateMovie(input: UpdateMovieInput): MovieRecord
  deleteMovie(input: DeleteMovieInput): boolean
}
