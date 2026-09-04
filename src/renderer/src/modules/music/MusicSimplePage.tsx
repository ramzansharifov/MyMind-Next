import { Tooltip } from '../../shared/ui/tooltip'
import * as Checkbox from '@radix-ui/react-checkbox'
import * as Dialog from '@radix-ui/react-dialog'
import {
  Check,
  Disc3,
  Heart,
  Image as ImageIcon,
  ListMusic,
  LoaderCircle,
  Music2,
  Plus,
  Save,
  Trash2,
  X
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import type {
  CreateMusicItemInput,
  CreateMusicPlaylistInput,
  MusicItemRecord,
  MusicOverview,
  MusicPlaylistRecord,
  UpdateMusicItemInput
} from '../../../../shared/contracts/music'
import {
  createMusicItemInputSchema,
  createMusicPlaylistInputSchema
} from '../../../../shared/validation/music'
import { DeleteConfirmationDialog } from '../../shared/ui/DeleteConfirmationDialog'
import { ModuleHeader } from '../../shared/ui/ModuleHeader'
import { StandardModulePage } from '../../shared/ui/StandardModulePage'
import { musicClient } from './api/music-client'
import {
  MusicLibraryContent,
  MusicLibraryNavigation,
  type MusicLibraryFilters,
  type MusicLibraryScope
} from './components/MusicLibraryView'
import './components/music-interactions.css'

interface MusicPageProps {
  resourceId?: string | null
  onResourceHandled?: () => void
}

interface TrackDraft {
  title: string
  artist: string
  year: string
  duration: string
  favorite: boolean
  playlistIds: string[]
}

function errorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : 'Не удалось выполнить действие'
}

function formatDuration(seconds: number | null): string | null {
  if (seconds === null) return null
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${minutes}:${rest.toString().padStart(2, '0')}`
}

function formatDurationInput(seconds: number | null): string {
  return formatDuration(seconds) ?? ''
}

function parseDuration(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^\d+$/.test(trimmed)) return Number.parseInt(trimmed, 10)
  const match = /^(\d+):([0-5]\d)$/.exec(trimmed)
  if (!match) return Number.NaN
  return Number.parseInt(match[1], 10) * 60 + Number.parseInt(match[2], 10)
}

function playlistIdsForTrack(playlists: MusicPlaylistRecord[], itemId: string): string[] {
  return playlists
    .filter((playlist) => playlist.trackIds.includes(itemId))
    .map((playlist) => playlist.id)
}

function draftFromItem(item: MusicItemRecord | null, playlists: MusicPlaylistRecord[]): TrackDraft {
  return {
    title: item?.title ?? '',
    artist: item?.artists[0] ?? '',
    year: item?.year?.toString() ?? '',
    duration: formatDurationInput(item?.durationSeconds ?? null),
    favorite: item?.favorite ?? false,
    playlistIds: item ? playlistIdsForTrack(playlists, item.id) : []
  }
}

function itemInputFromDraft(
  draft: TrackDraft,
  previous: MusicItemRecord | null
): CreateMusicItemInput {
  const durationSeconds = parseDuration(draft.duration)
  const artist = draft.artist.trim()

  return {
    title: draft.title,
    type: 'track',
    year: draft.year.trim() ? Number.parseInt(draft.year, 10) : null,
    coverUrl: null,
    artists: artist ? [artist] : [],
    album: '',
    durationSeconds,
    trackCount: null,
    genres: [],
    description: '',
    status: previous?.status ?? 'listened',
    favorite: draft.favorite,
    rating: null,
    comments: ''
  }
}

function updateInputWithFavorite(item: MusicItemRecord, favorite: boolean): UpdateMusicItemInput {
  return {
    id: item.id,
    title: item.title,
    type: item.type,
    year: item.year,
    coverUrl: item.coverUrl,
    artists: item.artists,
    album: item.album,
    durationSeconds: item.durationSeconds,
    trackCount: item.trackCount,
    genres: item.genres,
    description: item.description,
    status: item.status,
    favorite,
    rating: item.rating,
    comments: item.comments
  }
}

const dialogInputClassName =
  'h-11 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3.5 text-sm text-[var(--app-text)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--app-muted)]/70 focus:border-[var(--app-accent-500)] focus:ring-2 focus:ring-[var(--app-accent-500)]/15'

function TrackDialog({
  open,
  item,
  playlists,
  busy,
  onOpenChange,
  onSave,
  onCreatePlaylist,
  onDelete
}: {
  open: boolean
  item: MusicItemRecord | null
  playlists: MusicPlaylistRecord[]
  busy: boolean
  onOpenChange: (open: boolean) => void
  onSave: (draft: TrackDraft) => Promise<void>
  onCreatePlaylist: () => void
  onDelete: (item: MusicItemRecord) => void
}): React.JSX.Element {
  const [draft, setDraft] = useState<TrackDraft>(() => draftFromItem(item, playlists))
  const [error, setError] = useState<string | null>(null)

  function patch(values: Partial<TrackDraft>): void {
    setDraft((current) => ({ ...current, ...values }))
    setError(null)
  }

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()

    if (!draft.title.trim()) {
      setError('Введите название трека')
      return
    }
    if (!draft.artist.trim()) {
      setError('Введите исполнителя')
      return
    }

    const duration = parseDuration(draft.duration)
    if (Number.isNaN(duration)) {
      setError('Длительность укажите в формате 3:45 или числом секунд')
      return
    }

    const parsed = createMusicItemInputSchema.safeParse(itemInputFromDraft(draft, item))
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Проверьте данные формы')
      return
    }

    try {
      await onSave(draft)
    } catch {
      // Глобальная ошибка уже отображается на странице.
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-[91] max-h-[calc(100vh-2rem)] w-[min(720px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface-raised)] shadow-2xl outline-none">
          <form onSubmit={(event) => void submit(event)}>
            <header className="flex items-start justify-between gap-4 border-b border-[var(--app-border)] px-5 py-4">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--app-accent-500)_20%,transparent)] bg-[color-mix(in_srgb,var(--app-accent-500)_10%,transparent)] text-[var(--app-accent-500)]">
                  <Music2 className="size-5" />
                </span>
                <div className="min-w-0">
                  <Dialog.Title className="text-base font-semibold text-[var(--app-text)]">
                    {item ? 'Редактировать трек' : 'Новый трек'}
                  </Dialog.Title>
                  <Dialog.Description className="mt-1 text-xs leading-5 text-[var(--app-muted)]">
                    Только нужные данные — без отдельной страницы и без обложки трека.
                  </Dialog.Description>
                </div>
              </div>
              <Tooltip content="Закрыть" side="top">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    aria-label="Закрыть"
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-control-hover)]"
                  >
                    <X className="size-4" />
                  </button>
                </Dialog.Close>
              </Tooltip>
            </header>

            <div className="space-y-5 p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label>
                  <span className="mb-1.5 block text-xs font-medium text-[var(--app-muted)]">
                    Название *
                  </span>
                  <input
                    value={draft.title}
                    autoFocus
                    placeholder="Blinding Lights"
                    className={dialogInputClassName}
                    onChange={(event) => patch({ title: event.target.value })}
                  />
                </label>
                <label>
                  <span className="mb-1.5 block text-xs font-medium text-[var(--app-muted)]">
                    Исполнитель *
                  </span>
                  <input
                    value={draft.artist}
                    placeholder="The Weeknd"
                    className={dialogInputClassName}
                    onChange={(event) => patch({ artist: event.target.value })}
                  />
                </label>
                <label>
                  <span className="mb-1.5 block text-xs font-medium text-[var(--app-muted)]">
                    Год
                  </span>
                  <input
                    value={draft.year}
                    inputMode="numeric"
                    placeholder="2020"
                    className={dialogInputClassName}
                    onChange={(event) => patch({ year: event.target.value })}
                  />
                </label>
                <label>
                  <span className="mb-1.5 block text-xs font-medium text-[var(--app-muted)]">
                    Длительность
                  </span>
                  <input
                    value={draft.duration}
                    inputMode="numeric"
                    placeholder="3:45"
                    className={dialogInputClassName}
                    onChange={(event) => patch({ duration: event.target.value })}
                  />
                </label>
              </div>

              <button
                type="button"
                aria-pressed={draft.favorite}
                className={
                  draft.favorite
                    ? 'inline-flex h-10 items-center gap-2 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3.5 text-sm font-medium text-rose-200'
                    : 'inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3.5 text-sm font-medium text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'
                }
                onClick={() => patch({ favorite: !draft.favorite })}
              >
                <Heart className={`size-4 ${draft.favorite ? 'fill-current' : ''}`} />
                {draft.favorite ? 'В избранном' : 'Добавить в избранное'}
              </button>

              <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--app-text)]">Плейлисты</h3>
                    <p className="mt-1 text-xs text-[var(--app-muted)]">
                      Необязательно. Можно выбрать сразу несколько.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="inline-flex h-9 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-xs font-medium text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
                    onClick={onCreatePlaylist}
                  >
                    <Plus className="size-3.5" /> Новый плейлист
                  </button>
                </div>

                {playlists.length === 0 ? (
                  <div className="mt-4 rounded-xl border border-dashed border-[var(--app-border)] px-4 py-5 text-center text-xs text-[var(--app-muted)]">
                    Плейлистов пока нет. Трек можно сохранить без них.
                  </div>
                ) : (
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {playlists.map((playlist) => {
                      const checked = draft.playlistIds.includes(playlist.id)
                      return (
                        <label
                          key={playlist.id}
                          className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3.5 text-sm text-[var(--app-text)] hover:bg-[var(--app-control-hover)]"
                        >
                          <Checkbox.Root
                            checked={checked}
                            className="flex size-5 shrink-0 items-center justify-center rounded-md border border-[var(--app-border-strong)] bg-[var(--app-workspace)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent-500)]/35 data-[state=checked]:border-[var(--app-accent-500)] data-[state=checked]:bg-[var(--app-accent-500)]"
                            onCheckedChange={(next) => {
                              patch({
                                playlistIds:
                                  next === true
                                    ? [...draft.playlistIds, playlist.id]
                                    : draft.playlistIds.filter((id) => id !== playlist.id)
                              })
                            }}
                          >
                            <Checkbox.Indicator>
                              <Check className="size-3.5 text-white" />
                            </Checkbox.Indicator>
                          </Checkbox.Root>
                          <span className="truncate">{playlist.name}</span>
                        </label>
                      )
                    })}
                  </div>
                )}
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

            <footer className="flex items-center justify-between gap-3 border-t border-[var(--app-border)] px-5 py-4">
              {item ? (
                <button
                  type="button"
                  disabled={busy}
                  className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                  onClick={() => {
                    onOpenChange(false)
                    onDelete(item)
                  }}
                >
                  <Trash2 className="size-4" /> Удалить
                </button>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-2">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    disabled={busy}
                    className="h-10 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-4 text-sm font-medium text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] disabled:opacity-50"
                  >
                    Отмена
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--app-accent-500)] px-4 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50"
                >
                  {busy ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  Сохранить
                </button>
              </div>
            </footer>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function PlaylistDialog({
  open,
  playlist,
  busy,
  onOpenChange,
  onSave,
  onDelete
}: {
  open: boolean
  playlist: MusicPlaylistRecord | null
  busy: boolean
  onOpenChange: (open: boolean) => void
  onSave: (input: CreateMusicPlaylistInput) => Promise<void>
  onDelete: (playlist: MusicPlaylistRecord) => void
}): React.JSX.Element {
  const [name, setName] = useState(playlist?.name ?? '')
  const [coverUrl, setCoverUrl] = useState(playlist?.coverUrl ?? '')
  const [previewFailed, setPreviewFailed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const parsed = createMusicPlaylistInputSchema.safeParse({
      name: name.trim(),
      coverUrl: coverUrl.trim() || null
    })

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Проверьте данные плейлиста')
      return
    }

    try {
      await onSave(parsed.data)
    } catch {
      // Глобальная ошибка уже отображается на странице.
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[94] bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-[95] w-[min(640px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface-raised)] shadow-2xl outline-none">
          <form onSubmit={(event) => void submit(event)}>
            <header className="flex items-start justify-between gap-4 border-b border-[var(--app-border)] px-5 py-4">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--app-accent-500)_20%,transparent)] bg-[color-mix(in_srgb,var(--app-accent-500)_10%,transparent)] text-[var(--app-accent-500)]">
                  <ListMusic className="size-5" />
                </span>
                <div>
                  <Dialog.Title className="text-base font-semibold text-[var(--app-text)]">
                    {playlist ? 'Редактировать плейлист' : 'Новый плейлист'}
                  </Dialog.Title>
                  <Dialog.Description className="mt-1 text-xs leading-5 text-[var(--app-muted)]">
                    У плейлиста может быть собственная обложка.
                  </Dialog.Description>
                </div>
              </div>
              <Tooltip content="Закрыть" side="top">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    aria-label="Закрыть"
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-control-hover)]"
                  >
                    <X className="size-4" />
                  </button>
                </Dialog.Close>
              </Tooltip>
            </header>

            <div className="grid gap-5 p-5 sm:grid-cols-[minmax(0,1fr)_150px]">
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-[var(--app-muted)]">
                    Название *
                  </span>
                  <input
                    value={name}
                    autoFocus
                    maxLength={120}
                    placeholder="Например, Дорога"
                    className={dialogInputClassName}
                    onChange={(event) => {
                      setName(event.target.value)
                      setError(null)
                    }}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-[var(--app-muted)]">
                    Обложка
                  </span>
                  <input
                    value={coverUrl}
                    aria-label="Обложка плейлиста"
                    placeholder="https://example.com/cover.jpg"
                    className={dialogInputClassName}
                    onChange={(event) => {
                      setCoverUrl(event.target.value)
                      setPreviewFailed(false)
                      setError(null)
                    }}
                  />
                  <p className="mt-1.5 text-[11px] leading-5 text-[var(--app-muted)]">
                    Необязательно. Используйте прямую http/https-ссылку на изображение.
                  </p>
                </label>
              </div>

              <div className="aspect-square overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)]">
                {coverUrl.trim() && !previewFailed ? (
                  <img
                    src={coverUrl.trim()}
                    alt="Предпросмотр обложки плейлиста"
                    className="h-full w-full object-cover"
                    onError={() => setPreviewFailed(true)}
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-[var(--app-muted)]">
                    <ImageIcon className="size-8 opacity-50" />
                    <span className="text-[11px]">Без обложки</span>
                  </div>
                )}
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300 sm:col-span-2"
                >
                  {error}
                </div>
              )}
            </div>

            <footer className="flex items-center justify-between gap-3 border-t border-[var(--app-border)] px-5 py-4">
              {playlist ? (
                <button
                  type="button"
                  disabled={busy}
                  className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                  onClick={() => {
                    onOpenChange(false)
                    onDelete(playlist)
                  }}
                >
                  <Trash2 className="size-4" /> Удалить
                </button>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-2">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    disabled={busy}
                    className="h-10 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-4 text-sm font-medium text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] disabled:opacity-50"
                  >
                    Отмена
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--app-accent-500)] px-4 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50"
                >
                  {busy ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  Сохранить
                </button>
              </div>
            </footer>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function MusicPage({ resourceId, onResourceHandled }: MusicPageProps): React.JSX.Element {
  const [overview, setOverview] = useState<MusicOverview>({ items: [], playlists: [] })
  const [scope, setScope] = useState<MusicLibraryScope>({ kind: 'all' })
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<MusicLibraryFilters>({ artist: 'all', year: 'all' })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MusicItemRecord | null>(null)
  const [playlistDeleteTarget, setPlaylistDeleteTarget] = useState<MusicPlaylistRecord | null>(null)
  const [trackDialogOpen, setTrackDialogOpen] = useState(false)
  const [trackDialogItem, setTrackDialogItem] = useState<MusicItemRecord | null>(null)
  const [playlistDialogOpen, setPlaylistDialogOpen] = useState(false)
  const [playlistDialogItem, setPlaylistDialogItem] = useState<MusicPlaylistRecord | null>(null)

  const refreshOverview = useCallback(async (): Promise<MusicOverview> => {
    const next = await musicClient.listOverview()
    setOverview(next)
    return next
  }, [])

  useEffect(() => {
    let cancelled = false
    queueMicrotask(async () => {
      try {
        const next = await musicClient.listOverview()
        if (!cancelled) setOverview(next)
      } catch (reason) {
        if (!cancelled) setError(errorMessage(reason))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!resourceId) return
    let cancelled = false
    queueMicrotask(async () => {
      try {
        const item = await musicClient.getItem({ id: resourceId })
        if (!cancelled && item) {
          setOverview((current) => ({
            ...current,
            items: current.items.some((entry) => entry.id === item.id)
              ? current.items.map((entry) => (entry.id === item.id ? item : entry))
              : [item, ...current.items]
          }))
          setTrackDialogItem(item)
          setTrackDialogOpen(true)
        }
      } finally {
        if (!cancelled) onResourceHandled?.()
      }
    })
    return () => {
      cancelled = true
    }
  }, [onResourceHandled, resourceId])

  function openNewTrack(): void {
    setTrackDialogItem(null)
    setTrackDialogOpen(true)
  }

  function openTrackEditor(itemId: string): void {
    const item = overview.items.find((entry) => entry.id === itemId)
    if (!item) return
    setTrackDialogItem(item)
    setTrackDialogOpen(true)
  }

  function openNewPlaylist(): void {
    setPlaylistDialogItem(null)
    setPlaylistDialogOpen(true)
  }

  function openPlaylistEditor(playlist: MusicPlaylistRecord): void {
    setPlaylistDialogItem(playlist)
    setPlaylistDialogOpen(true)
  }

  async function toggleFavorite(item: MusicItemRecord): Promise<void> {
    setIsSaving(true)
    setError(null)
    try {
      const saved = await musicClient.updateItem(updateInputWithFavorite(item, !item.favorite))
      setOverview((current) => ({
        ...current,
        items: current.items.map((entry) => (entry.id === saved.id ? saved : entry))
      }))
    } catch (reason) {
      setError(errorMessage(reason))
    } finally {
      setIsSaving(false)
    }
  }

  async function saveTrack(draft: TrackDraft): Promise<void> {
    setIsSaving(true)
    setError(null)
    try {
      const input = itemInputFromDraft(draft, trackDialogItem)
      const parsed = createMusicItemInputSchema.parse(input)
      const saved = trackDialogItem
        ? await musicClient.updateItem({ ...parsed, id: trackDialogItem.id })
        : await musicClient.createItem(parsed)
      await musicClient.setItemPlaylists({ itemId: saved.id, playlistIds: draft.playlistIds })
      await refreshOverview()
      setTrackDialogOpen(false)
      setTrackDialogItem(null)
    } catch (reason) {
      setError(errorMessage(reason))
      throw reason
    } finally {
      setIsSaving(false)
    }
  }

  async function deleteTrack(): Promise<void> {
    if (!deleteTarget) return
    setIsDeleting(true)
    setError(null)
    try {
      await musicClient.deleteItem({ id: deleteTarget.id })
      await refreshOverview()
      setDeleteTarget(null)
    } catch (reason) {
      setError(errorMessage(reason))
    } finally {
      setIsDeleting(false)
    }
  }

  async function savePlaylist(input: CreateMusicPlaylistInput): Promise<void> {
    setIsSaving(true)
    setError(null)
    try {
      const saved = playlistDialogItem
        ? await musicClient.updatePlaylist({ id: playlistDialogItem.id, ...input })
        : await musicClient.createPlaylist(input)
      await refreshOverview()
      if (!playlistDialogItem && !trackDialogOpen) {
        setScope({ kind: 'playlist', playlistId: saved.id })
      }
      setPlaylistDialogOpen(false)
      setPlaylistDialogItem(null)
    } catch (reason) {
      setError(errorMessage(reason))
      throw reason
    } finally {
      setIsSaving(false)
    }
  }

  async function deletePlaylist(): Promise<void> {
    if (!playlistDeleteTarget) return
    setIsDeleting(true)
    setError(null)
    try {
      await musicClient.deletePlaylist({ id: playlistDeleteTarget.id })
      if (scope.kind === 'playlist' && scope.playlistId === playlistDeleteTarget.id) {
        setScope({ kind: 'playlists' })
      }
      await refreshOverview()
      setPlaylistDeleteTarget(null)
      setPlaylistDialogOpen(false)
      setPlaylistDialogItem(null)
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
          <LoaderCircle className="mr-2 size-4 animate-spin" /> Загрузка музыкальной библиотеки…
        </div>
      </StandardModulePage>
    )
  }

  return (
    <StandardModulePage>
      <ModuleHeader
        icon={Disc3}
        title="Музыка"
        description="Сохраняйте любимые треки и собирайте их в плейлисты."
        className="mb-5"
        actions={
          <>
            <button
              type="button"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-4 text-sm font-medium text-[var(--app-text)] transition-colors hover:bg-[var(--app-control-hover)]"
              onClick={openNewPlaylist}
            >
              <ListMusic className="size-4" /> Новый плейлист
            </button>
            <button
              type="button"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--app-accent-500)] px-4 text-sm font-semibold text-white hover:brightness-110"
              onClick={openNewTrack}
            >
              <Plus className="size-4" /> Добавить трек
            </button>
          </>
        }
      >
        <MusicLibraryNavigation
          items={overview.items}
          scope={scope}
          query={query}
          filters={filters}
          onQueryChange={setQuery}
          onScopeChange={setScope}
          onFiltersChange={setFilters}
        />
      </ModuleHeader>

      {error && (
        <div
          role="alert"
          className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          {error}
        </div>
      )}

      <MusicLibraryContent
        overview={overview}
        scope={scope}
        query={query}
        filters={filters}
        isSaving={isSaving}
        onScopeChange={setScope}
        onOpenTrack={openTrackEditor}
        onToggleFavorite={(item) => void toggleFavorite(item)}
        onDeleteTrack={setDeleteTarget}
        onEditPlaylist={openPlaylistEditor}
        onDeletePlaylist={setPlaylistDeleteTarget}
        onCreatePlaylist={openNewPlaylist}
        onAddTrack={openNewTrack}
      />

      <TrackDialog
        key={`track-${trackDialogItem?.id ?? 'new'}-${trackDialogOpen ? 'open' : 'closed'}`}
        open={trackDialogOpen}
        item={trackDialogItem}
        playlists={overview.playlists}
        busy={isSaving}
        onOpenChange={(open) => {
          setTrackDialogOpen(open)
          if (!open) setTrackDialogItem(null)
        }}
        onSave={saveTrack}
        onCreatePlaylist={openNewPlaylist}
        onDelete={setDeleteTarget}
      />

      <PlaylistDialog
        key={`playlist-${playlistDialogItem?.id ?? 'new'}-${playlistDialogOpen ? 'open' : 'closed'}`}
        open={playlistDialogOpen}
        playlist={playlistDialogItem}
        busy={isSaving}
        onOpenChange={(open) => {
          setPlaylistDialogOpen(open)
          if (!open) setPlaylistDialogItem(null)
        }}
        onSave={savePlaylist}
        onDelete={setPlaylistDeleteTarget}
      />

      <DeleteConfirmationDialog
        open={deleteTarget !== null}
        title="Удалить трек?"
        subject={deleteTarget?.title}
        description="Трек будет удалён из библиотеки и всех плейлистов."
        isSubmitting={isDeleting}
        error={error}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        onConfirm={deleteTrack}
      />

      <DeleteConfirmationDialog
        open={playlistDeleteTarget !== null}
        title="Удалить плейлист?"
        subject={playlistDeleteTarget?.name}
        description="Треки останутся в музыкальной библиотеке. Удалится только сам плейлист."
        isSubmitting={isDeleting}
        error={error}
        onOpenChange={(open) => {
          if (!open) setPlaylistDeleteTarget(null)
        }}
        onConfirm={deletePlaylist}
      />
    </StandardModulePage>
  )
}
