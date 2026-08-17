import * as Popover from '@radix-ui/react-popover'
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
  SlidersHorizontal,
  Star,
  Trash2,
  X
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import type {
  CreateMovieInput,
  MovieRecord,
  MovieType,
  UpdateMovieInput
} from '../../../../shared/contracts/movies'
import { AppSelect, type AppSelectOption } from '../../shared/ui/AppSelect'
import { DeleteConfirmationDialog } from '../../shared/ui/DeleteConfirmationDialog'
import { ModuleHeader } from '../../shared/ui/ModuleHeader'
import { StandardModulePage } from '../../shared/ui/StandardModulePage'
import { moviesClient } from './api/movies-client'
import { MovieDetail } from './components/MovieDetail'
import { MovieFormPage } from './components/MovieFormPage'
import { MovieJsonImportDialog } from './components/MovieJsonImportDialog'
import { MOVIE_TYPE_OPTIONS, movieTypeLabel } from './movie-types'

type MovieFilter = 'all' | 'watchlist' | 'watched' | 'favorites'
type MovieView =
  | { kind: 'library' }
  | { kind: 'detail'; movieId: string }
  | { kind: 'form'; movieId: string | null }

type MovieAdvancedFilterKey = keyof MovieAdvancedFilters

interface MovieAdvancedFilters {
  type: MovieType | 'all'
  genre: string
  director: string
  actor: string
  year: string
  minRating: string
}

interface MoviesPageProps {
  resourceId?: string | null
  onResourceHandled?: () => void
}

interface FilterSelectProps {
  label: string
  value: string
  options: readonly AppSelectOption[]
  onChange: (value: string) => void
}

interface ActiveFilterChipProps {
  label: string
  onRemove: () => void
}

const MOVIE_FORM_ID = 'movie-form'

const EMPTY_ADVANCED_FILTERS: MovieAdvancedFilters = {
  type: 'all',
  genre: 'all',
  director: 'all',
  actor: 'all',
  year: 'all',
  minRating: 'all'
}

const filterItems: Array<{ id: MovieFilter; label: string; icon?: React.ReactNode }> = [
  { id: 'all', label: 'Все' },
  { id: 'watchlist', label: 'Хочу посмотреть', icon: <Bookmark className="size-4" /> },
  { id: 'watched', label: 'Просмотрено', icon: <Check className="size-4" /> },
  { id: 'favorites', label: 'Избранное', icon: <Heart className="size-4" /> }
]

const ratingFilterOptions: AppSelectOption[] = [
  { value: 'all', label: 'Любая оценка' },
  ...[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((rating) => ({
    value: rating.toString(),
    label: `От ${rating}`
  }))
]

function errorMessage(reason: unknown): string {
  if (reason instanceof Error) return reason.message
  return 'Не удалось выполнить действие'
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, 'ru-RU')
  )
}

function FilterSelect({ label, value, options, onChange }: FilterSelectProps): React.JSX.Element {
  return (
    <div className="space-y-1.5">
      <span className="block text-xs font-medium text-[var(--app-muted)]">{label}</span>
      <AppSelect ariaLabel={label} value={value} options={options} onValueChange={onChange} />
    </div>
  )
}

function ActiveFilterChip({ label, onRemove }: ActiveFilterChipProps): React.JSX.Element {
  return (
    <span className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-violet-400/20 bg-violet-500/10 px-2.5 text-xs font-medium text-violet-200">
      {label}
      <button
        type="button"
        aria-label={`Убрать фильтр «${label}»`}
        className="flex size-5 items-center justify-center rounded-md text-violet-200/70 transition-colors hover:bg-white/[0.08] hover:text-violet-100"
        onClick={onRemove}
      >
        <X className="size-3" />
      </button>
    </span>
  )
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
  const [advancedFilters, setAdvancedFilters] =
    useState<MovieAdvancedFilters>(EMPTY_ADVANCED_FILTERS)
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

  const filterOptions = useMemo(
    () => ({
      genres: uniqueSorted(movies.flatMap((movie) => movie.genres)),
      directors: uniqueSorted(movies.map((movie) => movie.director)),
      actors: uniqueSorted(movies.flatMap((movie) => movie.actors)),
      years: Array.from(
        new Set(movies.flatMap((movie) => (movie.year === null ? [] : [movie.year])))
      ).sort((a, b) => b - a)
    }),
    [movies]
  )

  const activeAdvancedFilterCount = useMemo(
    () => Object.values(advancedFilters).filter((value) => value !== 'all').length,
    [advancedFilters]
  )

  const visibleMovies = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ru-RU')
    const selectedYear =
      advancedFilters.year === 'all' ? null : Number.parseInt(advancedFilters.year, 10)
    const minRating =
      advancedFilters.minRating === 'all'
        ? null
        : Number.parseInt(advancedFilters.minRating, 10)

    return movies.filter((movie) => {
      if (filter === 'watchlist' && movie.status !== 'watchlist') return false
      if (filter === 'watched' && movie.status !== 'watched') return false
      if (filter === 'favorites' && !movie.favorite) return false
      if (advancedFilters.type !== 'all' && movie.type !== advancedFilters.type) return false
      if (advancedFilters.genre !== 'all' && !movie.genres.includes(advancedFilters.genre)) return false
      if (advancedFilters.director !== 'all' && movie.director !== advancedFilters.director) {
        return false
      }
      if (advancedFilters.actor !== 'all' && !movie.actors.includes(advancedFilters.actor)) return false
      if (selectedYear !== null && movie.year !== selectedYear) return false
      if (minRating !== null && (movie.rating === null || movie.rating < minRating)) return false
      if (!normalizedQuery) return true

      return [
        movie.title,
        movie.originalTitle ?? '',
        movieTypeLabel(movie.type),
        movie.year?.toString() ?? '',
        movie.director,
        ...movie.actors,
        ...movie.genres
      ]
        .join(' ')
        .toLocaleLowerCase('ru-RU')
        .includes(normalizedQuery)
    })
  }, [advancedFilters, filter, movies, query])

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

  function setAdvancedFilter(key: MovieAdvancedFilterKey, value: string): void {
    setAdvancedFilters((current) => ({ ...current, [key]: value }) as MovieAdvancedFilters)
  }

  function clearAdvancedFilter(key: MovieAdvancedFilterKey): void {
    setAdvancedFilters((current) => ({ ...current, [key]: 'all' }) as MovieAdvancedFilters)
  }

  function resetAdvancedFilters(): void {
    setAdvancedFilters({ ...EMPTY_ADVANCED_FILTERS })
  }

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
      <StandardModulePage>
        <div className="flex min-h-72 items-center justify-center text-sm text-[var(--app-muted)]">
          <LoaderCircle className="mr-2 size-4 animate-spin" /> Загружаем библиотеку фильмов…
        </div>
      </StandardModulePage>
    )
  }

  const headerTitle =
    view.kind === 'form'
      ? view.movieId
        ? 'Редактировать фильм'
        : 'Добавить фильм'
      : 'Фильмы'

  const headerActions = (
    <>
      {view.kind === 'library' && (
        <>
          <button
            type="button"
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-4 text-sm font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
            onClick={() => setJsonImportOpen(true)}
          >
            <Braces className="size-4" /> Из JSON
          </button>
          <button
            type="button"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-violet-400"
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
    </>
  )

  return (
    <StandardModulePage>
      <ModuleHeader icon={Film} title={headerTitle} className="mb-5" actions={headerActions}>
        {view.kind === 'library' && (
          <>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 max-[1120px]:grid-cols-1">
              <label className="flex h-12 min-w-0 items-center gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-4 focus-within:border-violet-500/45 focus-within:bg-[var(--app-surface)] focus-within:ring-2 focus-within:ring-violet-500/10">
                <Search className="size-4 shrink-0 text-[var(--app-muted)]" />
                <input
                  value={query}
                  type="search"
                  aria-label="Поиск по фильмам"
                  placeholder="Найти по названию, режиссёру, актёру или жанру"
                  className="min-w-0 flex-1 bg-transparent text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/65"
                  onChange={(event) => setQuery(event.target.value)}
                />
                {query && (
                  <button
                    type="button"
                    aria-label="Очистить поиск"
                    className="flex size-7 shrink-0 items-center justify-center rounded-lg text-[var(--app-muted)] transition-colors hover:bg-white/[0.06] hover:text-[var(--app-text)]"
                    onClick={() => setQuery('')}
                  >
                    <X className="size-4" />
                  </button>
                )}
              </label>

              <div className="flex min-w-0 items-stretch gap-2 max-[1120px]:w-full max-[760px]:flex-col">
                <div
                  role="tablist"
                  aria-label="Разделы фильмов"
                  className="flex min-h-12 min-w-0 items-center gap-1 overflow-x-auto rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-1.5 max-[1120px]:flex-1"
                >
                  {filterItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      role="tab"
                      aria-selected={filter === item.id}
                      className={
                        filter === item.id
                          ? 'inline-flex h-9 shrink-0 items-center gap-2 rounded-xl bg-violet-500 px-3.5 text-sm font-semibold text-white'
                          : 'inline-flex h-9 shrink-0 items-center gap-2 rounded-xl px-3.5 text-sm font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'
                      }
                      onClick={() => setFilter(item.id)}
                    >
                      {item.icon}
                      {item.label}
                    </button>
                  ))}
                </div>

                <Popover.Root>
                  <Popover.Trigger asChild>
                    <button
                      type="button"
                      aria-label="Фильтры библиотеки"
                      className={
                        activeAdvancedFilterCount > 0
                          ? 'inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl border border-violet-400/30 bg-violet-500/10 px-4 text-sm font-semibold text-violet-200 transition-colors hover:bg-violet-500/15'
                          : 'inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-4 text-sm font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'
                      }
                    >
                      <SlidersHorizontal className="size-4" />
                      Фильтры
                      {activeAdvancedFilterCount > 0 && (
                        <span className="flex min-w-5 items-center justify-center rounded-md bg-violet-400/15 px-1.5 text-[11px] text-violet-100">
                          {activeAdvancedFilterCount}
                        </span>
                      )}
                    </button>
                  </Popover.Trigger>
                  <Popover.Portal>
                    <Popover.Content
                      align="end"
                      sideOffset={8}
                      collisionPadding={12}
                      className="z-[70] w-[min(34rem,calc(100vw-2rem))] rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-4 shadow-2xl outline-none"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h2 className="text-sm font-semibold text-[var(--app-text)]">
                            Фильтры библиотеки
                          </h2>
                          <p className="mt-1 text-xs leading-5 text-[var(--app-muted)]">
                            Фильтруйте по типу, людям и метаданным фильма.
                          </p>
                        </div>
                        <Popover.Close asChild>
                          <button
                            type="button"
                            aria-label="Закрыть фильтры"
                            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
                          >
                            <X className="size-4" />
                          </button>
                        </Popover.Close>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <FilterSelect
                          label="Тип"
                          value={advancedFilters.type}
                          options={[{ value: 'all', label: 'Все типы' }, ...MOVIE_TYPE_OPTIONS]}
                          onChange={(value) => setAdvancedFilter('type', value)}
                        />
                        <FilterSelect
                          label="Жанр"
                          value={advancedFilters.genre}
                          options={[
                            { value: 'all', label: 'Все жанры' },
                            ...filterOptions.genres.map((genre) => ({ value: genre, label: genre }))
                          ]}
                          onChange={(value) => setAdvancedFilter('genre', value)}
                        />
                        <FilterSelect
                          label="Режиссёр"
                          value={advancedFilters.director}
                          options={[
                            { value: 'all', label: 'Все режиссёры' },
                            ...filterOptions.directors.map((director) => ({ value: director, label: director }))
                          ]}
                          onChange={(value) => setAdvancedFilter('director', value)}
                        />
                        <FilterSelect
                          label="Актёр"
                          value={advancedFilters.actor}
                          options={[
                            { value: 'all', label: 'Все актёры' },
                            ...filterOptions.actors.map((actor) => ({ value: actor, label: actor }))
                          ]}
                          onChange={(value) => setAdvancedFilter('actor', value)}
                        />
                        <FilterSelect
                          label="Год"
                          value={advancedFilters.year}
                          options={[
                            { value: 'all', label: 'Любой год' },
                            ...filterOptions.years.map((year) => ({ value: String(year), label: String(year) }))
                          ]}
                          onChange={(value) => setAdvancedFilter('year', value)}
                        />
                        <FilterSelect
                          label="Оценка"
                          value={advancedFilters.minRating}
                          options={ratingFilterOptions}
                          onChange={(value) => setAdvancedFilter('minRating', value)}
                        />
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--app-border)] pt-3">
                        <span className="text-[11px] text-[var(--app-muted)]">
                          Изменения применяются сразу
                        </span>
                        <button
                          type="button"
                          disabled={activeAdvancedFilterCount === 0}
                          className="h-8 rounded-lg px-2.5 text-xs font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] disabled:cursor-default disabled:opacity-40"
                          onClick={resetAdvancedFilters}
                        >
                          Сбросить
                        </button>
                      </div>
                    </Popover.Content>
                  </Popover.Portal>
                </Popover.Root>
              </div>
            </div>

            {activeAdvancedFilterCount > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-medium text-[var(--app-muted)]">
                  Активные фильтры:
                </span>
                {advancedFilters.type !== 'all' && (
                  <ActiveFilterChip
                    label={`Тип: ${movieTypeLabel(advancedFilters.type)}`}
                    onRemove={() => clearAdvancedFilter('type')}
                  />
                )}
                {advancedFilters.genre !== 'all' && (
                  <ActiveFilterChip
                    label={`Жанр: ${advancedFilters.genre}`}
                    onRemove={() => clearAdvancedFilter('genre')}
                  />
                )}
                {advancedFilters.director !== 'all' && (
                  <ActiveFilterChip
                    label={`Режиссёр: ${advancedFilters.director}`}
                    onRemove={() => clearAdvancedFilter('director')}
                  />
                )}
                {advancedFilters.actor !== 'all' && (
                  <ActiveFilterChip
                    label={`Актёр: ${advancedFilters.actor}`}
                    onRemove={() => clearAdvancedFilter('actor')}
                  />
                )}
                {advancedFilters.year !== 'all' && (
                  <ActiveFilterChip
                    label={`Год: ${advancedFilters.year}`}
                    onRemove={() => clearAdvancedFilter('year')}
                  />
                )}
                {advancedFilters.minRating !== 'all' && (
                  <ActiveFilterChip
                    label={`Оценка: от ${advancedFilters.minRating}`}
                    onRemove={() => clearAdvancedFilter('minRating')}
                  />
                )}
                <button
                  type="button"
                  className="h-8 rounded-lg px-2.5 text-xs font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
                  onClick={resetAdvancedFilters}
                >
                  Сбросить все
                </button>
              </div>
            )}
          </>
        )}
      </ModuleHeader>

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
                  : 'Попробуй изменить поиск, раздел или активные фильтры.'}
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
              {visibleMovies.map((movie) => (
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
              ))}
            </div>
          )}
        </section>
      )}

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
    </StandardModulePage>
  )
}
