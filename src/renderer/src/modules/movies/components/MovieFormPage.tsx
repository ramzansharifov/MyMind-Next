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
  Star
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

function timestampToDateInput(timestamp: number | null): string {
  if (timestamp === null) return ''
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function dateInputToTimestamp(value: string): number | null {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day, 12, 0, 0, 0).getTime()
}

function SectionTitle({
  icon,
  title,
  description
}: {
  icon: React.ReactNode
  title: string
  description: string
}): React.JSX.Element {
  return (
    <div className="mb-5 flex items-start gap-3">
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-violet-500/15 bg-violet-500/10 text-violet-300 [&>svg]:size-4">
        {icon}
      </span>
      <div>
        <h2 className="text-sm font-semibold text-[var(--app-text)]">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-[var(--app-muted)]">{description}</p>
      </div>
    </div>
  )
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
  const [description, setDescription] = useState(movie?.description ?? '')
  const [status, setStatus] = useState<MovieStatus>(movie?.status ?? 'watchlist')
  const [favorite, setFavorite] = useState(movie?.favorite ?? false)
  const [rating, setRating] = useState(movie?.rating?.toString() ?? '')
  const [watchedAt, setWatchedAt] = useState(timestampToDateInput(movie?.watchedAt ?? null))
  const [notes, setNotes] = useState(movie?.notes ?? '')
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

  async function submit(): Promise<void> {
    setError(null)
    const cleanTitle = title.trim()
    if (!cleanTitle) {
      setError('Введите название фильма')
      return
    }

    const parsedYear = year.trim() ? Number(year) : null
    const parsedRuntime = runtimeMinutes.trim() ? Number(runtimeMinutes) : null
    const parsedRating = rating.trim() ? Number(rating) : null

    const base: CreateMovieInput = {
      title: cleanTitle,
      originalTitle: originalTitle.trim() || null,
      year: Number.isFinite(parsedYear) ? parsedYear : null,
      posterUrl: normalizedPosterUrl || null,
      director: director.trim(),
      runtimeMinutes: Number.isFinite(parsedRuntime) ? parsedRuntime : null,
      genres: genres
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      description: description.trim(),
      status,
      favorite,
      rating: Number.isFinite(parsedRating) ? parsedRating : null,
      watchedAt: status === 'watched' ? dateInputToTimestamp(watchedAt) : null,
      notes: notes.trim()
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

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={busy}
            className="h-10 rounded-xl border border-[var(--app-border)] px-4 text-sm font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] disabled:opacity-50"
            onClick={onCancel}
          >
            Отмена
          </button>
          <button
            type="button"
            disabled={busy}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => void submit()}
          >
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
            {busy ? 'Сохраняем…' : movie ? 'Сохранить изменения' : 'Добавить фильм'}
          </button>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs font-medium text-violet-300">
          <Film className="size-4" /> {movie ? 'Редактирование' : 'Новый фильм'}
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--app-text)]">
          {movie ? movie.title : 'Добавить фильм в библиотеку'}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--app-muted)]">
          {movie
            ? 'Обновите данные фильма, личный статус и впечатления.'
            : 'Соберите карточку фильма один раз — потом её можно оценивать, добавлять в избранное и отмечать просмотренной.'}
        </p>
      </div>

      {error && (
        <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
        <div className="space-y-5">
          <div className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-[var(--app-shadow-card)] sm:p-6">
            <SectionTitle
              icon={<Film />}
              title="Основная информация"
              description="Название и базовые данные, по которым фильм будет находиться в библиотеке."
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-xs font-medium text-[var(--app-muted)]">Название *</span>
                <input
                  value={title}
                  className={fieldClassName}
                  placeholder="Например, Интерстеллар"
                  autoFocus
                  onChange={(event) => setTitle(event.target.value)}
                />
              </label>

              <label className="space-y-1.5 sm:col-span-2">
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

              <label className="space-y-1.5 sm:col-span-2">
                <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--app-muted)]">
                  <Image className="size-3.5" /> Ссылка на постер
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
                <span className="block text-[11px] leading-5 text-[var(--app-muted)]">
                  Сохраняется только URL изображения. Файл не копируется в приложение.
                </span>
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
                <span className="text-xs font-medium text-[var(--app-muted)]">Жанры</span>
                <input
                  value={genres}
                  className={fieldClassName}
                  placeholder="Фантастика, Драма, Приключения"
                  onChange={(event) => setGenres(event.target.value)}
                />
                <span className="block text-[11px] text-[var(--app-muted)]">
                  Разделяйте жанры запятыми.
                </span>
              </label>
            </div>
          </div>

          <div className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-[var(--app-shadow-card)] sm:p-6">
            <SectionTitle
              icon={status === 'watched' ? <Check /> : <Bookmark />}
              title="Моя библиотека"
              description="Здесь хранится ваш личный статус фильма — отдельно от его общих данных."
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <span className="mb-2 block text-xs font-medium text-[var(--app-muted)]">
                  Статус
                </span>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    aria-pressed={status === 'watchlist'}
                    className={
                      status === 'watchlist'
                        ? 'flex min-h-16 items-center gap-3 rounded-2xl border border-violet-400/30 bg-violet-500/10 px-4 text-left text-violet-200 ring-1 ring-violet-500/10'
                        : 'flex min-h-16 items-center gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-4 text-left text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'
                    }
                    onClick={() => setStatus('watchlist')}
                  >
                    <Bookmark className="size-5 shrink-0" />
                    <span>
                      <strong className="block text-sm font-semibold">Хочу посмотреть</strong>
                      <span className="mt-0.5 block text-[11px] opacity-70">
                        Фильм в списке на будущее
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-pressed={status === 'watched'}
                    className={
                      status === 'watched'
                        ? 'flex min-h-16 items-center gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 text-left text-emerald-200 ring-1 ring-emerald-500/10'
                        : 'flex min-h-16 items-center gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-4 text-left text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'
                    }
                    onClick={() => setStatus('watched')}
                  >
                    <Check className="size-5 shrink-0" />
                    <span>
                      <strong className="block text-sm font-semibold">Просмотрено</strong>
                      <span className="mt-0.5 block text-[11px] opacity-70">
                        Фильм уже просмотрен
                      </span>
                    </span>
                  </button>
                </div>
              </div>

              <label className="space-y-1.5">
                <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--app-muted)]">
                  <Star className="size-3.5" /> Моя оценка
                </span>
                <select
                  value={rating}
                  className={fieldClassName}
                  onChange={(event) => setRating(event.target.value)}
                >
                  <option value="">Без оценки</option>
                  {Array.from({ length: 19 }, (_, index) => 10 - index * 0.5).map((value) => (
                    <option key={value} value={value}>
                      {value.toFixed(1)} / 10
                    </option>
                  ))}
                </select>
              </label>

              {status === 'watched' ? (
                <label className="space-y-1.5">
                  <span className="text-xs font-medium text-[var(--app-muted)]">
                    Дата просмотра
                  </span>
                  <input
                    value={watchedAt}
                    type="date"
                    className={fieldClassName}
                    onChange={(event) => setWatchedAt(event.target.value)}
                  />
                </label>
              ) : (
                <div className="hidden sm:block" />
              )}

              <button
                type="button"
                aria-pressed={favorite}
                className={
                  favorite
                    ? 'flex min-h-12 items-center gap-3 rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 text-sm font-medium text-rose-200 sm:col-span-2'
                    : 'flex min-h-12 items-center gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-4 text-sm font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] sm:col-span-2'
                }
                onClick={() => setFavorite((current) => !current)}
              >
                <Heart className={`size-4 ${favorite ? 'fill-current' : ''}`} />
                {favorite ? 'Фильм добавлен в избранное' : 'Добавить фильм в избранное'}
              </button>
            </div>
          </div>

          <div className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-[var(--app-shadow-card)] sm:p-6">
            <SectionTitle
              icon={<Star />}
              title="Описание и впечатления"
              description="Описание помогает вспомнить сюжет, а впечатления остаются полностью личными."
            />

            <div className="space-y-5">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-[var(--app-muted)]">Описание</span>
                <textarea
                  value={description}
                  className={textareaClassName}
                  placeholder="Короткое описание фильма…"
                  onChange={(event) => setDescription(event.target.value)}
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-[var(--app-muted)]">Мои впечатления</span>
                <textarea
                  value={notes}
                  className={`${textareaClassName} min-h-40`}
                  placeholder="Что хочется запомнить об этом фильме?"
                  onChange={(event) => setNotes(event.target.value)}
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
                <div className="flex h-full flex-col items-center justify-center gap-3 px-5 text-center text-[var(--app-muted)]">
                  <span className="flex size-12 items-center justify-center rounded-2xl border border-[var(--app-border)] bg-[var(--app-control)]">
                    <Image className="size-6 opacity-60" />
                  </span>
                  <span className="text-sm font-medium text-[var(--app-text)]">
                    Предпросмотр постера
                  </span>
                  <span className="text-xs leading-5">
                    Вставьте прямую HTTP/HTTPS-ссылку на изображение
                  </span>
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
                {rating && (
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
