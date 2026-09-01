import * as Tabs from '@radix-ui/react-tabs'
import {
  ArrowLeft,
  Heart,
  Image as ImageIcon,
  ListMusic,
  Music2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X
} from 'lucide-react'
import { useMemo, useState } from 'react'

import type {
  MusicItemRecord,
  MusicOverview,
  MusicPlaylistRecord
} from '../../../../../shared/contracts/music'

export type MusicLibraryScope =
  | { kind: 'all' }
  | { kind: 'favorites' }
  | { kind: 'playlists' }
  | { kind: 'playlist'; playlistId: string }

interface MusicLibraryNavigationProps {
  scope: MusicLibraryScope
  query: string
  onQueryChange: (query: string) => void
  onScopeChange: (scope: MusicLibraryScope) => void
}

interface MusicLibraryContentProps {
  overview: MusicOverview
  scope: MusicLibraryScope
  query: string
  isSaving: boolean
  onScopeChange: (scope: MusicLibraryScope) => void
  onOpenTrack: (itemId: string) => void
  onToggleFavorite: (item: MusicItemRecord) => void
  onDeleteTrack: (item: MusicItemRecord) => void
  onEditPlaylist: (playlist: MusicPlaylistRecord) => void
  onDeletePlaylist: (playlist: MusicPlaylistRecord) => void
  onCreatePlaylist: () => void
  onAddTrack: () => void
}

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase('ru-RU')
}

function formatDuration(seconds: number | null): string | null {
  if (seconds === null) return null
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${minutes}:${rest.toString().padStart(2, '0')}`
}

function tabClassName(active: boolean): string {
  return active
    ? 'inline-flex h-9 shrink-0 items-center gap-2 rounded-xl bg-[var(--app-accent-500)] px-3.5 text-sm font-semibold text-white outline-none'
    : 'inline-flex h-9 shrink-0 items-center gap-2 rounded-xl px-3.5 text-sm font-medium text-[var(--app-muted)] outline-none transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] focus-visible:ring-2 focus-visible:ring-[var(--app-accent-500)]/35'
}

export function MusicLibraryNavigation({
  scope,
  query,
  onQueryChange,
  onScopeChange
}: MusicLibraryNavigationProps): React.JSX.Element {
  const section = scope.kind === 'playlist' ? 'playlists' : scope.kind
  const placeholder =
    scope.kind === 'playlists'
      ? 'Найти плейлист'
      : scope.kind === 'playlist'
        ? 'Найти трек в плейлисте'
        : 'Найти по названию или исполнителю'

  return (
    <section
      data-music-library-navigation
      className="mb-5 rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow-card)]"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 max-[920px]:grid-cols-1">
        <label className="flex h-12 min-w-0 items-center gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-4 focus-within:border-[var(--app-accent-500)] focus-within:ring-2 focus-within:ring-[var(--app-accent-500)]/10">
          <Search aria-hidden="true" className="size-4 shrink-0 text-[var(--app-muted)]" />
          <input
            value={query}
            type="search"
            aria-label="Поиск по музыке"
            placeholder={placeholder}
            className="min-w-0 flex-1 bg-transparent text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/65"
            onChange={(event) => onQueryChange(event.target.value)}
          />
          {query && (
            <button
              type="button"
              aria-label="Очистить поиск"
              className="flex size-7 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
              onClick={() => onQueryChange('')}
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          )}
        </label>

        <Tabs.Root
          value={section}
          onValueChange={(value) => {
            if (value === 'all' || value === 'favorites' || value === 'playlists') {
              onQueryChange('')
              onScopeChange({ kind: value })
            }
          }}
        >
          <Tabs.List
            aria-label="Разделы музыки"
            className="flex min-h-12 items-center gap-1 overflow-x-auto rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-1.5"
          >
            <Tabs.Trigger value="all" className={tabClassName(section === 'all')}>
              <Music2 aria-hidden="true" className="size-4" />
              Все треки
            </Tabs.Trigger>
            <Tabs.Trigger value="favorites" className={tabClassName(section === 'favorites')}>
              <Heart aria-hidden="true" className="size-4" />
              Избранное
            </Tabs.Trigger>
            <Tabs.Trigger value="playlists" className={tabClassName(section === 'playlists')}>
              <ListMusic aria-hidden="true" className="size-4" />
              Плейлисты
            </Tabs.Trigger>
          </Tabs.List>
        </Tabs.Root>
      </div>
    </section>
  )
}

function TrackGrid({
  items,
  isSaving,
  emptyTitle,
  emptyDescription,
  onOpenTrack,
  onToggleFavorite,
  onDeleteTrack,
  onAddTrack
}: {
  items: MusicItemRecord[]
  isSaving: boolean
  emptyTitle: string
  emptyDescription: string
  onOpenTrack: (itemId: string) => void
  onToggleFavorite: (item: MusicItemRecord) => void
  onDeleteTrack: (item: MusicItemRecord) => void
  onAddTrack: () => void
}): React.JSX.Element {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Music2 className="size-7" />}
        title={emptyTitle}
        description={emptyDescription}
        actionLabel="Добавить трек"
        onAction={onAddTrack}
      />
    )
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => {
        const artist = item.artists[0] || 'Исполнитель не указан'
        const duration = formatDuration(item.durationSeconds)

        return (
          <article
            key={item.id}
            data-music-track-card
            className="group flex min-w-0 items-start gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-3.5 transition-colors hover:border-[var(--app-border-strong)] hover:bg-[var(--app-control-hover)]"
          >
            <button
              type="button"
              aria-label={`Редактировать трек «${item.title}»`}
              className="flex min-w-0 flex-1 items-start gap-3 text-left outline-none"
              onClick={() => onOpenTrack(item.id)}
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--app-accent-500)_20%,transparent)] bg-[color-mix(in_srgb,var(--app-accent-500)_10%,transparent)] text-[var(--app-accent-500)]">
                <Music2 className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-[var(--app-text)] group-hover:text-[var(--app-accent-500)]">
                  {item.title}
                </span>
                <span className="mt-0.5 block truncate text-xs text-[var(--app-muted)]">
                  {artist}
                </span>
                {(item.year !== null || duration) && (
                  <span className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-[var(--app-muted)]">
                    {item.year !== null && (
                      <span className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-2 py-1">
                        {item.year}
                      </span>
                    )}
                    {duration && (
                      <span className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-2 py-1">
                        {duration}
                      </span>
                    )}
                  </span>
                )}
              </span>
            </button>

            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                aria-label={item.favorite ? 'Убрать из избранного' : 'Добавить в избранное'}
                aria-pressed={item.favorite}
                disabled={isSaving}
                className={
                  item.favorite
                    ? 'flex size-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-300 hover:bg-rose-500/15 disabled:opacity-50'
                    : 'flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] disabled:opacity-50'
                }
                onClick={() => onToggleFavorite(item)}
              >
                <Heart className={`size-3.5 ${item.favorite ? 'fill-current' : ''}`} />
              </button>
              <button
                type="button"
                aria-label={`Удалить трек «${item.title}»`}
                className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-red-500/10 hover:text-red-300"
                onClick={() => onDeleteTrack(item)}
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </article>
        )
      })}
    </div>
  )
}

function PlaylistCover({
  playlist,
  className = 'size-14'
}: {
  playlist: MusicPlaylistRecord
  className?: string
}): React.JSX.Element {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)

  if (!playlist.coverUrl || failedUrl === playlist.coverUrl) {
    return (
      <span
        className={`flex ${className} shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--app-accent-500)_20%,transparent)] bg-[color-mix(in_srgb,var(--app-accent-500)_10%,transparent)] text-[var(--app-accent-500)]`}
      >
        <ListMusic className="size-5" />
      </span>
    )
  }

  return (
    <span
      className={`block ${className} shrink-0 overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)]`}
    >
      <img
        src={playlist.coverUrl}
        alt={`Обложка плейлиста «${playlist.name}»`}
        loading="lazy"
        className="h-full w-full object-cover"
        onError={() => setFailedUrl(playlist.coverUrl)}
      />
    </span>
  )
}

function PlaylistGrid({
  playlists,
  overview,
  onOpenPlaylist,
  onEditPlaylist,
  onDeletePlaylist,
  onCreatePlaylist
}: {
  playlists: MusicPlaylistRecord[]
  overview: MusicOverview
  onOpenPlaylist: (playlistId: string) => void
  onEditPlaylist: (playlist: MusicPlaylistRecord) => void
  onDeletePlaylist: (playlist: MusicPlaylistRecord) => void
  onCreatePlaylist: () => void
}): React.JSX.Element {
  if (playlists.length === 0) {
    return (
      <EmptyState
        icon={<ListMusic className="size-7" />}
        title="Плейлистов пока нет"
        description="Создайте плейлист, чтобы собрать отдельную подборку треков."
        actionLabel="Новый плейлист"
        onAction={onCreatePlaylist}
      />
    )
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {playlists.map((playlist) => {
        const tracks = playlist.trackIds
          .map((id) => overview.items.find((item) => item.id === id))
          .filter((item): item is MusicItemRecord => Boolean(item))

        return (
          <article
            key={playlist.id}
            className="group flex min-w-0 items-start gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-3.5 transition-colors hover:border-[var(--app-border-strong)] hover:bg-[var(--app-control-hover)]"
          >
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-3 text-left outline-none"
              onClick={() => onOpenPlaylist(playlist.id)}
            >
              <PlaylistCover playlist={playlist} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-[var(--app-text)] group-hover:text-[var(--app-accent-500)]">
                  {playlist.name}
                </span>
                <span className="mt-1 block text-xs text-[var(--app-muted)]">
                  {tracks.length}{' '}
                  {tracks.length === 1
                    ? 'трек'
                    : tracks.length >= 2 && tracks.length <= 4
                      ? 'трека'
                      : 'треков'}
                </span>
                <span className="mt-2 inline-flex items-center gap-1 text-[10px] text-[var(--app-muted)]/80">
                  {playlist.coverUrl ? (
                    <>
                      <ImageIcon className="size-3" /> Обложка добавлена
                    </>
                  ) : (
                    'Без обложки'
                  )}
                </span>
              </span>
            </button>

            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                aria-label={`Редактировать плейлист «${playlist.name}»`}
                className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]"
                onClick={() => onEditPlaylist(playlist)}
              >
                <Pencil className="size-3.5" />
              </button>
              <button
                type="button"
                aria-label={`Удалить плейлист «${playlist.name}»`}
                className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-red-500/10 hover:text-red-300"
                onClick={() => onDeletePlaylist(playlist)}
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </article>
        )
      })}
    </div>
  )
}

function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction
}: {
  icon: React.ReactNode
  title: string
  description: string
  actionLabel: string
  onAction: () => void
}): React.JSX.Element {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--app-border)] bg-[var(--app-workspace)] px-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--app-accent-500)_20%,transparent)] bg-[color-mix(in_srgb,var(--app-accent-500)_10%,transparent)] text-[var(--app-accent-500)]">
        {icon}
      </span>
      <h2 className="mt-4 text-base font-semibold text-[var(--app-text)]">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-[var(--app-muted)]">{description}</p>
      <button
        type="button"
        className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--app-accent-500)] px-4 text-sm font-semibold text-white hover:brightness-110"
        onClick={onAction}
      >
        <Plus className="size-4" /> {actionLabel}
      </button>
    </div>
  )
}

export function MusicLibraryContent({
  overview,
  scope,
  query,
  isSaving,
  onScopeChange,
  onOpenTrack,
  onToggleFavorite,
  onDeleteTrack,
  onEditPlaylist,
  onDeletePlaylist,
  onCreatePlaylist,
  onAddTrack
}: MusicLibraryContentProps): React.JSX.Element {
  const search = normalized(query)
  const selectedPlaylist =
    scope.kind === 'playlist'
      ? (overview.playlists.find((playlist) => playlist.id === scope.playlistId) ?? null)
      : null

  const visibleItems = useMemo(() => {
    return overview.items.filter((item) => {
      if (scope.kind === 'favorites' && !item.favorite) return false
      if (scope.kind === 'playlist' && !selectedPlaylist?.trackIds.includes(item.id)) return false
      if (scope.kind === 'playlists') return false
      if (!search) return true
      return [item.title, ...item.artists].join(' ').toLocaleLowerCase('ru-RU').includes(search)
    })
  }, [overview.items, scope.kind, search, selectedPlaylist])

  const visiblePlaylists = useMemo(() => {
    if (scope.kind !== 'playlists') return []
    if (!search) return overview.playlists
    return overview.playlists.filter((playlist) => {
      if (playlist.name.toLocaleLowerCase('ru-RU').includes(search)) return true
      return playlist.trackIds.some((itemId) => {
        const item = overview.items.find((entry) => entry.id === itemId)
        return item
          ? [item.title, ...item.artists].join(' ').toLocaleLowerCase('ru-RU').includes(search)
          : false
      })
    })
  }, [overview.items, overview.playlists, scope.kind, search])

  if (scope.kind === 'playlists') {
    return (
      <section className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-[var(--app-shadow-card)]">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--app-text)]">Плейлисты</h2>
            <p className="mt-1 text-xs text-[var(--app-muted)]">
              Подборки с собственной обложкой. Один трек может быть сразу в нескольких плейлистах.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-xs font-medium text-[var(--app-text)] hover:bg-[var(--app-control-hover)]"
            onClick={onCreatePlaylist}
          >
            <Plus className="size-3.5" /> Новый плейлист
          </button>
        </div>
        <PlaylistGrid
          playlists={visiblePlaylists}
          overview={overview}
          onOpenPlaylist={(playlistId) => onScopeChange({ kind: 'playlist', playlistId })}
          onEditPlaylist={onEditPlaylist}
          onDeletePlaylist={onDeletePlaylist}
          onCreatePlaylist={onCreatePlaylist}
        />
      </section>
    )
  }

  if (scope.kind === 'playlist') {
    if (!selectedPlaylist) {
      return (
        <EmptyState
          icon={<ListMusic className="size-7" />}
          title="Плейлист не найден"
          description="Возможно, он был удалён. Вернитесь к списку плейлистов."
          actionLabel="К плейлистам"
          onAction={() => onScopeChange({ kind: 'playlists' })}
        />
      )
    }

    return (
      <section className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-[var(--app-shadow-card)]">
        <div className="mb-5 flex items-start justify-between gap-4 max-[720px]:flex-col">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="К списку плейлистов"
              className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
              onClick={() => onScopeChange({ kind: 'playlists' })}
            >
              <ArrowLeft className="size-4" />
            </button>
            <PlaylistCover playlist={selectedPlaylist} className="size-16" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold tracking-[0.12em] text-[var(--app-accent-500)] uppercase">
                Плейлист
              </p>
              <h2 className="truncate text-lg font-semibold text-[var(--app-text)]">
                {selectedPlaylist.name}
              </h2>
              <p className="mt-0.5 text-xs text-[var(--app-muted)]">
                {selectedPlaylist.trackIds.length} треков
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              aria-label={`Редактировать плейлист «${selectedPlaylist.name}»`}
              className="flex size-9 items-center justify-center rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
              onClick={() => onEditPlaylist(selectedPlaylist)}
            >
              <Pencil className="size-4" />
            </button>
            <button
              type="button"
              aria-label={`Удалить плейлист «${selectedPlaylist.name}»`}
              className="flex size-9 items-center justify-center rounded-xl border border-red-500/15 bg-red-500/5 text-red-300 hover:bg-red-500/10"
              onClick={() => onDeletePlaylist(selectedPlaylist)}
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>

        <TrackGrid
          items={visibleItems}
          isSaving={isSaving}
          emptyTitle="В плейлисте пока нет треков"
          emptyDescription="Добавьте новый трек или отредактируйте существующий и отметьте этот плейлист."
          onOpenTrack={onOpenTrack}
          onToggleFavorite={onToggleFavorite}
          onDeleteTrack={onDeleteTrack}
          onAddTrack={onAddTrack}
        />
      </section>
    )
  }

  const isFavorites = scope.kind === 'favorites'
  return (
    <section className="rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-[var(--app-shadow-card)]">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-[var(--app-text)]">
          {isFavorites ? 'Избранное' : 'Все треки'}
        </h2>
        <p className="mt-1 text-xs text-[var(--app-muted)]">
          {isFavorites
            ? 'Треки, которые вы отметили сердцем.'
            : 'Все сохранённые треки без лишних обложек и отдельных страниц.'}
        </p>
      </div>
      <TrackGrid
        items={visibleItems}
        isSaving={isSaving}
        emptyTitle={
          isFavorites ? 'В избранном пока ничего нет' : 'Музыкальная библиотека пока пустая'
        }
        emptyDescription={
          search
            ? 'По этому запросу ничего не найдено.'
            : isFavorites
              ? 'Отмечайте любимые треки сердцем — они появятся здесь.'
              : 'Добавьте первый трек через компактное модальное окно.'
        }
        onOpenTrack={onOpenTrack}
        onToggleFavorite={onToggleFavorite}
        onDeleteTrack={onDeleteTrack}
        onAddTrack={onAddTrack}
      />
    </section>
  )
}
