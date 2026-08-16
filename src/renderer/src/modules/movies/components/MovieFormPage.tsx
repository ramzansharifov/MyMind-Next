import {
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
  MovieType,
  UpdateMovieInput
} from '../../../../../shared/contracts/movies'
import { isEpisodicMovieType, MOVIE_TYPE_OPTIONS, movieTypeLabel } from '../movie-types'

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

function SectionTitle({
  icon,
  title
}: {
  icon: React.ReactNode
  title: string
}): React.JSX.Element {
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

function parseOptionalNumber(value: string): number | null {
  if (!value.trim()) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function MovieFormPage({
  movie,
  busy,
  onCancel,
  onSave
}: MovieFormPageProps): React.JSX.Element {
  const [title, setTitle] = useState(movie?.title ?? '')
  const [originalTitle, setOriginalTitle] = useState(movie?.originalTitle ?? '')
  const [type, setType] = useState<MovieType>(movie?.type ?? 'movie')
  const [posterUrl, setPosterUrl] = useState(movie?.posterUrl ?? '')
  const [year, setYear] = useState(movie?.year?.toString() ?? '')
  const [director, setDirector] = useState(movie?.director ?? '')
  const [runtimeMinutes, setRuntimeMinutes] = useState(movie?.runtimeMinutes?.toString() ?? '')
  const [seasonCount, setSeasonCount] = useState(movie?.seasonCount?.toString() ?? '')
  const [episodesPerSeason, setEpisodesPerSeason] = useState(
    movie?.episodesPerSeason?.toString() ?? ''
  )
  const [episodeRuntimeMinutes, setEpisodeRuntimeMinutes] = useState(
    movie?.episodeRuntimeMinutes?.toString() ?? ''
  )
  const [genres, setGenres] = useState(movie?.genres.join(', ') ?? '')
  const [actors, setActors] = useState(movie?.actors.join(', ') ?? '')
  const [description, setDescription] = useState(movie?.description ?? '')
  const [status, setStatus] = useState<MovieStatus>(movie?.status ?? 'watchlist')
  const [favorite, setFavorite] = useState(movie?.favorite ?? false)
  const [rating, setRating] = useState<number | null>(movie?.rating ?? null)
  const [comments, setComments] = useState(movie?.comments ?? '')
  const [posterFailed, setPosterFailed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const episodicType = isEpisodicMovieType(type)
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

    const base: CreateMovieInput = {
      title: cleanTitle,
      originalTitle: originalTitle.trim() || null,
      type,
      year: parseOptionalNumber(year),
      posterUrl: normalizedPosterUrl || null,
      director: director.trim(),
      runtimeMinutes: episodicType ? null : parseOptionalNumber(runtimeMinutes),
      seasonCount: episodicType ? parseOptionalNumber(seasonCount) : null,
      episodesPerSeason: episodicType ? parseOptionalNumber(episodesPerSeason) : null,
      episodeRuntimeMinutes: episodicType ? parseOptionalNumber(episodeRuntimeMinutes) : null,
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
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-[var(--app-muted)]">Название *</span>
                <input
                  value={title}
                  className={fieldClassName}
                  placeholder="Интерстеллар"
                  autoFocus
                  onChange={(event) => setTitle(event.target.value)}
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-medium text-[var(--app-muted)]">
                  Оригинальное название
                </span>
                <input
                  value={originalTitle}
                  className={fieldClassName}
                  placeholder="Interstellar"
                  onChange={(event) => setOriginalTitle(event.target.value)}
                />
              </label>

              <div className="space-y-1.5 sm:col-span-2">
                <span className="text-xs font-medium text-[var(--app-muted)]">Тип</span>
                <div role="group" aria-label="Тип" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {MOVIE_TYPE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      aria-label={`Тип: ${option.label}`}
                      aria-pressed={type === option.value}
                      className={
                        type === option.value
                          ? 'h-10 rounded-xl border border-violet-400/30 bg-violet-500/10 px-3 text-sm font-semibold text-violet-200'
                          : 'h-10 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'
                      }
                      onClick={() => setType(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:col-span-2 lg:grid-cols-[minmax(0,2fr)_140px_180px]">
                <label className="space-y-1.5">
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
                    <Clock3 className="size-3.5" />{' '}
                    {episodicType ? 'Длительность серии, мин.' : 'Длительность, мин.'}
                  </span>
                  <input
                    value={episodicType ? episodeRuntimeMinutes : runtimeMinutes}
                    type="number"
                    min="1"
                    max="1440"
                    className={fieldClassName}
                    placeholder={episodicType ? '45' : '169'}
                    onChange={(event) =>
                      episodicType
                        ? setEpisodeRuntimeMinutes(event.target.value)
                        : setRuntimeMinutes(event.target.value)
                    }
                  />
                </label>
              </div>

              {episodicType && (
                <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-[var(--app-muted)]">
                      Количество сезонов
                    </span>
                    <input
                      value={seasonCount}
                      type="number"
                      min="1"
                      max="1000"
                      className={fieldClassName}
                      placeholder="3"
                      onChange={(event) => setSeasonCount(event.target.value)}
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-[var(--app-muted)]">
                      Серий в сезоне
                    </span>
                    <input
                      value={episodesPerSeason}
                      type="number"
                      min="1"
                      max="10000"
                      className={fieldClassName}
                      placeholder="10"
                      onChange={(event) => setEpisodesPerSeason(event.target.value)}
                    />
                  </label>
                </div>
              )}

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
              <div className="grid gap-2 sm:grid-cols-3">
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
                <button
                  type="button"
                  aria-pressed={favorite}
                  className={
                    favorite
                      ? 'flex h-12 items-center justify-center gap-2 rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 text-sm font-semibold text-rose-200'
                      : 'flex h-12 items-center justify-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-4 text-sm font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'
                  }
                  onClick={() => setFavorite((current) => !current)}
                >
                  <Heart className={`size-4 ${favorite ? 'fill-current' : ''}`} />
                  {favorite ? 'В избранном' : 'Добавить в избранное'}
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
            </div>
          </div>

          <div className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-[var(--app-shadow-card)] sm:p-6">
            <SectionTitle icon={<Star />} title="Описание и личные комментарии" />

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
                <span className="text-xs font-medium text-[var(--app-muted)]">
                  Личные комментарии
                </span>
                <textarea
                  value={comments}
                  className={`${textareaClassName} min-h-40`}
                  placeholder="Личный комментарий…"
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
                <span>{movieTypeLabel(type)}</span>
                {year.trim() && <span>·</span>}
                {year.trim() && <span>{year}</span>}
                {director.trim() && <span>·</span>}
                {director.trim() && <span className="truncate">{director}</span>}
              </div>

              {episodicType &&
                (seasonCount.trim() || episodesPerSeason.trim() || episodeRuntimeMinutes.trim()) && (
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--app-muted)]">
                    {seasonCount.trim() && <span>Сезонов: {seasonCount}</span>}
                    {episodesPerSeason.trim() && <span>Серий в сезоне: {episodesPerSeason}</span>}
                    {episodeRuntimeMinutes.trim() && (
                      <span>Серия: {episodeRuntimeMinutes} мин.</span>
                    )}
                  </div>
                )}

              <div className="mt-4 flex flex-wrap gap-2">
                <span
                  className={
                    status === 'watched'
                      ? 'inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-300'
                      : 'inline-flex items-center gap-1.5 rounded-lg bg-violet-500/10 px-2.5 py-1.5 text-xs font-medium text-violet-300'
                  }
                >
                  {status === 'watched' ? (
                    <Check className="size-3.5" />
                  ) : (
                    <Bookmark className="size-3.5" />
                  )}
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
