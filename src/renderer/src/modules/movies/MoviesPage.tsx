import {
  Bookmark,
  Check,
  Film,
  Heart,
  Image,
  LoaderCircle,
  Plus,
  Search,
  Star
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
import { MovieDialog } from './components/MovieDialog'

type MovieFilter = 'all' | 'watchlist' | 'watched' | 'favorites'

interface MoviesPageProps {
  resourceId?: string | null
  onResourceHandled?: () => void
}

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
    year: movie.year,
    posterUrl: movie.posterUrl,
    director: movie.director,
    runtimeMinutes: movie.runtimeMinutes,
    genres: movie.genres,
    description: movie.description,
    status: movie.status,
    favorite: movie.favorite,
    rating: movie.rating,
    watchedAt: movie.watchedAt,
    notes: movie.notes
  }
}

function formatRuntime(minutes: number | null): string | null {
  if (minutes === null) return null
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest} мин.`
  return rest > 0 ? `${hours} ч ${rest} мин.` : `${hours} ч`
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
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null)
  const [filter, setFilter] = useState<MovieFilter>('all')
  const [query, setQuery] = useState('')
  const [dialog, setDialog] = useState<{ movie: MovieRecord | null } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MovieRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedMovie = useMemo(
    () => movies.find((movie) => movie.id === selectedMovieId) ?? null,
    [movies, selectedMovieId]
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

      return [movie.title, movie.originalTitle ?? '', movie.director, ...movie.genres]
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
      setSelectedMovieId((current) =>
        current && overview.movies.some((movie) => movie.id === current) ? current : null
      )
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
          setSelectedMovieId(movie.id)
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
      const saved = 'id' in input
        ? await moviesClient.updateMovie(input)
        : await moviesClient.createMovie(input)
      setMovies((current) => {
        const withoutSaved = current.filter((movie) => movie.id !== saved.id)
        return [saved, ...withoutSaved]
      })
      setSelectedMovieId(saved.id)
      setDialog(null)
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

  async function removeMovie(): Promise<void> {
    if (!deleteTarget) return
    setIsDeleting(true)
    setError(null)
    try {
      await moviesClient.deleteMovie({ id: deleteTarget.id })
      setMovies((current) => current.filter((movie) => movie.id !== deleteTarget.id))
      if (selectedMovieId === deleteTarget.id) setSelectedMovieId(null)
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

  return (
    <main className="h-full overflow-y-auto bg-[var(--app-workspace)] px-8 py-7 max-[700px]:px-4 max-[700px]:py-5">
      <div className="mx-auto w-full max-w-[1320px]">
        <header className="mb-5 overflow-hidden rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-[var(--app-shadow-card)]">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="flex min-w-0 items-center gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10 text-violet-300 shadow-inner shadow-violet-500/5">
                <Film aria-hidden="true" className="size-6" />
              </span>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-[var(--app-text)]">Фильмы</h1>
                <p className="mt-1 text-xs text-[var(--app-muted)]">Личная библиотека просмотренного и будущих просмотров</p>
              </div>
            </div>

            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-violet-400"
              onClick={() => setDialog({ movie: null })}
            >
              <Plus className="size-4" /> Добавить фильм
            </button>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-[var(--app-border)] pt-4 text-xs text-[var(--app-muted)]">
            <span><strong className="mr-1 text-sm text-[var(--app-text)]">{stats.total}</strong> всего</span>
            <span><strong className="mr-1 text-sm text-[var(--app-text)]">{stats.watched}</strong> просмотрено</span>
            <span><strong className="mr-1 text-sm text-[var(--app-text)]">{stats.watchlist}</strong> хочу посмотреть</span>
            <span><strong className="mr-1 text-sm text-[var(--app-text)]">{stats.favorites}</strong> избранных</span>
          </div>
        </header>

        {error && (
          <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {selectedMovie ? (
          <MovieDetail
            movie={selectedMovie}
            busy={isSaving}
            onBack={() => setSelectedMovieId(null)}
            onEdit={() => setDialog({ movie: selectedMovie })}
            onDelete={() => setDeleteTarget(selectedMovie)}
            onUpdate={updateMovie}
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
                  placeholder="Название, режиссёр, жанр…"
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
                    onClick={() => setDialog({ movie: null })}
                  >
                    <Plus className="size-4" /> Добавить фильм
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-x-4 gap-y-7 sm:grid-cols-[repeat(auto-fill,minmax(185px,1fr))]">
                {visibleMovies.map((movie) => {
                  const runtime = formatRuntime(movie.runtimeMinutes)
                  return (
                    <article key={movie.id} className="group min-w-0">
                      <div className="relative aspect-[2/3] overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[var(--app-shadow-card)] transition-[transform,border-color,box-shadow] duration-200 group-hover:-translate-y-1 group-hover:border-violet-500/25 group-hover:shadow-xl motion-reduce:transition-none">
                        <button
                          type="button"
                          aria-label={`Открыть фильм «${movie.title}»`}
                          className="absolute inset-0 z-0 overflow-hidden text-left outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60 focus-visible:ring-inset"
                          onClick={() => setSelectedMovieId(movie.id)}
                        >
                          <MoviePoster movie={movie} />
                          <span className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                        </button>

                        <button
                          type="button"
                          aria-label={movie.favorite ? 'Убрать из избранного' : 'Добавить в избранное'}
                          aria-pressed={movie.favorite}
                          disabled={isSaving}
                          className={
                            movie.favorite
                              ? 'absolute top-2.5 right-2.5 z-10 flex size-9 items-center justify-center rounded-xl border border-rose-300/25 bg-black/50 text-rose-300 backdrop-blur-md transition-colors hover:bg-black/65 disabled:opacity-50'
                              : 'absolute top-2.5 right-2.5 z-10 flex size-9 items-center justify-center rounded-xl border border-white/10 bg-black/45 text-white/70 backdrop-blur-md transition-colors hover:text-white disabled:opacity-50'
                          }
                          onClick={() => void updateMovie({ ...movie, favorite: !movie.favorite })}
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
                            {movie.status === 'watched' ? <Check className="size-3" /> : <Bookmark className="size-3" />}
                            {movie.status === 'watched' ? 'Просмотрено' : 'Хочу посмотреть'}
                          </span>
                          {movie.rating !== null && (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-black/55 px-2 py-1 text-[11px] font-semibold text-amber-200 backdrop-blur-md">
                              <Star className="size-3 fill-current" /> {movie.rating.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        className="mt-3 block w-full min-w-0 text-left outline-none"
                        onClick={() => setSelectedMovieId(movie.id)}
                      >
                        <span className="block truncate text-sm font-semibold text-[var(--app-text)] transition-colors group-hover:text-violet-200">
                          {movie.title}
                        </span>
                        <span className="mt-1 flex items-center gap-1.5 truncate text-xs text-[var(--app-muted)]">
                          {movie.year ?? 'Год не указан'}
                          {runtime && <><span>·</span><span>{runtime}</span></>}
                        </span>
                      </button>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        )}
      </div>

      {dialog && (
        <MovieDialog
          key={dialog.movie?.id ?? 'new-movie'}
          open
          movie={dialog.movie}
          busy={isSaving}
          onOpenChange={(open) => {
            if (!open) setDialog(null)
          }}
          onSave={saveMovie}
        />
      )}

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
