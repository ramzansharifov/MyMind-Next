from pathlib import Path
import json

root = Path('.')

(root / 'src/shared/contracts/movies.ts').write_text('''export const MOVIE_STATUSES = ['watchlist', 'watched'] as const\n\nexport type MovieStatus = (typeof MOVIE_STATUSES)[number]\n\nexport interface MovieRecord {\n  id: string\n  title: string\n  originalTitle: string | null\n  year: number | null\n  posterUrl: string | null\n  director: string\n  runtimeMinutes: number | null\n  genres: string[]\n  actors: string[]\n  description: string\n  status: MovieStatus\n  favorite: boolean\n  rating: number | null\n  comments: string\n  createdAt: number\n  updatedAt: number\n}\n\nexport interface MoviesOverview {\n  movies: MovieRecord[]\n}\n\nexport interface CreateMovieInput {\n  title: string\n  originalTitle: string | null\n  year: number | null\n  posterUrl: string | null\n  director: string\n  runtimeMinutes: number | null\n  genres: string[]\n  actors: string[]\n  description: string\n  status: MovieStatus\n  favorite: boolean\n  rating: number | null\n  comments: string\n}\n\nexport interface UpdateMovieInput extends CreateMovieInput {\n  id: string\n}\n\nexport interface GetMovieInput {\n  id: string\n}\n\nexport interface DeleteMovieInput {\n  id: string\n}\n\nexport const MOVIES_IPC_CHANNELS = {\n  listOverview: 'movies:list-overview',\n  getMovie: 'movies:get-movie',\n  createMovie: 'movies:create-movie',\n  updateMovie: 'movies:update-movie',\n  deleteMovie: 'movies:delete-movie'\n} as const\n\nexport interface MoviesApi {\n  listOverview(): Promise<MoviesOverview>\n  getMovie(input: GetMovieInput): Promise<MovieRecord | null>\n  createMovie(input: CreateMovieInput): Promise<MovieRecord>\n  updateMovie(input: UpdateMovieInput): Promise<MovieRecord>\n  deleteMovie(input: DeleteMovieInput): Promise<boolean>\n}\n''')

(root / 'src/shared/validation/movies.ts').write_text('''import { z } from 'zod'\n\nimport { MOVIE_STATUSES } from '../contracts/movies'\n\nconst MOVIE_SAFE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/\nconst MAX_MOVIE_TITLE_LENGTH = 200\nconst MAX_MOVIE_TEXT_LENGTH = 10_000\nconst MAX_MOVIE_DESCRIPTION_LENGTH = 5_000\nconst MAX_MOVIE_DIRECTOR_LENGTH = 240\nconst MAX_MOVIE_GENRES = 16\nconst MAX_MOVIE_ACTORS = 64\n\nexport const movieSafeIdSchema = z\n  .string()\n  .regex(MOVIE_SAFE_ID_PATTERN, 'Некорректный идентификатор фильма')\n\nexport const movieStatusSchema = z.enum(MOVIE_STATUSES)\n\nconst nullableTrimmedText = (max: number): z.ZodNullable<z.ZodString> =>\n  z.string().trim().max(max).nullable()\n\nconst posterUrlSchema = z\n  .string()\n  .trim()\n  .url('Введите корректную ссылку на постер')\n  .refine((value) => value.startsWith('https://') || value.startsWith('http://'), {\n    message: 'Постер должен использовать ссылку http:// или https://'\n  })\n  .nullable()\n\nconst ratingSchema = z\n  .number()\n  .int('Оценка должна быть целым числом')\n  .min(1, 'Минимальная оценка — 1')\n  .max(10, 'Максимальная оценка — 10')\n  .nullable()\n\nconst stringListSchema = (maxItems: number) =>\n  z\n    .array(z.string().trim().min(1).max(120))\n    .max(maxItems)\n    .transform((items) => Array.from(new Set(items)))\n\nconst movieBaseInputSchema = z\n  .object({\n    title: z.string().trim().min(1, 'Введите название фильма').max(MAX_MOVIE_TITLE_LENGTH),\n    originalTitle: nullableTrimmedText(MAX_MOVIE_TITLE_LENGTH),\n    year: z.number().int().min(1800).max(2200).nullable(),\n    posterUrl: posterUrlSchema,\n    director: z.string().trim().max(MAX_MOVIE_DIRECTOR_LENGTH),\n    runtimeMinutes: z.number().int().min(1).max(1_440).nullable(),\n    genres: stringListSchema(MAX_MOVIE_GENRES),\n    actors: stringListSchema(MAX_MOVIE_ACTORS),\n    description: z.string().trim().max(MAX_MOVIE_DESCRIPTION_LENGTH),\n    status: movieStatusSchema,\n    favorite: z.boolean(),\n    rating: ratingSchema,\n    comments: z.string().trim().max(MAX_MOVIE_TEXT_LENGTH)\n  })\n  .strict()\n\nfunction validateRatingStatus(\n  input: { status: string; rating: number | null },\n  context: z.RefinementCtx\n): void {\n  if (input.status !== 'watched' && input.rating !== null) {\n    context.addIssue({\n      code: 'custom',\n      path: ['rating'],\n      message: 'Оценка доступна только для просмотренного фильма'\n    })\n  }\n}\n\nexport const createMovieInputSchema = movieBaseInputSchema.superRefine(validateRatingStatus)\n\nexport const updateMovieInputSchema = movieBaseInputSchema\n  .extend({ id: movieSafeIdSchema })\n  .strict()\n  .superRefine(validateRatingStatus)\n\nexport const getMovieInputSchema = z.object({ id: movieSafeIdSchema }).strict()\nexport const deleteMovieInputSchema = getMovieInputSchema\n''')

(root / 'src/main/database/schema/movies.ts').write_text('''import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'\n\nimport type { MovieStatus } from '../../../shared/contracts/movies'\n\nexport const movies = sqliteTable(\n  'movies',\n  {\n    id: text('id').primaryKey(),\n    title: text('title').notNull(),\n    originalTitle: text('original_title'),\n    year: integer('year'),\n    posterUrl: text('poster_url'),\n    director: text('director').notNull().default(''),\n    runtimeMinutes: integer('runtime_minutes'),\n    genresJson: text('genres_json').notNull().default('[]'),\n    actorsJson: text('actors_json').notNull().default('[]'),\n    description: text('description').notNull().default(''),\n    status: text('status').$type<MovieStatus>().notNull().default('watchlist'),\n    favorite: integer('favorite', { mode: 'boolean' }).notNull().default(false),\n    rating: integer('rating'),\n    comments: text('comments').notNull().default(''),\n    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),\n    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()\n  },\n  (table) => [\n    index('movies_status_updated_idx').on(table.status, table.updatedAt),\n    index('movies_favorite_updated_idx').on(table.favorite, table.updatedAt),\n    index('movies_title_idx').on(table.title)\n  ]\n)\n''')

(root / 'src/main/repositories/movies.repository.ts').write_text('''import { randomUUID } from 'node:crypto'\n\nimport type {\n  CreateMovieInput,\n  DeleteMovieInput,\n  GetMovieInput,\n  MovieRecord,\n  MovieStatus,\n  MoviesOverview,\n  UpdateMovieInput\n} from '../../shared/contracts/movies'\nimport { getSqlite } from '../database/client'\n\ninterface MovieRow {\n  id: string\n  title: string\n  original_title: string | null\n  year: number | null\n  poster_url: string | null\n  director: string\n  runtime_minutes: number | null\n  genres_json: string\n  actors_json: string\n  description: string\n  status: MovieStatus\n  favorite: number\n  rating: number | null\n  comments: string\n  created_at: number\n  updated_at: number\n}\n\nconst MOVIE_SELECT = `SELECT\n  id,\n  title,\n  original_title,\n  year,\n  poster_url,\n  director,\n  runtime_minutes,\n  genres_json,\n  actors_json,\n  description,\n  status,\n  favorite,\n  rating,\n  comments,\n  created_at,\n  updated_at\nFROM movies`\n\nfunction parseStringList(value: string): string[] {\n  try {\n    const parsed = JSON.parse(value) as unknown\n    return Array.isArray(parsed)\n      ? parsed.filter((item): item is string => typeof item === 'string')\n      : []\n  } catch {\n    return []\n  }\n}\n\nfunction mapMovie(row: MovieRow): MovieRecord {\n  return {\n    id: row.id,\n    title: row.title,\n    originalTitle: row.original_title,\n    year: row.year,\n    posterUrl: row.poster_url,\n    director: row.director,\n    runtimeMinutes: row.runtime_minutes,\n    genres: parseStringList(row.genres_json),\n    actors: parseStringList(row.actors_json),\n    description: row.description,\n    status: row.status,\n    favorite: Boolean(row.favorite),\n    rating: row.status === 'watched' ? row.rating : null,\n    comments: row.comments,\n    createdAt: row.created_at,\n    updatedAt: row.updated_at\n  }\n}\n\nfunction findMovie(id: string): MovieRecord | null {\n  const row = getSqlite().prepare(`${MOVIE_SELECT} WHERE id = ?`).get(id) as MovieRow | undefined\n  return row ? mapMovie(row) : null\n}\n\nfunction requireMovie(id: string): MovieRecord {\n  const movie = findMovie(id)\n  if (!movie) throw new Error('Фильм не найден')\n  return movie\n}\n\nfunction normalizedPayload(input: CreateMovieInput | UpdateMovieInput): readonly unknown[] {\n  return [\n    input.title,\n    input.originalTitle,\n    input.year,\n    input.posterUrl,\n    input.director,\n    input.runtimeMinutes,\n    JSON.stringify(input.genres),\n    JSON.stringify(input.actors),\n    input.description,\n    input.status,\n    input.favorite ? 1 : 0,\n    input.status === 'watched' ? input.rating : null,\n    input.comments\n  ]\n}\n\nexport function listMoviesOverview(): MoviesOverview {\n  const rows = getSqlite()\n    .prepare(`${MOVIE_SELECT} ORDER BY updated_at DESC, created_at DESC`)\n    .all() as MovieRow[]\n  return { movies: rows.map(mapMovie) }\n}\n\nexport function getMovie(input: GetMovieInput): MovieRecord | null {\n  return findMovie(input.id)\n}\n\nexport function createMovie(input: CreateMovieInput): MovieRecord {\n  const id = randomUUID()\n  const now = Date.now()\n  getSqlite()\n    .prepare(\n      `INSERT INTO movies (\n        id,\n        title,\n        original_title,\n        year,\n        poster_url,\n        director,\n        runtime_minutes,\n        genres_json,\n        actors_json,\n        description,\n        status,\n        favorite,\n        rating,\n        comments,\n        created_at,\n        updated_at\n      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`\n    )\n    .run(id, ...normalizedPayload(input), now, now)\n\n  return requireMovie(id)\n}\n\nexport function updateMovie(input: UpdateMovieInput): MovieRecord {\n  requireMovie(input.id)\n  const now = Date.now()\n  getSqlite()\n    .prepare(\n      `UPDATE movies SET\n        title = ?,\n        original_title = ?,\n        year = ?,\n        poster_url = ?,\n        director = ?,\n        runtime_minutes = ?,\n        genres_json = ?,\n        actors_json = ?,\n        description = ?,\n        status = ?,\n        favorite = ?,\n        rating = ?,\n        comments = ?,\n        updated_at = ?\n       WHERE id = ?`\n    )\n    .run(...normalizedPayload(input), now, input.id)\n\n  return requireMovie(input.id)\n}\n\nexport function deleteMovie(input: DeleteMovieInput): boolean {\n  requireMovie(input.id)\n  const result = getSqlite().prepare('DELETE FROM movies WHERE id = ?').run(input.id)\n  return result.changes > 0\n}\n''')

(root / 'src/main/repositories/movies.repository.test.ts').write_text('''import { mkdtemp, rm } from 'node:fs/promises'\nimport { tmpdir } from 'node:os'\nimport { join, resolve } from 'node:path'\nimport { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'\n\nimport { closeDatabase, getSqlite, initializeDatabaseForTesting } from '../database/client'\nimport { runDatabaseMigrationsFrom } from '../database/migrate'\nimport {\n  createMovie,\n  deleteMovie,\n  getMovie,\n  listMoviesOverview,\n  updateMovie\n} from './movies.repository'\n\nlet root = ''\n\nbeforeAll(async () => {\n  root = await mkdtemp(join(tmpdir(), 'mymind-movies-'))\n  initializeDatabaseForTesting(join(root, 'movies.sqlite'))\n  runDatabaseMigrationsFrom(resolve(process.cwd(), 'drizzle'))\n})\n\nbeforeEach(() => {\n  getSqlite().exec('DELETE FROM movies;')\n})\n\nafterAll(async () => {\n  closeDatabase()\n  await rm(root, { recursive: true, force: true })\n})\n\ndescribe('movies repository', () => {\n  it('persists actors, comments and personal rating', () => {\n    const movie = createMovie({\n      title: 'Интерстеллар',\n      originalTitle: 'Interstellar',\n      year: 2014,\n      posterUrl: 'https://example.com/interstellar.jpg',\n      director: 'Christopher Nolan',\n      runtimeMinutes: 169,\n      genres: ['Фантастика', 'Драма'],\n      actors: ['Matthew McConaughey', 'Anne Hathaway'],\n      description: 'Космическая история.',\n      status: 'watched',\n      favorite: true,\n      rating: 9,\n      comments: 'Пересмотреть.'\n    })\n\n    expect(getMovie({ id: movie.id })).toEqual(movie)\n    expect(listMoviesOverview().movies).toEqual([movie])\n  })\n\n  it('clears rating outside watched state', () => {\n    const movie = createMovie({\n      title: 'Dune',\n      originalTitle: null,\n      year: 2021,\n      posterUrl: null,\n      director: '',\n      runtimeMinutes: null,\n      genres: [],\n      actors: [],\n      description: '',\n      status: 'watched',\n      favorite: false,\n      rating: 8,\n      comments: ''\n    })\n\n    const updated = updateMovie({ ...movie, status: 'watchlist', rating: 8 })\n    expect(updated.status).toBe('watchlist')\n    expect(updated.rating).toBeNull()\n  })\n\n  it('deletes movies permanently', () => {\n    const movie = createMovie({\n      title: 'Arrival',\n      originalTitle: null,\n      year: null,\n      posterUrl: null,\n      director: '',\n      runtimeMinutes: null,\n      genres: [],\n      actors: [],\n      description: '',\n      status: 'watchlist',\n      favorite: false,\n      rating: null,\n      comments: ''\n    })\n\n    expect(deleteMovie({ id: movie.id })).toBe(true)\n    expect(getMovie({ id: movie.id })).toBeNull()\n  })\n})\n''')

(root / 'src/renderer/src/modules/movies/components/MovieFormPage.tsx').write_text(r'''import {
  ArrowLeft,
  Bookmark,
  CalendarDays,
  Check,
  Clock3,
  Film,
  Heart,
  Image,
  LoaderCircle,
  Save,
  Star,
  Users
} from 'lucide-react'
import { useMemo, useState } from 'react'

import type {
  CreateMovieInput,
  MovieRecord,
  MovieStatus,
  UpdateMovieInput
} from '../../../../../shared/contracts/movies'

interface MovieFormPageProps {
  movie: MovieRecord | null
  busy: boolean
  onCancel: () => void
  onSave: (input: CreateMovieInput | UpdateMovieInput) => Promise<void>
}

const fieldClassName =
  'h-11 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3.5 text-sm text-[var(--app-text)] outline-none transition-[border-color,box-shadow,background-color] placeholder:text-[var(--app-muted)] focus:border-violet-500/45 focus:bg-[var(--app-surface)] focus:ring-2 focus:ring-violet-500/15'
const textareaClassName =
  'min-h-32 w-full resize-y rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3.5 py-3 text-sm leading-6 text-[var(--app-text)] outline-none transition-[border-color,box-shadow,background-color] placeholder:text-[var(--app-muted)] focus:border-violet-500/45 focus:bg-[var(--app-surface)] focus:ring-2 focus:ring-violet-500/15'

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }): React.JSX.Element {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-violet-500/15 bg-violet-500/10 text-violet-300 [&>svg]:size-4">
        {icon}
      </span>
      <h2 className="text-sm font-semibold text-[var(--app-text)]">{title}</h2>
    </div>
  )
}

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function MovieFormPage({
  movie,
  busy,
  onCancel,
  onSave
}: MovieFormPageProps): React.JSX.Element {
  const [title, setTitle] = useState(movie?.title ?? '')
  const [originalTitle, setOriginalTitle] = useState(movie?.originalTitle ?? '')
  const [posterUrl, setPosterUrl] = useState(movie?.posterUrl ?? '')
  const [year, setYear] = useState(movie?.year?.toString() ?? '')
  const [director, setDirector] = useState(movie?.director ?? '')
  const [runtimeMinutes, setRuntimeMinutes] = useState(movie?.runtimeMinutes?.toString() ?? '')
  const [genres, setGenres] = useState(movie?.genres.join(', ') ?? '')
  const [actors, setActors] = useState(movie?.actors.join(', ') ?? '')
  const [description, setDescription] = useState(movie?.description ?? '')
  const [status, setStatus] = useState<MovieStatus>(movie?.status ?? 'watchlist')
  const [favorite, setFavorite] = useState(movie?.favorite ?? false)
  const [rating, setRating] = useState<number | null>(movie?.rating ?? null)
  const [comments, setComments] = useState(movie?.comments ?? '')
  const [posterFailed, setPosterFailed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const normalizedPosterUrl = posterUrl.trim()
  const canPreviewPoster = useMemo(() => {
    if (!normalizedPosterUrl || posterFailed) return false
    try {
      const url = new URL(normalizedPosterUrl)
      return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
      return false
    }
  }, [normalizedPosterUrl, posterFailed])

  function changeStatus(nextStatus: MovieStatus): void {
    setStatus(nextStatus)
    if (nextStatus !== 'watched') setRating(null)
  }

  async function submit(): Promise<void> {
    setError(null)
    const cleanTitle = title.trim()
    if (!cleanTitle) {
      setError('Введите название фильма')
      return
    }

    const parsedYear = year.trim() ? Number(year) : null
    const parsedRuntime = runtimeMinutes.trim() ? Number(runtimeMinutes) : null
    const base: CreateMovieInput = {
      title: cleanTitle,
      originalTitle: originalTitle.trim() || null,
      year: Number.isFinite(parsedYear) ? parsedYear : null,
      posterUrl: normalizedPosterUrl || null,
      director: director.trim(),
      runtimeMinutes: Number.isFinite(parsedRuntime) ? parsedRuntime : null,
      genres: splitList(genres),
      actors: splitList(actors),
      description: description.trim(),
      status,
      favorite,
      rating: status === 'watched' ? rating : null,
      comments: comments.trim()
    }

    try {
      await onSave(movie ? { ...base, id: movie.id } : base)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось сохранить фильм')
    }
  }

  return (
    <section className="pb-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          disabled={busy}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3.5 text-sm font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] disabled:opacity-50"
          onClick={onCancel}
        >
          <ArrowLeft className="size-4" /> {movie ? 'К фильму' : 'К библиотеке'}
        </button>

        <button
          type="button"
          disabled={busy}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => void submit()}
        >
          {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
          {busy ? 'Сохраняем…' : movie ? 'Сохранить' : 'Добавить фильм'}
        </button>
      </div>

      <h1 className="mb-6 text-3xl font-semibold tracking-tight text-[var(--app-text)]">
        {movie ? 'Редактировать фильм' : 'Добавить фильм'}
      </h1>

      {error && (
        <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
        <div className="space-y-5">
          <div className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-[var(--app-shadow-card)] sm:p-6">
            <SectionTitle icon={<Film />} title="Основная информация" />

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-xs font-medium text-[var(--app-muted)]">Название *</span>
                <input
                  value={title}
                  className={fieldClassName}
                  placeholder="Интерстеллар"
                  autoFocus
                  onChange={(event) => setTitle(event.target.value)}
                />
              </label>

              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-xs font-medium text-[var(--app-muted)]">Оригинальное название</span>
                <input
                  value={originalTitle}
                  className={fieldClassName}
                  placeholder="Interstellar"
                  onChange={(event) => setOriginalTitle(event.target.value)}
                />
              </label>

              <label className="space-y-1.5 sm:col-span-2">
                <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--app-muted)]">
                  <Image className="size-3.5" /> Постер
                </span>
                <input
                  value={posterUrl}
                  type="url"
                  className={fieldClassName}
                  placeholder="https://example.com/poster.jpg"
                  onChange={(event) => {
                    setPosterUrl(event.target.value)
                    setPosterFailed(false)
                  }}
                />
              </label>

              <label className="space-y-1.5">
                <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--app-muted)]">
                  <CalendarDays className="size-3.5" /> Год
                </span>
                <input
                  value={year}
                  type="number"
                  min="1800"
                  max="2200"
                  className={fieldClassName}
                  placeholder="2014"
                  onChange={(event) => setYear(event.target.value)}
                />
              </label>

              <label className="space-y-1.5">
                <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--app-muted)]">
                  <Clock3 className="size-3.5" /> Длительность, мин.
                </span>
                <input
                  value={runtimeMinutes}
                  type="number"
                  min="1"
                  max="1440"
                  className={fieldClassName}
                  placeholder="169"
                  onChange={(event) => setRuntimeMinutes(event.target.value)}
                />
              </label>

              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-xs font-medium text-[var(--app-muted)]">Режиссёр</span>
                <input
                  value={director}
                  className={fieldClassName}
                  placeholder="Christopher Nolan"
                  onChange={(event) => setDirector(event.target.value)}
                />
              </label>

              <label className="space-y-1.5 sm:col-span-2">
                <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--app-muted)]">
                  <Users className="size-3.5" /> Актёры
                </span>
                <input
                  value={actors}
                  className={fieldClassName}
                  placeholder="Matthew McConaughey, Anne Hathaway"
                  onChange={(event) => setActors(event.target.value)}
                />
              </label>

              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-xs font-medium text-[var(--app-muted)]">Жанры</span>
                <input
                  value={genres}
                  className={fieldClassName}
                  placeholder="Фантастика, Драма, Приключения"
                  onChange={(event) => setGenres(event.target.value)}
                />
              </label>
            </div>
          </div>

          <div className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-[var(--app-shadow-card)] sm:p-6">
            <SectionTitle
              icon={status === 'watched' ? <Check /> : <Bookmark />}
              title="Моя библиотека"
            />

            <div className="space-y-5">
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  aria-pressed={status === 'watchlist'}
                  className={
                    status === 'watchlist'
                      ? 'flex h-12 items-center justify-center gap-2 rounded-xl border border-violet-400/30 bg-violet-500/10 px-4 text-sm font-semibold text-violet-200'
                      : 'flex h-12 items-center justify-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-4 text-sm font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'
                  }
                  onClick={() => changeStatus('watchlist')}
                >
                  <Bookmark className="size-4" /> Хочу посмотреть
                </button>
                <button
                  type="button"
                  aria-pressed={status === 'watched'}
                  className={
                    status === 'watched'
                      ? 'flex h-12 items-center justify-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 text-sm font-semibold text-emerald-200'
                      : 'flex h-12 items-center justify-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-4 text-sm font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'
                  }
                  onClick={() => changeStatus('watched')}
                >
                  <Check className="size-4" /> Просмотрено
                </button>
              </div>

              {status === 'watched' && (
                <div>
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-[var(--app-muted)]">
                    <Star className="size-3.5" /> Моя оценка
                  </div>
                  <div className="grid grid-cols-10 gap-1.5 max-[700px]:grid-cols-5">
                    {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
                      <button
                        key={value}
                        type="button"
                        aria-label={`Оценка ${value}`}
                        aria-pressed={rating === value}
                        className={
                          rating === value
                            ? 'h-10 rounded-lg border border-amber-400/35 bg-amber-400/15 text-sm font-semibold text-amber-200'
                            : 'h-10 rounded-lg border border-[var(--app-border)] bg-[var(--app-workspace)] text-sm font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'
                        }
                        onClick={() => setRating((current) => (current === value ? null : value))}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                aria-pressed={favorite}
                className={
                  favorite
                    ? 'flex h-11 w-full items-center gap-2 rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 text-sm font-medium text-rose-200'
                    : 'flex h-11 w-full items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-4 text-sm font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'
                }
                onClick={() => setFavorite((current) => !current)}
              >
                <Heart className={`size-4 ${favorite ? 'fill-current' : ''}`} />
                {favorite ? 'В избранном' : 'Добавить в избранное'}
              </button>
            </div>
          </div>

          <div className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-[var(--app-shadow-card)] sm:p-6">
            <SectionTitle icon={<Star />} title="Описание и комментарии" />

            <div className="space-y-5">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-[var(--app-muted)]">Описание</span>
                <textarea
                  value={description}
                  className={textareaClassName}
                  placeholder="Описание фильма…"
                  onChange={(event) => setDescription(event.target.value)}
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-[var(--app-muted)]">Комментарии</span>
                <textarea
                  value={comments}
                  className={`${textareaClassName} min-h-40`}
                  placeholder="Комментарий…"
                  onChange={(event) => setComments(event.target.value)}
                />
              </label>
            </div>
          </div>
        </div>

        <aside className="xl:sticky xl:top-5">
          <div className="overflow-hidden rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow-card)]">
            <div className="aspect-[2/3] overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)]">
              {canPreviewPoster ? (
                <img
                  src={normalizedPosterUrl}
                  alt="Предпросмотр постера"
                  className="h-full w-full object-cover"
                  onError={() => setPosterFailed(true)}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-[var(--app-muted)]">
                  <Image className="size-8 opacity-50" />
                </div>
              )}
            </div>

            <div className="mt-4 min-w-0">
              <p className="truncate text-base font-semibold text-[var(--app-text)]">
                {title.trim() || 'Без названия'}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-[var(--app-muted)]">
                {year.trim() && <span>{year}</span>}
                {director.trim() && year.trim() && <span>·</span>}
                {director.trim() && <span className="truncate">{director}</span>}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span
                  className={
                    status === 'watched'
                      ? 'inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-300'
                      : 'inline-flex items-center gap-1.5 rounded-lg bg-violet-500/10 px-2.5 py-1.5 text-xs font-medium text-violet-300'
                  }
                >
                  {status === 'watched' ? <Check className="size-3.5" /> : <Bookmark className="size-3.5" />}
                  {status === 'watched' ? 'Просмотрено' : 'Хочу посмотреть'}
                </span>
                {favorite && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500/10 px-2.5 py-1.5 text-xs font-medium text-rose-300">
                    <Heart className="size-3.5 fill-current" /> Избранное
                  </span>
                )}
                {status === 'watched' && rating !== null && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-xs font-medium text-amber-200">
                    <Star className="size-3.5 fill-current" /> {rating}
                  </span>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  )
}
''')

(root / 'src/renderer/src/modules/movies/components/MovieDetail.tsx').write_text(r'''import {
  ArrowLeft,
  CalendarDays,
  Check,
  Clock3,
  Expand,
  Heart,
  Image,
  Pencil,
  Star,
  Trash2,
  Users,
  X
} from 'lucide-react'
import { useState } from 'react'

import type { MovieRecord } from '../../../../../shared/contracts/movies'
import { AppDialog } from '../../../shared/ui/AppDialog'

interface MovieDetailProps {
  movie: MovieRecord
  busy: boolean
  onBack: () => void
  onEdit: () => void
  onDelete: () => void
  onUpdate: (movie: MovieRecord) => Promise<void>
}

function formatRuntime(minutes: number | null): string | null {
  if (minutes === null) return null
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest} мин.`
  return `${hours} ч ${rest > 0 ? `${rest} мин.` : ''}`.trim()
}

export function MovieDetail({
  movie,
  busy,
  onBack,
  onEdit,
  onDelete,
  onUpdate
}: MovieDetailProps): React.JSX.Element {
  const [posterOpen, setPosterOpen] = useState(false)
  const [posterFailed, setPosterFailed] = useState(false)
  const runtime = formatRuntime(movie.runtimeMinutes)

  async function toggleFavorite(): Promise<void> {
    await onUpdate({ ...movie, favorite: !movie.favorite })
  }

  async function toggleWatched(): Promise<void> {
    const nextWatched = movie.status !== 'watched'
    await onUpdate({
      ...movie,
      status: nextWatched ? 'watched' : 'watchlist',
      rating: nextWatched ? movie.rating : null
    })
  }

  return (
    <>
      <section className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-sm font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
            onClick={onBack}
          >
            <ArrowLeft className="size-4" /> К библиотеке
          </button>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-sm font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] disabled:opacity-50"
              onClick={onEdit}
            >
              <Pencil className="size-4" /> Изменить
            </button>
            <button
              type="button"
              disabled={busy}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-3 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/10 disabled:opacity-50"
              onClick={onDelete}
            >
              <Trash2 className="size-4" /> Удалить
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-[28px] border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[var(--app-shadow-card)]">
          <div className="grid gap-0 lg:grid-cols-[300px_minmax(0,1fr)]">
            <div className="relative min-h-[440px] bg-[var(--app-workspace)]">
              {movie.posterUrl && !posterFailed ? (
                <button
                  type="button"
                  aria-label="Открыть постер на весь экран"
                  className="group absolute inset-0 cursor-zoom-in overflow-hidden text-left outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60 focus-visible:ring-inset"
                  onClick={() => setPosterOpen(true)}
                >
                  <img
                    src={movie.posterUrl}
                    alt={`Постер фильма «${movie.title}»`}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transition-none"
                    onError={() => setPosterFailed(true)}
                  />
                  <span className="absolute right-4 bottom-4 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-black/55 px-3 py-2 text-xs font-medium text-white opacity-0 backdrop-blur-md transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    <Expand className="size-4" /> На весь экран
                  </span>
                </button>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-[var(--app-muted)]">
                  <Image className="size-12 opacity-50" />
                </div>
              )}
            </div>

            <div className="flex min-w-0 flex-col p-7 lg:p-9">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-3xl font-semibold tracking-tight text-[var(--app-text)] lg:text-4xl">
                    {movie.title}
                  </h2>
                  {movie.originalTitle && (
                    <p className="mt-2 text-base text-[var(--app-muted)]">{movie.originalTitle}</p>
                  )}
                </div>
                {movie.status === 'watched' && movie.rating !== null && (
                  <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-amber-200">
                    <Star className="size-5 fill-current" />
                    <span className="text-xl font-semibold tabular-nums">{movie.rating}</span>
                    <span className="text-xs opacity-70">/ 10</span>
                  </div>
                )}
              </div>

              <div className="mt-5 flex flex-wrap gap-2 text-sm text-[var(--app-muted)]">
                {movie.year !== null && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--app-control)] px-2.5 py-1.5">
                    <CalendarDays className="size-3.5" /> {movie.year}
                  </span>
                )}
                {runtime && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--app-control)] px-2.5 py-1.5">
                    <Clock3 className="size-3.5" /> {runtime}
                  </span>
                )}
                {movie.genres.map((genre) => (
                  <span key={genre} className="rounded-lg bg-[var(--app-control)] px-2.5 py-1.5">
                    {genre}
                  </span>
                ))}
              </div>

              {movie.director && (
                <p className="mt-5 text-sm text-[var(--app-muted)]">
                  Режиссёр: <span className="text-[var(--app-text)]">{movie.director}</span>
                </p>
              )}

              {movie.actors.length > 0 && (
                <div className="mt-3 flex items-start gap-2 text-sm text-[var(--app-muted)]">
                  <Users className="mt-0.5 size-4 shrink-0" />
                  <span>{movie.actors.join(', ')}</span>
                </div>
              )}

              <div className="mt-6 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  className={
                    movie.status === 'watched'
                      ? 'inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 text-sm font-semibold text-emerald-300 transition-colors hover:bg-emerald-400/15 disabled:opacity-50'
                      : 'inline-flex h-10 items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-400/10 px-4 text-sm font-semibold text-violet-300 transition-colors hover:bg-violet-400/15 disabled:opacity-50'
                  }
                  onClick={() => void toggleWatched()}
                >
                  <Check className="size-4" />
                  {movie.status === 'watched' ? 'Просмотрено' : 'Хочу посмотреть'}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  aria-pressed={movie.favorite}
                  className={
                    movie.favorite
                      ? 'inline-flex h-10 items-center gap-2 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 text-sm font-semibold text-rose-300 transition-colors hover:bg-rose-400/15 disabled:opacity-50'
                      : 'inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-control)] px-4 text-sm font-medium text-[var(--app-muted)] transition-colors hover:text-[var(--app-text)] disabled:opacity-50'
                  }
                  onClick={() => void toggleFavorite()}
                >
                  <Heart className={`size-4 ${movie.favorite ? 'fill-current' : ''}`} />
                  {movie.favorite ? 'В избранном' : 'В избранное'}
                </button>
              </div>

              {movie.description && (
                <div className="mt-8">
                  <h3 className="text-sm font-semibold text-[var(--app-text)]">Описание</h3>
                  <p className="mt-3 max-w-3xl text-sm leading-7 whitespace-pre-wrap text-[var(--app-muted)]">
                    {movie.description}
                  </p>
                </div>
              )}

              {movie.comments && (
                <div className="mt-8 border-t border-[var(--app-border)] pt-6">
                  <h3 className="text-sm font-semibold text-[var(--app-text)]">Комментарии</h3>
                  <p className="mt-3 max-w-3xl text-sm leading-7 whitespace-pre-wrap text-[var(--app-muted)]">
                    {movie.comments}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <AppDialog
        open={posterOpen}
        onOpenChange={setPosterOpen}
        title={`Постер фильма ${movie.title}`}
        description="Полноэкранный просмотр постера"
        size="fullscreen"
        showHeader={false}
        overlayClassName="bg-black/90 backdrop-blur-md"
        contentClassName="bg-black"
        bodyClassName="relative flex items-center justify-center bg-black p-4 sm:p-8"
      >
        <button
          type="button"
          aria-label="Закрыть полноэкранный постер"
          className="absolute top-5 right-5 z-10 flex size-11 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white backdrop-blur-md transition-colors hover:bg-white/10"
          onClick={() => setPosterOpen(false)}
        >
          <X className="size-5" />
        </button>
        {movie.posterUrl && (
          <img
            src={movie.posterUrl}
            alt={`Постер фильма «${movie.title}»`}
            className="max-h-full max-w-full object-contain shadow-2xl"
          />
        )}
      </AppDialog>
    </>
  )
}
''')

movies_page_path = root / 'src/renderer/src/modules/movies/MoviesPage.tsx'
movies_page = movies_page_path.read_text()
movies_page = movies_page.replace(
'''    genres: movie.genres,\n    description: movie.description,\n    status: movie.status,\n    favorite: movie.favorite,\n    rating: movie.rating,\n    watchedAt: movie.watchedAt,\n    notes: movie.notes''',
'''    genres: movie.genres,\n    actors: movie.actors,\n    description: movie.description,\n    status: movie.status,\n    favorite: movie.favorite,\n    rating: movie.rating,\n    comments: movie.comments'''
)
movies_page = movies_page.replace(
"[movie.title, movie.originalTitle ?? '', movie.director, ...movie.genres]",
"[movie.title, movie.originalTitle ?? '', movie.director, ...movie.actors, ...movie.genres]"
)
movies_page = movies_page.replace(
"{movie.rating !== null && (",
"{movie.status === 'watched' && movie.rating !== null && ("
)
if 'watchedAt' in movies_page or 'movie.notes' in movies_page:
    raise SystemExit('MoviesPage still contains legacy movie fields')
movies_page_path.write_text(movies_page)

(root / 'src/renderer/src/modules/movies/MoviesPage.test.tsx').write_text(r'''import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { MovieRecord } from '../../../../shared/contracts/movies'

const mocks = vi.hoisted(() => ({
  listOverview: vi.fn(),
  getMovie: vi.fn(),
  createMovie: vi.fn(),
  updateMovie: vi.fn(),
  deleteMovie: vi.fn()
}))

vi.mock('./api/movies-client', () => ({ moviesClient: mocks }))

import { MoviesPage } from './MoviesPage'

const movie: MovieRecord = {
  id: 'movie-1',
  title: 'Интерстеллар',
  originalTitle: 'Interstellar',
  year: 2014,
  posterUrl: 'https://example.com/interstellar.jpg',
  director: 'Christopher Nolan',
  runtimeMinutes: 169,
  genres: ['Фантастика', 'Драма'],
  actors: ['Matthew McConaughey', 'Anne Hathaway'],
  description: 'История о путешествии к звёздам.',
  status: 'watched',
  favorite: true,
  rating: 9,
  comments: 'Сильный фильм.',
  createdAt: 1,
  updatedAt: 2
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.listOverview.mockResolvedValue({ movies: [] })
  mocks.getMovie.mockResolvedValue(null)
  mocks.createMovie.mockResolvedValue(movie)
  mocks.updateMovie.mockImplementation(async (input) => ({ ...movie, ...input, updatedAt: 3 }))
  mocks.deleteMovie.mockResolvedValue(true)
})

describe('MoviesPage', () => {
  it('uses a clean dedicated form with actors, comments and URL-only poster', async () => {
    const user = userEvent.setup()
    const { container } = render(<MoviesPage />)

    await screen.findByText('Библиотека пока пустая')
    await user.click(screen.getAllByRole('button', { name: 'Добавить фильм' })[0])

    expect(screen.getByRole('heading', { name: 'Добавить фильм' })).toBeInTheDocument()
    expect(screen.getByText('Актёры')).toBeInTheDocument()
    expect(screen.getByText('Комментарии')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('https://example.com/poster.jpg')).toHaveAttribute('type', 'url')
    expect(screen.queryByText('Дата просмотра')).not.toBeInTheDocument()
    expect(screen.queryByText('Моя оценка')).not.toBeInTheDocument()
    expect(container.querySelector('input[type="file"]')).toBeNull()
    expect(container.querySelector('[data-app-dialog-content]')).toBeNull()
  })

  it('shows numeric rating only for watched movies and clears it when status changes', async () => {
    const user = userEvent.setup()
    render(<MoviesPage />)

    await screen.findByText('Библиотека пока пустая')
    await user.click(screen.getAllByRole('button', { name: 'Добавить фильм' })[0])
    await user.click(screen.getByRole('button', { name: 'Просмотрено' }))

    expect(screen.getByText('Моя оценка')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Оценка 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Оценка 10' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Оценка 8' }))
    expect(screen.getByRole('button', { name: 'Оценка 8' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Хочу посмотреть' }))
    expect(screen.queryByText('Моя оценка')).not.toBeInTheDocument()
  })

  it('opens editing as a dedicated page and returns to the movie view', async () => {
    const user = userEvent.setup()
    mocks.listOverview.mockResolvedValue({ movies: [movie] })

    render(<MoviesPage />)

    await user.click(await screen.findByRole('button', { name: 'Открыть фильм «Интерстеллар»' }))
    await user.click(screen.getByRole('button', { name: 'Изменить' }))

    expect(screen.getByRole('heading', { name: 'Редактировать фильм' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'К фильму' })).toBeInTheDocument()
    expect(screen.getByDisplayValue('Matthew McConaughey, Anne Hathaway')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'К фильму' }))
    expect(screen.getByRole('button', { name: 'Изменить' })).toBeInTheDocument()
  })

  it('shows actors and comments in movie view and opens fullscreen poster', async () => {
    const user = userEvent.setup()
    mocks.listOverview.mockResolvedValue({ movies: [movie] })

    render(<MoviesPage />)

    await user.click(await screen.findByRole('button', { name: 'Открыть фильм «Интерстеллар»' }))
    expect(screen.getByText('Matthew McConaughey, Anne Hathaway')).toBeInTheDocument()
    expect(screen.getByText('Комментарии')).toBeInTheDocument()
    expect(screen.queryByText(/Просмотрено:/)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Открыть постер на весь экран' }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Закрыть полноэкранный постер' })).toBeInTheDocument()
    )
  })
})
''')

migration = '''CREATE TABLE `__new_movies` (\n  `id` text PRIMARY KEY NOT NULL,\n  `title` text NOT NULL,\n  `original_title` text,\n  `year` integer,\n  `poster_url` text,\n  `director` text DEFAULT '' NOT NULL,\n  `runtime_minutes` integer,\n  `genres_json` text DEFAULT '[]' NOT NULL,\n  `actors_json` text DEFAULT '[]' NOT NULL,\n  `description` text DEFAULT '' NOT NULL,\n  `status` text DEFAULT 'watchlist' NOT NULL,\n  `favorite` integer DEFAULT false NOT NULL,\n  `rating` integer,\n  `comments` text DEFAULT '' NOT NULL,\n  `created_at` integer NOT NULL,\n  `updated_at` integer NOT NULL\n);\n--> statement-breakpoint\nINSERT INTO `__new_movies` (\n  `id`, `title`, `original_title`, `year`, `poster_url`, `director`, `runtime_minutes`,\n  `genres_json`, `actors_json`, `description`, `status`, `favorite`, `rating`, `comments`,\n  `created_at`, `updated_at`\n)\nSELECT\n  `id`, `title`, `original_title`, `year`, `poster_url`, `director`, `runtime_minutes`,\n  `genres_json`, '[]', `description`, `status`, `favorite`,\n  CASE WHEN `status` = 'watched' THEN CAST(ROUND(`rating`) AS INTEGER) ELSE NULL END,\n  `notes`, `created_at`, `updated_at`\nFROM `movies`;\n--> statement-breakpoint\nDROP TABLE `movies`;\n--> statement-breakpoint\nALTER TABLE `__new_movies` RENAME TO `movies`;\n--> statement-breakpoint\nCREATE INDEX `movies_status_updated_idx` ON `movies` (`status`,`updated_at`);\n--> statement-breakpoint\nCREATE INDEX `movies_favorite_updated_idx` ON `movies` (`favorite`,`updated_at`);\n--> statement-breakpoint\nCREATE INDEX `movies_title_idx` ON `movies` (`title`);\n'''
(root / 'drizzle/0022_movies_metadata_cleanup.sql').write_text(migration)

journal_path = root / 'drizzle/meta/_journal.json'
journal = json.loads(journal_path.read_text())
if not any(entry.get('tag') == '0022_movies_metadata_cleanup' for entry in journal['entries']):
    journal['entries'].append({
        'idx': 22,
        'version': '6',
        'when': 1786839000000,
        'tag': '0022_movies_metadata_cleanup',
        'breakpoints': True,
    })
journal_path.write_text(json.dumps(journal, ensure_ascii=False, indent=2) + '\n')

# Guard against stale product fields outside historical migrations.
for path in [
    root / 'src/shared/contracts/movies.ts',
    root / 'src/shared/validation/movies.ts',
    root / 'src/main/database/schema/movies.ts',
    root / 'src/main/repositories/movies.repository.ts',
    root / 'src/renderer/src/modules/movies/MoviesPage.tsx',
    root / 'src/renderer/src/modules/movies/components/MovieFormPage.tsx',
    root / 'src/renderer/src/modules/movies/components/MovieDetail.tsx',
]:
    text = path.read_text()
    if 'watchedAt' in text or 'watched_at' in text or 'movie.notes' in text:
        raise SystemExit(f'Legacy movie field remains in {path}')
