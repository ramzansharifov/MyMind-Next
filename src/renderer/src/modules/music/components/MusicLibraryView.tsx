import * as Tabs from '@radix-ui/react-tabs'
import {
  ArrowLeft,
  Heart,
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
  )
}

function TrackArtwork({ item }: { item: MusicItemRecord }): React.JSX.Element {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)

  if (!item.coverUrl || failedUrl === item.coverUrl) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[var(--app-control)] text-[var(--app-muted)]">
        <Music2 className="size-9 opacity-45" />
      </div>
    )
  }

  return (
    <img
      src={item.coverUrl}
      alt={`Обложка «${item.title}»`}
      loading="lazy"
      className="h-full w-full object-cover"
      onError={() => setFailedUrl(item.coverUrl)}
    />
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
    <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-4 sm:grid-cols-[repeat(auto-fill,minmax(205px,1fr))]">
      {items.map((item) => {
        const artist = item.artists[0] || 'Исполнитель не указан'
        const duration = formatDuration(item.durationSeconds)
        return (
          <article
            key={item.id}
            className="group min-w-0 overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[var(--app-shadow-card)]"
          >
            <div className="relative aspect-square overflow-hidden bg-[var(--app-workspace)]">
              <TrackArtwork item={item} />
              <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/55 p-1 backdrop-blur-md">
                <button
                  type="button"
                  aria-label={item.favorite ? 'Убрать из избранного' : 'Добавить в избранное'}
                  aria-pressed={item.favorite}
                  disabled={isSaving}
                  className={
                    item.favorite
                      ? 'flex size-8 items-center justify-center rounded-lg text-rose-300 hover:bg-white/10 disabled:opacity-50'
                      : 'flex size-8 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-50'
                  }
                  onClick={() => onToggleFavorite(item)}
                >
                  <Heart className={`size-4 ${item.favorite ? 'fill-current' : ''}`} />
                </button>
                <button
                  type="button"
                  aria-label={`Редактировать трек «${item.title}»`}
                  className="flex size-8 items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white"
                  onClick={() => onOpenTrack(item.id)}
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label={`Удалить трек «${item.title}»`}
                  className="flex size-8 items-center justify-center rounded-lg text-red-300/90 hover:bg-red-500/15 hover:text-red-200"
                  onClick={() => onDeleteTrack(item)}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>

            <button
              type="button"
              className="block w-full min-w-0 px-3.5 py-3 text-left outline-none transition-colors hover:bg-[var(--app-control-hover)] focus-visible:ring-2 focus-visible:ring-[var(--app-accent-500)] focus-visible:ring-inset"
              onClick={() => onOpenTrack(item.id)}
            >
              <span className="block truncate text-sm font-semibold text-[var(--app-text)] group-hover:text-[var(--app-accent-500)]">
                {item.title}
              </span>
              <span className="mt-0.5 block truncate text-xs text-[var(--app-muted)]">{artist}</span>
              {(item.year !== null || duration) && (
                <span className="mt-1.5 flex items-center gap-2 text-[10px] text-[var(--app-muted)]/80">
                  {item.year !== null && <span>{item.year}</span>}
                  {item.year !== null && duration && <span>•</span>}
                  {duration && <span>{duration}</span>}
                </span>
              )}
            </button>
          </article>
        )
      })}
    </div>
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
        description="Создайте плейлист, если хотите собрать отдельную подборку. Это необязательно."
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
        const preview = tracks.slice(0, 4)

        return (
          <article
            key={playlist.id}
            className="group rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow-card)] transition-colors hover:border-[var(--app-border-strong)]"
          >
            <div className="flex items-start justify-between gap-3">
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-3 text-left outline-none"
                onClick={() => onOpenPlaylist(playlist.id)}
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--app-accent-500)_20%,transparent)] bg-[color-mix(in_srgb,var(--app-accent-500)_10%,transparent)] text-[var(--app-accent-500)]">
                  <ListMusic className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-[var(--app-text)] group-hover:text-[var(--app-accent-500)]">
                    {playlist.name}
                  </span>
                  <span className="mt-0.5 block text-xs text-[var(--app-muted)]">
                    {tracks.length} {tracks.length === 1 ? 'трек' : tracks.length >= 2 && tracks.length <= 4 ? 'трека' : 'треков'}
                  </span>
                </span>
              </button>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  aria-label={`Редактировать плейлист «${playlist.name}»`}
                  className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
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
            </div>

            <button
              type="button"
              className="mt-4 grid h-20 w-full grid-cols-4 gap-1 overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-1 outline-none"
              onClick={() => onOpenPlaylist(playlist.id)}
            >
              {preview.length > 0 ? (
                preview.map((item) => (
                  <span key={item.id} className="min-w-0 overflow-hidden rounded-lg">
                    <TrackArtwork item={item} />
                  </span>
                ))
              ) : (
                <span className="col-span-4 flex h-full items-center justify-center text-xs text-[var(--app-muted)]">
                  Плейлист пуст
                </span>
              )}
              {preview.length > 0 && preview.length < 4 &&
                Array.from({ length: 4 - preview.length }).map((_, index) => (
                  <span key={`empty-${index}`} className="rounded-lg bg-[var(--app-control)]" />
                ))}
            </button>
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
    <div className="flex min-h-72 flex-col items-center justify-center rounded-[24px] border border-dashed border-[var(--app-border)] bg-[var(--app-surface)] px-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--app-accent-500)_20%,transparent)] bg-[color-mix(in_srgb,var(--app-accent-500)_10%,transparent)] text-[var(--app-accent-500)]">
        {icon}
      </span>
      <h2 className="mt-4 text-lg font-semibold text-[var(--app-text)]">{title}</h2>
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
              Отдельные подборки. Трек может находиться сразу в нескольких плейлистах.
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
        <div className="mb-5 flex items-center justify-between gap-4 max-[720px]:items-start">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="К списку плейлистов"
              className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
              onClick={() => onScopeChange({ kind: 'playlists' })}
            >
              <ArrowLeft className="size-4" />
            </button>
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
          emptyDescription="Добавьте трек и выберите этот плейлист в форме трека."
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
            : 'Вся музыка в вашей локальной библиотеке.'}
        </p>
      </div>
      <TrackGrid
        items={visibleItems}
        isSaving={isSaving}
        emptyTitle={isFavorites ? 'В избранном пока ничего нет' : 'Музыкальная библиотека пока пустая'}
        emptyDescription={
          search
            ? 'По этому запросу ничего не найдено.'
            : isFavorites
              ? 'Отмечайте любимые треки сердцем — они появятся здесь.'
              : 'Добавьте первый трек. Плейлисты можно создавать только если они вам нужны.'
        }
        onOpenTrack={onOpenTrack}
        onToggleFavorite={onToggleFavorite}
        onDeleteTrack={onDeleteTrack}
        onAddTrack={onAddTrack}
      />
    </section>
  )
}
