import { Bookmark, Disc3, Heart, Image, Music2, Star } from 'lucide-react'
import { useMemo, useState } from 'react'

import type {
  CreateMusicItemInput,
  MusicItemRecord,
  MusicStatus,
  MusicType
} from '../../../../../shared/contracts/music'
import { createMusicItemInputSchema } from '../../../../../shared/validation/music'
import { AppSelect } from '../../../shared/ui/AppSelect'
import { MUSIC_TYPE_OPTIONS, musicTypeLabel } from '../music-types'

interface MusicFormPageProps {
  item: MusicItemRecord | null
  formId: string
  onSave: (input: CreateMusicItemInput & { id?: string }) => Promise<void>
}

interface MusicDraft {
  title: string
  type: MusicType
  year: string
  coverUrl: string
  artists: string
  album: string
  duration: string
  trackCount: string
  genres: string
  description: string
  status: MusicStatus
  favorite: boolean
  rating: string
  comments: string
}

function listToText(values: string[]): string {
  return values.join(', ')
}

function textToList(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    )
  )
}

function formatDurationInput(seconds: number | null): string {
  if (seconds === null) return ''
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${minutes}:${rest.toString().padStart(2, '0')}`
}

function parseDuration(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^\d+$/.test(trimmed)) return Number.parseInt(trimmed, 10)
  const match = /^(\d+):([0-5]\d)$/.exec(trimmed)
  if (!match) return Number.NaN
  return Number.parseInt(match[1], 10) * 60 + Number.parseInt(match[2], 10)
}

function draftFromItem(item: MusicItemRecord | null): MusicDraft {
  return {
    title: item?.title ?? '',
    type: item?.type ?? 'track',
    year: item?.year?.toString() ?? '',
    coverUrl: item?.coverUrl ?? '',
    artists: listToText(item?.artists ?? []),
    album: item?.album ?? '',
    duration: formatDurationInput(item?.durationSeconds ?? null),
    trackCount: item?.trackCount?.toString() ?? '',
    genres: listToText(item?.genres ?? []),
    description: item?.description ?? '',
    status: item?.status ?? 'want_to_listen',
    favorite: item?.favorite ?? false,
    rating: item?.rating?.toString() ?? '',
    comments: item?.comments ?? ''
  }
}

function FieldLabel({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <span className="mb-1.5 block text-xs font-medium text-[var(--app-muted)]">{children}</span>
  )
}

const inputClassName =
  'h-11 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3.5 text-sm text-[var(--app-text)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--app-muted)]/70 focus:border-accent-500/45 focus:ring-2 focus:ring-accent-500/15'

export function MusicFormPage({ item, formId, onSave }: MusicFormPageProps): React.JSX.Element {
  const [draft, setDraft] = useState<MusicDraft>(() => draftFromItem(item))
  const [error, setError] = useState<string | null>(null)
  const [coverFailed, setCoverFailed] = useState(false)

  const artists = useMemo(() => textToList(draft.artists), [draft.artists])

  function patch(values: Partial<MusicDraft>): void {
    setDraft((current) => ({ ...current, ...values }))
    setError(null)
  }

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const durationSeconds = parseDuration(draft.duration)
    if (Number.isNaN(durationSeconds)) {
      setError('Длительность укажите в формате 3:45 или числом секунд')
      return
    }

    const raw: CreateMusicItemInput = {
      title: draft.title,
      type: draft.type,
      year: draft.year.trim() ? Number.parseInt(draft.year, 10) : null,
      coverUrl: draft.coverUrl.trim() || null,
      artists,
      album: draft.album,
      durationSeconds,
      trackCount: draft.trackCount.trim() ? Number.parseInt(draft.trackCount, 10) : null,
      genres: textToList(draft.genres),
      description: draft.description,
      status: draft.status,
      favorite: draft.favorite,
      rating:
        draft.status === 'listened' && draft.rating ? Number.parseInt(draft.rating, 10) : null,
      comments: draft.comments
    }

    const parsed = createMusicItemInputSchema.safeParse(raw)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Проверьте данные формы')
      return
    }

    try {
      await onSave(item ? { ...parsed.data, id: item.id } : parsed.data)
    } catch {
      // Ошибка показывается родительской страницей.
    }
  }

  const previewArtist = artists.length > 0 ? artists.join(', ') : 'Исполнитель не указан'

  return (
    <form
      id={formId}
      className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_280px]"
      onSubmit={(event) => void submit(event)}
    >
      <div className="space-y-5">
        <section className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-[var(--app-shadow-card)]">
          <div className="mb-5 flex items-center gap-3">
            <span className="border-accent-500/15 bg-accent-500/10 text-accent-300 flex size-9 items-center justify-center rounded-xl border">
              <Music2 className="size-4" />
            </span>
            <h2 className="text-sm font-semibold text-[var(--app-text)]">Основная информация</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <FieldLabel>Название *</FieldLabel>
              <input
                value={draft.title}
                autoFocus
                placeholder="Blinding Lights"
                className={inputClassName}
                onChange={(event) => patch({ title: event.target.value })}
              />
            </label>
            <label>
              <FieldLabel>Альбом / релиз</FieldLabel>
              <input
                value={draft.album}
                placeholder="After Hours"
                className={inputClassName}
                onChange={(event) => patch({ album: event.target.value })}
              />
            </label>
          </div>

          <div className="mt-4">
            <FieldLabel>Тип</FieldLabel>
            <div className="grid gap-2 sm:grid-cols-4">
              {MUSIC_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={draft.type === option.value}
                  className={
                    draft.type === option.value
                      ? 'border-accent-400/25 bg-accent-500/15 text-accent-200 h-10 rounded-xl border text-sm font-medium'
                      : 'h-10 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] text-sm font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'
                  }
                  onClick={() => patch({ type: option.value })}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,2fr)_130px_150px_130px]">
            <label>
              <FieldLabel>Обложка</FieldLabel>
              <input
                value={draft.coverUrl}
                placeholder="https://example.com/cover.jpg"
                className={inputClassName}
                onChange={(event) => {
                  setCoverFailed(false)
                  patch({ coverUrl: event.target.value })
                }}
              />
            </label>
            <label>
              <FieldLabel>Год</FieldLabel>
              <input
                value={draft.year}
                inputMode="numeric"
                placeholder="2020"
                className={inputClassName}
                onChange={(event) => patch({ year: event.target.value })}
              />
            </label>
            <label>
              <FieldLabel>Длительность</FieldLabel>
              <input
                value={draft.duration}
                inputMode="numeric"
                placeholder="3:45"
                className={inputClassName}
                onChange={(event) => patch({ duration: event.target.value })}
              />
            </label>
            <label>
              <FieldLabel>Треков</FieldLabel>
              <input
                value={draft.trackCount}
                inputMode="numeric"
                placeholder="12"
                className={inputClassName}
                onChange={(event) => patch({ trackCount: event.target.value })}
              />
            </label>
          </div>

          <label className="mt-4 block">
            <FieldLabel>Исполнители</FieldLabel>
            <input
              value={draft.artists}
              placeholder="The Weeknd, Daft Punk"
              className={inputClassName}
              onChange={(event) => patch({ artists: event.target.value })}
            />
          </label>

          <label className="mt-4 block">
            <FieldLabel>Жанры</FieldLabel>
            <input
              value={draft.genres}
              placeholder="Synth-pop, R&B"
              className={inputClassName}
              onChange={(event) => patch({ genres: event.target.value })}
            />
          </label>
        </section>

        <section className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-[var(--app-shadow-card)]">
          <div className="mb-4 flex items-center gap-3">
            <span className="border-accent-500/15 bg-accent-500/10 text-accent-300 flex size-9 items-center justify-center rounded-xl border">
              <Bookmark className="size-4" />
            </span>
            <h2 className="text-sm font-semibold text-[var(--app-text)]">Моя библиотека</h2>
          </div>

          <div className="grid gap-2 md:grid-cols-3">
            <button
              type="button"
              className={
                draft.status === 'want_to_listen'
                  ? 'border-accent-400/25 bg-accent-500/15 text-accent-200 h-11 rounded-xl border text-sm font-medium'
                  : 'h-11 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] text-sm text-[var(--app-muted)]'
              }
              onClick={() => patch({ status: 'want_to_listen', rating: '' })}
            >
              Хочу послушать
            </button>
            <button
              type="button"
              className={
                draft.status === 'listened'
                  ? 'h-11 rounded-xl border border-emerald-400/25 bg-emerald-500/10 text-sm font-medium text-emerald-200'
                  : 'h-11 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] text-sm text-[var(--app-muted)]'
              }
              onClick={() => patch({ status: 'listened' })}
            >
              Прослушано
            </button>
            <button
              type="button"
              aria-pressed={draft.favorite}
              className={
                draft.favorite
                  ? 'inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-rose-400/25 bg-rose-500/10 text-sm font-medium text-rose-200'
                  : 'inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] text-sm text-[var(--app-muted)]'
              }
              onClick={() => patch({ favorite: !draft.favorite })}
            >
              <Heart className={`size-4 ${draft.favorite ? 'fill-current' : ''}`} />
              {draft.favorite ? 'В избранном' : 'Добавить в избранное'}
            </button>
          </div>

          {draft.status === 'listened' && (
            <div className="mt-4 max-w-xs">
              <FieldLabel>Оценка</FieldLabel>
              <AppSelect
                ariaLabel="Оценка музыки"
                value={draft.rating || 'none'}
                triggerClassName={inputClassName}
                options={[
                  { value: 'none', label: 'Без оценки' },
                  ...[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((rating) => ({
                    value: String(rating),
                    label: `${rating} / 10`
                  }))
                ]}
                onValueChange={(value) => patch({ rating: value === 'none' ? '' : value })}
              />
            </div>
          )}
        </section>

        <section className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-[var(--app-shadow-card)]">
          <div className="mb-4 flex items-center gap-3">
            <span className="border-accent-500/15 bg-accent-500/10 text-accent-300 flex size-9 items-center justify-center rounded-xl border">
              <Star className="size-4" />
            </span>
            <h2 className="text-sm font-semibold text-[var(--app-text)]">
              Описание и личные комментарии
            </h2>
          </div>
          <label className="block">
            <FieldLabel>Описание</FieldLabel>
            <textarea
              value={draft.description}
              rows={5}
              placeholder="Описание релиза или трека…"
              className="focus:border-accent-500/45 focus:ring-accent-500/15 w-full resize-y rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-3.5 text-sm leading-6 text-[var(--app-text)] outline-none focus:ring-2"
              onChange={(event) => patch({ description: event.target.value })}
            />
          </label>
          <label className="mt-4 block">
            <FieldLabel>Личные комментарии</FieldLabel>
            <textarea
              value={draft.comments}
              rows={4}
              placeholder="Что хочется запомнить…"
              className="focus:border-accent-500/45 focus:ring-accent-500/15 w-full resize-y rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-3.5 text-sm leading-6 text-[var(--app-text)] outline-none focus:ring-2"
              onChange={(event) => patch({ comments: event.target.value })}
            />
          </label>
        </section>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          >
            {error}
          </div>
        )}
      </div>

      <aside className="sticky top-0 rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow-card)] max-xl:static">
        <div className="aspect-square overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)]">
          {draft.coverUrl && !coverFailed ? (
            <img
              src={draft.coverUrl}
              alt="Предпросмотр обложки"
              className="h-full w-full object-cover"
              onError={() => setCoverFailed(true)}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-[var(--app-muted)]">
              <Image className="size-10 opacity-45" />
              <span className="text-xs">Обложка не указана</span>
            </div>
          )}
        </div>
        <h3 className="mt-4 truncate text-base font-semibold text-[var(--app-text)]">
          {draft.title || 'Без названия'}
        </h3>
        <p className="mt-1 truncate text-sm text-[var(--app-muted)]">{previewArtist}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-[var(--app-muted)]">
          <span className="rounded-lg border border-[var(--app-border)] px-2 py-1">
            {musicTypeLabel(draft.type)}
          </span>
          {draft.year && (
            <span className="rounded-lg border border-[var(--app-border)] px-2 py-1">
              {draft.year}
            </span>
          )}
        </div>
        <div className="bg-accent-500/10 text-accent-200 mt-4 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium">
          <Disc3 className="size-4" />
          {draft.status === 'listened' ? 'Прослушано' : 'Хочу послушать'}
        </div>
      </aside>
    </form>
  )
}
