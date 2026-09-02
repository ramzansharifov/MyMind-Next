import { Tooltip } from '../../../shared/ui/tooltip'
import * as Tabs from '@radix-ui/react-tabs'
import { ArrowLeft, Heart, ListMusic, Music2, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
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
            <Tooltip content="Очистить поиск" side="top">
              <button
                type="button"
                aria-label="Очистить поиск"
                className="flex size-7 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
                onClick={() => onQueryChange('')}
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </Tooltip>
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

function LibrarySection({
  section,
  title,
  icon,
  backAction,
  toolbar,
  children
}: {
  section: string
  title: string
  icon: React.ReactNode
  backAction?: {
    label: string
    onBack: () => void
  }
  toolbar?: React.ReactNode
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <section
      data-music-library-section={section}
      className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)]"
    >
      <header className="flex min-h-12 items-center gap-3 border-b border-[var(--app-border)] px-5 py-3 max-[620px]:flex-wrap">
        {backAction && (
          <Tooltip content={backAction.label} side="top">
            <button
              type="button"
              aria-label={backAction.label}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-[var(--app-border)] bg-[var(--app-workspace)] text-[var(--app-muted)] outline-none hover:text-[var(--app-text)] focus-visible:ring-2 focus-visible:ring-[var(--app-accent-500)]/35"
              onClick={backAction.onBack}
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
            </button>
          </Tooltip>
        )}
        <span data-music-section-icon className="text-[var(--app-accent-500)]">
          {icon}
        </span>
        <h2 className="min-w-0 truncate text-base font-semibold text-[var(--app-text)]">{title}</h2>
        {toolbar && <div className="ml-auto flex items-center gap-2">{toolbar}</div>}
      </header>
      <div className="p-3">{children}</div>
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
  emptyDescription?: string
  onOpenTrack: (itemId: string) => void
  onToggleFavorite: (item: MusicItemRecord) => void
  onDeleteTrack: (item: MusicItemRecord) => void
  onAddTrack: () => void
}): React.JSX.Element {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Music2 className="size-5" />}
        title={emptyTitle}
        description={emptyDescription}
        actionLabel="Добавить трек"
        onAction={onAddTrack}
      />
    )
  }

  return (
    <div className="grid grid-cols-3 gap-3 max-[960px]:grid-cols-2 max-[620px]:grid-cols-1">
      {items.map((item) => {
        const artist = item.artists[0] || 'Исполнитель не указан'
        const duration = formatDuration(item.durationSeconds)

        return (
          <article
            key={item.id}
            data-music-track-card
            className="group min-w-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-4 transition-colors hover:border-[var(--app-border-strong)] hover:bg-[var(--app-control-hover)]"
          >
            <div className="flex min-w-0 items-start gap-2">
              <button
                type="button"
                aria-label={`Редактировать трек «${item.title}»`}
                className="min-w-0 flex-1 text-left outline-none"
                onClick={() => onOpenTrack(item.id)}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Music2
                    aria-hidden="true"
                    className="size-3.5 shrink-0 text-[var(--app-accent-500)]"
                  />
                  <span className="block truncate text-sm font-semibold text-[var(--app-text)] group-hover:text-[var(--app-accent-500)]">
                    {item.title}
                  </span>
                </span>
                <span className="mt-1 block truncate pl-[22px] text-xs text-[var(--app-muted)]">
                  {artist}
                </span>
                {(item.year !== null || duration) && (
                  <span className="mt-3 flex flex-wrap items-center gap-1.5 pl-[22px] text-[10px] text-[var(--app-muted)]">
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
              </button>

              <div className="flex shrink-0 items-center gap-1">
                <Tooltip
                  content={item.favorite ? 'Убрать из избранного' : 'Добавить в избранное'}
                  side="top"
                >
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
                </Tooltip>
                <Tooltip content={`Удалить трек «${item.title}»`} side="top">
                  <button
                    type="button"
                    aria-label={`Удалить трек «${item.title}»`}
                    className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-red-500/10 hover:text-red-300"
                    onClick={() => onDeleteTrack(item)}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </Tooltip>
              </div>
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
  emptyTitle,
  emptyDescription,
  onOpenPlaylist,
  onEditPlaylist,
  onDeletePlaylist,
  onCreatePlaylist
}: {
  playlists: MusicPlaylistRecord[]
  overview: MusicOverview
  emptyTitle: string
  emptyDescription?: string
  onOpenPlaylist: (playlistId: string) => void
  onEditPlaylist: (playlist: MusicPlaylistRecord) => void
  onDeletePlaylist: (playlist: MusicPlaylistRecord) => void
  onCreatePlaylist: () => void
}): React.JSX.Element {
  if (playlists.length === 0) {
    return (
      <EmptyState
        icon={<ListMusic className="size-5" />}
        title={emptyTitle}
        description={emptyDescription}
        actionLabel="Новый плейлист"
        onAction={onCreatePlaylist}
      />
    )
  }

  return (
    <div className="grid grid-cols-3 gap-3 max-[960px]:grid-cols-2 max-[620px]:grid-cols-1">
      {playlists.map((playlist) => {
        const tracks = playlist.trackIds
          .map((id) => overview.items.find((item) => item.id === id))
          .filter((item): item is MusicItemRecord => Boolean(item))

        return (
          <article
            key={playlist.id}
            className="group flex min-w-0 items-start gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-4 transition-colors hover:border-[var(--app-border-strong)] hover:bg-[var(--app-control-hover)]"
          >
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-3 text-left outline-none"
              onClick={() => onOpenPlaylist(playlist.id)}
            >
              <PlaylistCover playlist={playlist} className="size-12" />
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
              </span>
            </button>

            <div className="flex shrink-0 items-center gap-1">
              <Tooltip content={`Редактировать плейлист «${playlist.name}»`} side="top">
                <button
                  type="button"
                  aria-label={`Редактировать плейлист «${playlist.name}»`}
                  className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]"
                  onClick={() => onEditPlaylist(playlist)}
                >
                  <Pencil className="size-3.5" />
                </button>
              </Tooltip>
              <Tooltip content={`Удалить плейлист «${playlist.name}»`} side="top">
                <button
                  type="button"
                  aria-label={`Удалить плейлист «${playlist.name}»`}
                  className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-red-500/10 hover:text-red-300"
                  onClick={() => onDeletePlaylist(playlist)}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </Tooltip>
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
  description?: string
  actionLabel: string
  onAction: () => void
}): React.JSX.Element {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--app-border)] bg-[var(--app-empty-surface)] px-6 py-6 text-center">
      <span className="flex size-10 items-center justify-center rounded-xl border border-[var(--app-border)] bg-[var(--app-control)] text-[var(--app-accent-500)]">
        {icon}
      </span>
      <h3 className="mt-3 text-sm font-semibold text-[var(--app-text)]">{title}</h3>
      {description && (
        <p className="mt-1 max-w-md text-xs leading-5 text-[var(--app-muted)]">{description}</p>
      )}
      <button
        type="button"
        className="mt-4 inline-flex h-9 items-center gap-2 rounded-xl bg-[var(--app-accent-500)] px-3.5 text-sm font-medium text-white hover:brightness-110"
        onClick={onAction}
      >
        <Plus className="size-3.5" /> {actionLabel}
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
      <LibrarySection
        section="playlists"
        title="Плейлисты"
        icon={<ListMusic aria-hidden="true" className="size-5" />}
      >
        <PlaylistGrid
          playlists={visiblePlaylists}
          overview={overview}
          emptyTitle={search ? 'Ничего не найдено' : 'Плейлистов пока нет'}
          emptyDescription={search ? undefined : 'Создайте первую подборку треков.'}
          onOpenPlaylist={(playlistId) => onScopeChange({ kind: 'playlist', playlistId })}
          onEditPlaylist={onEditPlaylist}
          onDeletePlaylist={onDeletePlaylist}
          onCreatePlaylist={onCreatePlaylist}
        />
      </LibrarySection>
    )
  }

  if (scope.kind === 'playlist') {
    if (!selectedPlaylist) {
      return (
        <EmptyState
          icon={<ListMusic className="size-5" />}
          title="Плейлист не найден"
          actionLabel="К плейлистам"
          onAction={() => onScopeChange({ kind: 'playlists' })}
        />
      )
    }

    return (
      <LibrarySection
        section="playlist"
        title={selectedPlaylist.name}
        icon={<ListMusic aria-hidden="true" className="size-5" />}
        backAction={{
          label: 'К списку плейлистов',
          onBack: () => onScopeChange({ kind: 'playlists' })
        }}
        toolbar={
          <>
            <Tooltip content={`Редактировать плейлист «${selectedPlaylist.name}»`} side="top">
              <button
                type="button"
                aria-label={`Редактировать плейлист «${selectedPlaylist.name}»`}
                className="flex size-8 items-center justify-center rounded-lg border border-[var(--app-border)] bg-[var(--app-workspace)] text-[var(--app-muted)] hover:text-[var(--app-text)]"
                onClick={() => onEditPlaylist(selectedPlaylist)}
              >
                <Pencil className="size-3.5" />
              </button>
            </Tooltip>
            <Tooltip content={`Удалить плейлист «${selectedPlaylist.name}»`} side="top">
              <button
                type="button"
                aria-label={`Удалить плейлист «${selectedPlaylist.name}»`}
                className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-red-500/10 hover:text-red-300"
                onClick={() => onDeletePlaylist(selectedPlaylist)}
              >
                <Trash2 className="size-3.5" />
              </button>
            </Tooltip>
          </>
        }
      >
        <TrackGrid
          items={visibleItems}
          isSaving={isSaving}
          emptyTitle={search ? 'Ничего не найдено' : 'В плейлисте пока нет треков'}
          emptyDescription={search ? undefined : 'Добавьте трек в эту подборку.'}
          onOpenTrack={onOpenTrack}
          onToggleFavorite={onToggleFavorite}
          onDeleteTrack={onDeleteTrack}
          onAddTrack={onAddTrack}
        />
      </LibrarySection>
    )
  }

  const isFavorites = scope.kind === 'favorites'
  return (
    <LibrarySection
      section={isFavorites ? 'favorites' : 'all'}
      title={isFavorites ? 'Избранное' : 'Все треки'}
      icon={
        isFavorites ? (
          <Heart aria-hidden="true" className="size-5" />
        ) : (
          <Music2 aria-hidden="true" className="size-5" />
        )
      }
    >
      <TrackGrid
        items={visibleItems}
        isSaving={isSaving}
        emptyTitle={
          search
            ? 'Ничего не найдено'
            : isFavorites
              ? 'В избранном пока ничего нет'
              : 'Треков пока нет'
        }
        emptyDescription={
          search
            ? undefined
            : isFavorites
              ? 'Отмечайте любимые треки сердцем.'
              : 'Добавьте первый трек в библиотеку.'
        }
        onOpenTrack={onOpenTrack}
        onToggleFavorite={onToggleFavorite}
        onDeleteTrack={onDeleteTrack}
        onAddTrack={onAddTrack}
      />
    </LibrarySection>
  )
}
