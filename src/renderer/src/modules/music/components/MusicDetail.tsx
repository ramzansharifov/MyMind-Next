import {
  CalendarDays,
  Clock3,
  Disc3,
  Heart,
  Image,
  Layers3,
  Music2,
  Play,
  Star,
  Tags,
  Users
} from 'lucide-react'
import { useEffect, useState } from 'react'

import type { MusicItemRecord } from '../../../../../shared/contracts/music'
import { AppDialog } from '../../../shared/ui/AppDialog'
import { DeleteConfirmationDialog } from '../../../shared/ui/DeleteConfirmationDialog'
import { musicTypeLabel } from '../music-types'

interface MusicDetailProps {
  item: MusicItemRecord
  busy: boolean
  onUpdate: (item: MusicItemRecord) => Promise<void>
  onSearchWeb: (query: string) => Promise<void>
}

function formatDuration(seconds: number | null): string | null {
  if (seconds === null) return null
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const rest = seconds % 60
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${rest.toString().padStart(2, '0')}`
  }
  return `${minutes}:${rest.toString().padStart(2, '0')}`
}

function Cover({ item }: { item: MusicItemRecord }): React.JSX.Element {
  const [failed, setFailed] = useState(false)

  useEffect(() => setFailed(false), [item.coverUrl])

  if (!item.coverUrl || failed) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-[var(--app-control)] text-[var(--app-muted)]">
        <Image className="size-12 opacity-45" />
        <span className="text-xs">Обложка не указана</span>
      </div>
    )
  }

  return (
    <img
      src={item.coverUrl}
      alt={`Обложка «${item.title}»`}
      className="h-full w-full object-cover"
      onError={() => setFailed(true)}
    />
  )
}

export function MusicDetail({
  item,
  busy,
  onUpdate,
  onSearchWeb
}: MusicDetailProps): React.JSX.Element {
  const [revertOpen, setRevertOpen] = useState(false)
  const [ratingOpen, setRatingOpen] = useState(false)
  const [pendingRating, setPendingRating] = useState<number | null>(item.rating)

  useEffect(() => setPendingRating(item.rating), [item.id, item.rating])

  function openRating(): void {
    setPendingRating(item.rating)
    setRatingOpen(true)
  }

  async function confirmRating(): Promise<void> {
    if (pendingRating === null) return
    await onUpdate({ ...item, status: 'listened', rating: pendingRating })
    setRatingOpen(false)
  }

  const duration = formatDuration(item.durationSeconds)
  const artistText = item.artists.length > 0 ? item.artists.join(', ') : 'Исполнитель не указан'
  const listenQuery = `Слушать ${item.title}${item.artists[0] ? ` ${item.artists[0]}` : ''}`

  return (
    <>
      <section className="overflow-hidden rounded-[26px] border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[var(--app-shadow-card)]">
        <div className="grid md:grid-cols-[360px_minmax(0,1fr)]">
          <div className="aspect-square min-h-0 overflow-hidden border-b border-[var(--app-border)] bg-[var(--app-workspace)] md:border-r md:border-b-0">
            <Cover item={item} />
          </div>

          <div className="min-w-0 p-7 max-[700px]:p-5">
            <div className="flex items-start justify-between gap-5">
              <div className="min-w-0">
                <div className="mb-2 text-xs font-semibold tracking-[0.1em] text-violet-300 uppercase">
                  {musicTypeLabel(item.type)}
                </div>
                <h2 className="text-3xl font-semibold tracking-[-0.035em] text-[var(--app-text)]">
                  {item.title}
                </h2>
                <p className="mt-2 text-base text-[var(--app-muted)]">{artistText}</p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {item.status === 'listened' && (
                  <button
                    type="button"
                    disabled={busy}
                    aria-label={item.rating === null ? 'Поставить оценку' : 'Изменить оценку'}
                    className="inline-flex h-11 items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3.5 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/15 disabled:opacity-50"
                    onClick={openRating}
                  >
                    <Star className={`size-4 ${item.rating !== null ? 'fill-current' : ''}`} />
                    {item.rating === null ? 'Оценить' : `${item.rating} / 10`}
                  </button>
                )}
                <button
                  type="button"
                  aria-label={item.favorite ? 'Убрать из избранного' : 'Добавить в избранное'}
                  aria-pressed={item.favorite}
                  disabled={busy}
                  className={
                    item.favorite
                      ? 'flex size-11 items-center justify-center rounded-xl border border-rose-400/20 bg-rose-500/10 text-rose-300 transition-colors hover:bg-rose-500/15 disabled:opacity-50'
                      : 'flex size-11 items-center justify-center rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-rose-300 disabled:opacity-50'
                  }
                  onClick={() => void onUpdate({ ...item, favorite: !item.favorite })}
                >
                  <Heart className={`size-5 ${item.favorite ? 'fill-current' : ''}`} />
                </button>
              </div>
            </div>

            <div className="my-6 h-px bg-[var(--app-border)]" />

            <div className="flex flex-wrap gap-2">
              {item.year !== null && (
                <span className="inline-flex items-center gap-2 rounded-xl border border-[var(--app-border-strong)] bg-[var(--app-control)] px-3 py-2 text-sm text-[var(--app-muted)]">
                  <CalendarDays className="size-4" /> {item.year}
                </span>
              )}
              {duration && (
                <span className="inline-flex items-center gap-2 rounded-xl border border-[var(--app-border-strong)] bg-[var(--app-control)] px-3 py-2 text-sm text-[var(--app-muted)]">
                  <Clock3 className="size-4" /> {duration}
                </span>
              )}
              {item.trackCount !== null && (
                <span className="inline-flex items-center gap-2 rounded-xl border border-[var(--app-border-strong)] bg-[var(--app-control)] px-3 py-2 text-sm text-[var(--app-muted)]">
                  <Layers3 className="size-4" /> {item.trackCount} треков
                </span>
              )}
            </div>

            <div className="mt-5 space-y-3 text-sm">
              {item.album && (
                <div className="flex items-start gap-2 text-[var(--app-muted)]">
                  <Disc3 className="mt-0.5 size-4 shrink-0" />
                  <span>
                    Альбом:{' '}
                    <strong className="font-medium text-[var(--app-text)]">{item.album}</strong>
                  </span>
                </div>
              )}
              {item.artists.length > 0 && (
                <div className="flex items-start gap-2 text-[var(--app-muted)]">
                  <Users className="mt-0.5 size-4 shrink-0" />
                  <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                    Исполнители:
                    {item.artists.map((artist) => (
                      <button
                        key={artist}
                        type="button"
                        className="font-medium text-[var(--app-text)] underline decoration-transparent underline-offset-4 transition-colors hover:text-violet-300 hover:decoration-violet-400/45"
                        onClick={() => void onSearchWeb(`Музыка ${artist}`)}
                      >
                        {artist}
                      </button>
                    ))}
                  </span>
                </div>
              )}
              {item.genres.length > 0 && (
                <div className="flex items-start gap-2 text-[var(--app-muted)]">
                  <Tags className="mt-2 size-4 shrink-0" />
                  <div className="flex flex-wrap gap-2">
                    {item.genres.map((genre) => (
                      <button
                        key={genre}
                        type="button"
                        className="rounded-xl border border-[var(--app-border-strong)] bg-[var(--app-control)] px-3 py-2 text-xs font-medium text-[var(--app-muted)] transition-colors hover:border-violet-400/35 hover:text-violet-300"
                        onClick={() => void onSearchWeb(`Музыка жанра ${genre}`)}
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <div className="inline-flex rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-1">
                <button
                  type="button"
                  aria-pressed={item.status === 'listened'}
                  disabled={busy}
                  className={
                    item.status === 'listened'
                      ? 'h-9 rounded-lg bg-emerald-500/15 px-3 text-sm font-medium text-emerald-200'
                      : 'h-9 rounded-lg px-3 text-sm text-[var(--app-muted)] hover:bg-[var(--app-control-hover)]'
                  }
                  onClick={openRating}
                >
                  Прослушано
                </button>
                <button
                  type="button"
                  aria-pressed={item.status === 'want_to_listen'}
                  disabled={busy}
                  className={
                    item.status === 'want_to_listen'
                      ? 'h-9 rounded-lg bg-violet-500/15 px-3 text-sm font-medium text-violet-200'
                      : 'h-9 rounded-lg px-3 text-sm text-[var(--app-muted)] hover:bg-[var(--app-control-hover)]'
                  }
                  onClick={() => {
                    if (item.status === 'listened') setRevertOpen(true)
                  }}
                >
                  Хочу послушать
                </button>
              </div>

              <button
                type="button"
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet-500/15 px-4 text-sm font-semibold text-violet-200 transition-colors hover:bg-violet-500/20"
                onClick={() => void onSearchWeb(listenQuery)}
              >
                <Play className="size-4 fill-current" /> Послушать
              </button>
            </div>

            {item.description && (
              <div className="mt-7 rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-5">
                <h3 className="text-sm font-semibold text-[var(--app-text)]">Описание</h3>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--app-muted)]">
                  {item.description}
                </p>
              </div>
            )}

            {item.comments && (
              <div className="mt-6 border-t border-[var(--app-border)] pt-5">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--app-text)]">
                  <Music2 className="size-4 text-violet-300" /> Личные комментарии
                </h3>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--app-muted)]">
                  {item.comments}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <DeleteConfirmationDialog
        open={revertOpen}
        title="Вернуть в «Хочу послушать»?"
        subject={item.title}
        description="Запись перестанет считаться прослушанной, а текущая оценка будет удалена."
        confirmLabel="Вернуть"
        submittingLabel="Сохраняем…"
        tone="warning"
        notice="Оценку можно будет поставить снова после прослушивания"
        isSubmitting={busy}
        onOpenChange={setRevertOpen}
        onConfirm={async () => {
          await onUpdate({ ...item, status: 'want_to_listen', rating: null })
          setRevertOpen(false)
        }}
      />

      <AppDialog
        open={ratingOpen}
        busy={busy}
        onOpenChange={setRatingOpen}
        title={item.status === 'listened' ? 'Оценить музыку' : 'Оцените музыку'}
        description="Выберите оценку от 1 до 10"
        icon={<Star />}
        size="sm"
        footer={
          <>
            <button
              type="button"
              disabled={busy}
              className="h-10 rounded-xl border border-[var(--app-border)] px-4 text-sm font-medium text-[var(--app-muted)] hover:bg-[var(--app-control-hover)]"
              onClick={() => setRatingOpen(false)}
            >
              Отмена
            </button>
            <button
              type="button"
              disabled={busy || pendingRating === null}
              className="h-10 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-45"
              onClick={() => void confirmRating()}
            >
              {item.status === 'listened' ? 'Сохранить оценку' : 'Отметить прослушанным'}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-5 gap-2 p-1">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
            <button
              key={rating}
              type="button"
              aria-pressed={pendingRating === rating}
              className={
                pendingRating === rating
                  ? 'flex h-11 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-500/15 font-semibold text-amber-200'
                  : 'flex h-11 items-center justify-center rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] font-medium text-[var(--app-muted)] hover:bg-[var(--app-control-hover)]'
              }
              onClick={() => setPendingRating(rating)}
            >
              {rating}
            </button>
          ))}
        </div>
      </AppDialog>
    </>
  )
}
