import {
  ArrowLeft,
  Bookmark,
  Braces,
  Check,
  Film,
  Heart,
  Image,
  LoaderCircle,
  Pencil,
  Plus,
  Save,
  Search,
  Star,
  Trash2
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import type {
  CreateMovieInput,
  MovieRecord,
  UpdateMovieInput
} from '../../../../shared/contracts/movies'
import { DeleteConfirmationDialog } from '../../shared/ui/DeleteConfirmationDialog'
import { moviesClient } from './api/movies-client'
import { MovieDetail } from './components/MovieDetail'
import { MovieFormPage } from './components/MovieFormPage'
import { MovieJsonImportDialog } from './components/MovieJsonImportDialog'
import { movieTypeLabel } from './movie-types'

type MovieFilter = 'all' | 'watchlist' | 'watched' | 'favorites'
type MovieView =
  | { kind: 'library' }
  | { kind: 'detail'; movieId: string }
  | { kind: 'form'; movieId: string | null }

interface MoviesPageProps {
  resourceId?: string | null
  onResourceHandled?: () => void
}

const MOVIE_FORM_ID = 'movie-form'

const filterItems: Array<{ id: MovieFilter; label: string }> = [
  { id: 'all', label: 'Все' },
  { id: 'watchlist', label: 'Хочу посмотреть' },
  { id: 'watched', label: 'Просмотрено' },
  { id: 'favorites', label: 'Избранное' }
]

function errorMessage(reason: unknown): string {
  if (reason instanceof Error) return reason.message
  return 'Не удалось выполнить действие'
}

function toUpdateInput(movie: MovieRecord): UpdateMovieInput {
  return {
    id: movie.id,
    title: movie.title,
    originalTitle: movie.originalTitle,
    type: movie.type,
    year: movie.year,
    posterUrl: movie.posterUrl,
    director: movie.director,
    runtimeMinutes: movie.runtimeMinutes,
    genres: movie.genres,
    actors: movie.actors,
    description: movie.description,
    status: movie.status,
    favorite: movie.favorite,
    rating: movie.rating,
    comments: movie.comments
  }
}

function MoviePoster({ movie }: { movie: MovieRecord }): React.JSX.Element {
  const [failed, setFailed] = useState(false)

  if (!movie.posterUrl || failed) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-[var(--app-control)] text-[var(--app-muted)]">
        <Image className="size-10 opacity-50" />
        <span className="px-4 text-center text-xs">Постер не указан</span>
      </div>
    )
  }

  return (
    <img
      src={movie.posterUrl}
      alt={`Постер фильма «${movie.title}»`}
      loading="lazy"
      className="h-full w-full object-cover"
      onError={() => setFailed(true)}
    />
  )
}

export function MoviesPage({ resourceId, onResourceHandled }: MoviesPageProps): React.JSX.Element {
  const [movies, setMovies] = useState<MovieRecord[]>([])
  const [view, setView] = useState<MovieView>({ kind: 'library' })
  const [filter, setFilter] = useState<MovieFilter>('all')
  const [query, setQuery] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<MovieRecord | null>(null)
  const [jsonImportOpen, setJsonImportOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const activeMovieId = view.kind === 'library' ? null : view.movieId
  const activeMovie = useMemo(
    () => movies.find((movie) => movie.id === activeMovieId) ?? null,
    [activeMovieId, movies]
  )

  const stats = useMemo(
    () => ({
      total: movies.length,
      watched: movies.filter((movie) => movie.status === 'watched').length,
      watchlist: movies.filter((movie) => movie.status === 'watchlist').length,
      favorites: movies.filter((movie) => movie.favorite).length
    }),
    [movies]
  )

  const visibleMovies = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ru-RU')
    return movies.filter((movie) => {
      if (filter === 'watchlist' && movie.status !== 'watchlist') return false
      if (filter === 'watched' && movie.status !== 'watched') return false
      if (filter === 'favorites' && !movie.favorite) return false
      if (!normalizedQuery) return true

      return [
        movie.title,
        movie.originalTitle ?? '',
        movieTypeLabel(movie.type),
        movie.director,
        ...movie.actors,
        ...movie.genres
      ]
        .join(' ')
        .toLocaleLowerCase('ru-RU')
        .includes(normalizedQuery)
    })
  }, [filter, movies, query])

  const loadOverview = useCallback(async (): Promise<MovieRecord[]> => {
    setError(null)
    try {
      const overview = await moviesClient.listOverview()
      setMovies(overview.movies)
      setView((current) => {
        if (current.kind === 'library' || current.movieId === null) return current
        return overview.movies.some((movie) => movie.id === current.movieId)
          ? current
          : { kind: 'library' }
      })
      return overview.movies
    } catch (reason) {
      setError(errorMessage(reason))
      return []
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) void loadOverview()
    })
    return () => {
      cancelled = true
    }
  }, [loadOverview])

  useEffect(() => {
    if (!resourceId) return
    let cancelled = false
    queueMicrotask(async () => {
      if (cancelled) return
      try {
        const movie = await moviesClient.getMovie({ id: resourceId })
        if (!cancelled && movie) {
          setMovies((current) =>
            current.some((item) => item.id === movie.id)
              ? current.map((item) => (item.id === movie.id ? movie : item))
              : [movie, ...current]
          )
          setView({ kind: 'detail', movieId: movie.id })
        }
      } finally {
        if (!cancelled) onResourceHandled?.()
      }
    })
    return () => {
      cancelled = true
    }
  }, [onResourceHandled, resourceId])

  async function saveMovie(input: CreateMovieInput | UpdateMovieInput): Promise<void> {
    setIsSaving(true)
    setError(null)
    try {
      const saved =
        'id' in input
          ? await moviesClient.updateMovie(input)
          : await moviesClient.createMovie(input)
      setMovies((current) => {
        const withoutSaved = current.filter((movie) => movie.id !== saved.id)
        return [saved, ...withoutSaved]
      })
      setView({ kind: 'detail', movieId: saved.id })
    } catch (reason) {
      setError(errorMessage(reason))
      throw reason
    } finally {
      setIsSaving(false)
    }
  }

  async function importMovies(inputs: CreateMovieInput[]): Promise<void> {
    setIsSaving(true)
    setError(null)
    try {
      const created = await moviesClient.createMovies({ movies: inputs })
      setMovies((current) => [...created, ...current])
    } catch (reason) {
      setError(errorMessage(reason))
      throw reason
    } finally {
      setIsSaving(false)
    }
  }

  async function updateMovie(movie: MovieRecord): Promise<void> {
    setIsSaving(true)
    setError(null)
    try {
      const saved = await moviesClient.updateMovie(toUpdateInput(movie))
      setMovies((current) => current.map((item) => (item.id === saved.id ? saved : item)))
    } catch (reason) {
      setError(errorMessage(reason))
    } finally {
      setIsSaving(false)
    }
  }

  async function searchWeb(query: string): Promise<void> {
    setError(null)
    try {
      await moviesClient.searchWeb({ query })
    } catch (reason) {
      setError(errorMessage(reason))
    }
  }

  async function removeMovie(): Promise<void> {
    if (!deleteTarget) return
    setIsDeleting(true)
    setError(null)
    try {
      await moviesClient.deleteMovie({ id: deleteTarget.id })
      setMovies((current) => current.filter((movie) => movie.id !== deleteTarget.id))
      if (activeMovieId === deleteTarget.id) setView({ kind: 'library' })
      setDeleteTarget(null)
    } catch (reason) {
      setError(errorMessage(reason))
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <main className="h-full overflow-y-auto bg-[var(--app-workspace)] px-8 py-7 max-[700px]:px-4 max-[700px]:py-5">
        <div className="mx-auto flex min-h-72 w-full max-w-[1320px] items-center justify-center text-sm text-[var(--app-muted)]">
          <LoaderCircle className="mr-2 size-4 animate-spin" /> Загружаем библиотеку фильмов…
        </div>
      </main>
    )
  }

  const headerTitle =
    view.kind === 'form'
      ? view.movieId
        ? 'Редактировать фильм'
        : 'Добавить фильм'
      : 'Фильмы'

  return (
    <main className="h-full overflow-y-auto bg-[var(--app-workspace)] px-8 py-7 max-[700px]:px-4 max-[700px]:py-5">
      <div className="mx-auto w-full max-w-[1320px]">
        <header className="mb-5 overflow-hidden rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-[var(--app-shadow-card)]">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="flex min-w-0 items-center gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10 text-violet-300 shadow-inner shadow-violet-500/5">
                <Film aria-hidden="true" className="size-6" />
              </span>
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--app-text)]">
                {headerTitle}
              </h1>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              {view.kind === 'library' && (
                <>
                  <button
                    type="button"
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3.5 text-sm font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
                    onClick={() => setJsonImportOpen(true)}
                  >
                    <Braces className="size-4" /> Из JSON
                  </button>
                  <button
                    type="button"
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-violet-400"
                    onClick={() => setView({ kind: 'form', movieId: null })}
                  >
                    <Plus className="size-4" /> Добавить фильм
                  </button>
                </>
              )}

              {view.kind === 'form' && (
                <>
                  <button
                    type="button"
                    disabled={isSaving}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3.5 text-sm font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] disabled:opacity-50"
                    onClick={() =>
                      setView(
                        view.movieId && activeMovie
                          ? { kind: 'detail', movieId: view.movieId }
                          : { kind: 'library' }
                      )
                    }
                  >
                    <ArrowLeft className="size-4" /> {view.movieId ? 'К фильму' : 'К библиотеке'}
                  </button>
                  <button
                    type="submit"
                    form={MOVIE_FORM_ID}
                    disabled={isSaving}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSaving ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Save className="size-4" />
                    )}
                    {isSaving ? 'Сохраняем…' : view.movieId ? 'Сохранить' : 'Добавить фильм'}
                  </button>
                </>
              )}

              {view.kind === 'detail' && activeMovie && (
                <>
                  <button
                    type="button"
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3.5 text-sm font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
                    onClick={() => setView({ kind: 'library' })}
                  >
                    <ArrowLeft className="size-4" /> К библиотеке
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3.5 text-sm font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] disabled:opacity-50"
                    onClick={() => setView({ kind: 'form', movieId: activeMovie.id })}
                  >
                    <Pencil className="size-4" /> Изменить
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-3.5 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/10 disabled:opacity-50"
                    onClick={() => setDeleteTarget(activeMovie)}
                  >
                    <Trash2 className="size-4" /> Удалить
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 border-t border-[var(--app-border)] pt-4 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
            {[
              ['Всего', stats.total],
              ['Просмотрено', stats.watched],
              ['Хочу посмотреть', stats.watchlist],
              ['Избранное', stats.favorites]
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 py-2 sm:min-w-28"
              >
                <strong className="block text-sm font-semibold text-[var(--app-text)]">
                  {value}
                </strong>
                <span className="mt-0.5 block text-[11px] text-[var(--app-muted)]">{label}</span>
              </div>
            ))}
          </div>
        </header>

        {error && (
          <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {view.kind === 'form' ? (
          <MovieFormPage
            key={view.movieId ?? 'new-movie'}
            movie={activeMovie}
            formId={MOVIE_FORM_ID}
            onSave={saveMovie}
          />
        ) : view.kind === 'detail' && activeMovie ? (
          <MovieDetail
            movie={activeMovie}
            busy={isSaving}
            onUpdate={updateMovie}
            onSearchWeb={searchWeb}
          />
        ) : (
          <section>
            <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3 shadow-[var(--app-shadow-card)] lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-1.5">
                {filterItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={filter === item.id}
                    className={
                      filter === item.id
                        ? 'h-9 rounded-xl bg-violet-500 px-3.5 text-sm font-medium text-white'
                        : 'h-9 rounded-xl px-3.5 text-sm font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'
                    }
                    onClick={() => setFilter(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <label className="relative block w-full lg:w-80">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--app-muted)]" />
                <input
                  value={query}
                  type="search"
                  placeholder="Название, тип, режиссёр, жанр…"
                  className="h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] pr-3 pl-9 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)] focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/15"
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
            </div>

            {visibleMovies.length === 0 ? (
              <div className="flex min-h-80 flex-col items-center justify-center rounded-[24px] border border-dashed border-[var(--app-border)] bg-[var(--app-surface)] px-6 text-center">
                <span className="flex size-14 items-center justify-center rounded-2xl border border-violet-500/15 bg-violet-500/10 text-violet-300">
                  <Film className="size-7" />
                </span>
                <h2 className="mt-4 text-lg font-semibold text-[var(--app-text)]">
                  {movies.length === 0 ? 'Библиотека пока пустая' : 'Ничего не найдено'}
                </h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-[var(--app-muted)]">
                  {movies.length === 0
                    ? 'Добавь первый фильм — просмотренный или тот, который хочется посмотреть.'
                    : 'Попробуй изменить поиск или выбрать другой фильтр.'}
                </p>
                {movies.length === 0 && (
                  <button
                    type="button"
                    className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white hover:bg-violet-400"
                    onClick={() => setView({ kind: 'form', movieId: null })}
                  >
                    <Plus className="size-4" /> Добавить фильм
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-x-4 gap-y-7 sm:grid-cols-[repeat(auto-fill,minmax(185px,1fr))]">
                {visibleMovies.map((movie) => {
                  return (
                    <article key={movie.id} className="group min-w-0">
                      <div className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[var(--app-shadow-card)] transition-[transform,border-color,box-shadow] duration-200 group-hover:-translate-y-1 group-hover:border-violet-500/25 group-hover:shadow-xl motion-reduce:transition-none">
                        <div className="relative aspect-[2/3] overflow-hidden bg-[var(--app-surface)]">
                          <button
                            type="button"
                            aria-label={`Открыть фильм «${movie.title}»`}
                            className="absolute inset-0 z-0 overflow-hidden text-left outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60 focus-visible:ring-inset"
                            onClick={() => setView({ kind: 'detail', movieId: movie.id })}
                          >
                            <MoviePoster movie={movie} />
                            <span className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                          </button>

                          <button
                            type="button"
                            aria-label={
                              movie.favorite ? 'Убрать из избранного' : 'Добавить в избранное'
                            }
                            aria-pressed={movie.favorite}
                            disabled={isSaving}
                            className={
                              movie.favorite
                                ? 'absolute top-2.5 right-2.5 z-10 flex size-9 items-center justify-center rounded-xl border border-rose-300/25 bg-black/50 text-rose-300 backdrop-blur-md transition-colors hover:bg-black/65 disabled:opacity-50'
                                : 'absolute top-2.5 right-2.5 z-10 flex size-9 items-center justify-center rounded-xl border border-white/10 bg-black/45 text-white/70 backdrop-blur-md transition-colors hover:text-white disabled:opacity-50'
                            }
                            onClick={() =>
                              void updateMovie({ ...movie, favorite: !movie.favorite })
                            }
                          >
                            <Heart className={`size-4 ${movie.favorite ? 'fill-current' : ''}`} />
                          </button>

                          <div className="pointer-events-none absolute right-2.5 bottom-2.5 left-2.5 z-10 flex items-end justify-between gap-2">
                            <span
                              className={
                                movie.status === 'watched'
                                  ? 'inline-flex items-center gap-1 rounded-lg border border-emerald-300/20 bg-black/50 px-2 py-1 text-[11px] font-medium text-emerald-200 backdrop-blur-md'
                                  : 'inline-flex items-center gap-1 rounded-lg border border-violet-300/20 bg-black/50 px-2 py-1 text-[11px] font-medium text-violet-200 backdrop-blur-md'
                              }
                            >
                              {movie.status === 'watched' ? (
                                <Check className="size-3" />
                              ) : (
                                <Bookmark className="size-3" />
                              )}
                              {movie.status === 'watched' ? 'Просмотрено' : 'Хочу посмотреть'}
                            </span>
                            {movie.status === 'watched' && movie.rating !== null && (
                              <span className="inline-flex items-center gap-1 rounded-lg bg-black/55 px-2 py-1 text-[11px] font-semibold text-amber-200 backdrop-blur-md">
                                <Star className="size-3 fill-current" /> {movie.rating.toFixed(1)}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="flex min-h-16 w-full min-w-0 flex-col items-start justify-center border-t border-[var(--app-border)] bg-[var(--app-surface)] px-3.5 py-3 text-left transition-colors outline-none hover:bg-[var(--app-control-hover)] focus-visible:bg-[var(--app-control-hover)]"
                          onClick={() => setView({ kind: 'detail', movieId: movie.id })}
                        >
                          <span className="block w-full truncate text-sm font-semibold text-[var(--app-text)] transition-colors group-hover:text-violet-200">
                            {movie.title}
                          </span>
                          <span className="mt-0.5 block text-[11px] text-[var(--app-muted)]">
                            {movieTypeLabel(movie.type)}
                          </span>
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        )}
      </div>

      <MovieJsonImportDialog
        open={jsonImportOpen}
        busy={isSaving}
        onOpenChange={setJsonImportOpen}
        onImport={importMovies}
      />

      <DeleteConfirmationDialog
        open={deleteTarget !== null}
        title="Удалить фильм?"
        subject={deleteTarget?.title}
        description="Фильм, оценка и личные заметки будут удалены из библиотеки."
        isSubmitting={isDeleting}
        error={error}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        onConfirm={removeMovie}
      />
    </main>
  )
}
