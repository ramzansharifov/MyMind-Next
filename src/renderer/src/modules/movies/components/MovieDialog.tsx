import { CalendarDays, Film, Heart, Image, Star } from 'lucide-react'
import { useMemo, useState } from 'react'

import type {
  CreateMovieInput,
  MovieRecord,
  MovieStatus,
  UpdateMovieInput
} from '../../../../../shared/contracts/movies'
import { AppDialog } from '../../../shared/ui/AppDialog'

interface MovieDialogProps {
  open: boolean
  movie: MovieRecord | null
  busy: boolean
  onOpenChange: (open: boolean) => void
  onSave: (input: CreateMovieInput | UpdateMovieInput) => Promise<void>
}

const fieldClassName =
  'h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-control)] px-3 text-sm text-[var(--app-text)] outline-none transition-colors placeholder:text-[var(--app-muted)] focus:border-violet-500/45 focus:ring-2 focus:ring-violet-500/15'
const textareaClassName =
  'min-h-28 w-full resize-y rounded-xl border border-[var(--app-border)] bg-[var(--app-control)] px-3 py-2.5 text-sm leading-6 text-[var(--app-text)] outline-none transition-colors placeholder:text-[var(--app-muted)] focus:border-violet-500/45 focus:ring-2 focus:ring-violet-500/15'

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

export function MovieDialog({
  open,
  movie,
  busy,
  onOpenChange,
  onSave
}: MovieDialogProps): React.JSX.Element {
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
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={movie ? 'Изменить фильм' : 'Добавить фильм'}
      description="Заполните информацию для личной библиотеки фильмов"
      icon={<Film />}
      size="xl"
      busy={busy}
      footer={
        <>
          <button
            type="button"
            disabled={busy}
            className="h-10 rounded-xl border border-[var(--app-border)] px-4 text-sm font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] disabled:opacity-50"
            onClick={() => onOpenChange(false)}
          >
            Отмена
          </button>
          <button
            type="button"
            disabled={busy}
            className="h-10 rounded-xl bg-violet-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => void submit()}
          >
            {busy ? 'Сохраняем…' : movie ? 'Сохранить' : 'Добавить фильм'}
          </button>
        </>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[170px_minmax(0,1fr)]">
        <div>
          <div className="aspect-[2/3] overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] shadow-[var(--app-shadow-card)]">
            {canPreviewPoster ? (
              <img
                src={normalizedPosterUrl}
                alt="Предпросмотр постера"
                className="h-full w-full object-cover"
                onError={() => setPosterFailed(true)}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center text-[var(--app-muted)]">
                <Image className="size-9 opacity-60" />
                <span className="text-xs leading-5">Постер появится здесь после ввода ссылки</span>
              </div>
            )}
          </div>
          <p className="mt-2 text-xs leading-5 text-[var(--app-muted)]">
            Изображение не загружается в приложение. Сохраняется только ссылка.
          </p>
        </div>

        <div className="space-y-5">
          {error && (
            <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

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
              <span className="text-xs font-medium text-[var(--app-muted)]">Длительность, мин.</span>
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
              <span className="text-xs font-medium text-[var(--app-muted)]">Жанры через запятую</span>
              <input
                value={genres}
                className={fieldClassName}
                placeholder="Фантастика, Драма, Приключения"
                onChange={(event) => setGenres(event.target.value)}
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-[var(--app-muted)]">Статус</span>
              <select
                value={status}
                className={fieldClassName}
                onChange={(event) => setStatus(event.target.value as MovieStatus)}
              >
                <option value="watchlist">Хочу посмотреть</option>
                <option value="watched">Просмотрено</option>
              </select>
            </label>

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

            {status === 'watched' && (
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-[var(--app-muted)]">Дата просмотра</span>
                <input
                  value={watchedAt}
                  type="date"
                  className={fieldClassName}
                  onChange={(event) => setWatchedAt(event.target.value)}
                />
              </label>
            )}

            <label className="flex min-h-10 items-center gap-3 self-end rounded-xl border border-[var(--app-border)] bg-[var(--app-control)] px-3 text-sm text-[var(--app-text)]">
              <input
                checked={favorite}
                type="checkbox"
                className="size-4 accent-violet-500"
                onChange={(event) => setFavorite(event.target.checked)}
              />
              <Heart className="size-4 text-rose-300" />
              В избранном
            </label>
          </div>

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
              className={textareaClassName}
              placeholder="Что хочется запомнить об этом фильме?"
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
        </div>
      </div>
    </AppDialog>
  )
}
