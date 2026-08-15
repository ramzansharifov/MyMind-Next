import {
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
