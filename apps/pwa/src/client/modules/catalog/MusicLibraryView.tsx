import { Action, RefreshRegion } from '../../../ui/browser'
import { useState } from 'react'
import type { MusicItemRecord, MusicPlaylistRecord } from '@mymind/contracts/music'
import {
  ArrowLeft,
  Braces,
  Heart,
  ListMusic,
  Music2,
  MoreHorizontal,
  Pencil,
  Trash2,
  type LucideIcon
} from 'lucide-react'
import { ActionMenuDialog } from '../../shared/ui/ActionMenu'
import { EmptyState } from '../../shared/ui/primitives'
import { useTheme } from '../../shared/ui/theme'
import { formatMusicDuration } from './music-presentation'
export type MobileMusicView = 'tracks' | 'favorites' | 'playlists' | 'playlist'
interface MusicLibraryViewProps {
  view: MobileMusicView
  items: MusicItemRecord[]
  playlists: MusicPlaylistRecord[]
  selectedPlaylist: MusicPlaylistRecord | null
  refreshing: boolean
  emptyBecauseFilter: boolean
  onRefresh(): void
  onOpenTrack(item: MusicItemRecord): void
  onViewJson(item: MusicItemRecord): void
  onViewPlaylistJson(playlist: MusicPlaylistRecord): void
  onToggleFavorite(item: MusicItemRecord): void
  onSearchWeb(item: MusicItemRecord): void
  onDeleteTrack(item: MusicItemRecord): void
  onOpenPlaylist(playlist: MusicPlaylistRecord): void
  onEditPlaylist(playlist: MusicPlaylistRecord): void
  onDeletePlaylist(playlist: MusicPlaylistRecord): void
  onBackToPlaylists(): void
}
function IconAction({
  label,
  icon: Icon,
  active = false,
  danger = false,
  onClick
}: {
  label: string
  icon: LucideIcon
  active?: boolean
  danger?: boolean
  onClick(): void
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <Action
      hitPadding={5}
      role={'button'}
      aria-label={label}
      aria-selected={active}
      onClick={onClick}
      style={{
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        backgroundColor: active
          ? danger
            ? theme.error + '14'
            : theme.accent + '14'
          : 'transparent',
        opacity: 1
      }}
      pressedStyle={{
        backgroundColor: active
          ? danger
            ? theme.error + '14'
            : theme.accent + '14'
          : danger
            ? theme.error + '12'
            : theme.surface,
        opacity: 0.72
      }}
    >
      <Icon
        size={15}
        color={danger ? theme.error : active ? theme.accent : theme.muted}
        fill={active && Icon === Heart ? theme.accent : 'none'}
      />
    </Action>
  )
}
function TrackCard({
  item,
  onOpen,
  onViewJson,
  onToggleFavorite,
  onSearchWeb,
  onDelete
}: {
  item: MusicItemRecord
  onOpen(): void
  onViewJson(): void
  onToggleFavorite(): void
  onSearchWeb(): void
  onDelete(): void
}): React.JSX.Element {
  const theme = useTheme()
  const [actionsOpen, setActionsOpen] = useState(false)
  const artist = item.artist
  const duration = formatMusicDuration(item.durationSeconds)
  const details = [artist, item.year !== null ? String(item.year) : '', duration]
    .filter(Boolean)
    .join(' • ')
  return (
    <div
      className="ui-stack"
      style={{
        marginBottom: 10
      }}
    >
      <Action
        role={'button'}
        aria-label={item.title}
        title={'Удерживайте для действий с треком'}
        onHold={() => setActionsOpen(true)}
        holdDelay={380}
        style={{
          minWidth: 0,
          minHeight: 60,
          paddingInline: 14,
          paddingRight: 54,
          paddingBlock: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 16,
          backgroundColor: theme.background,
          opacity: 1
        }}
        pressedStyle={{
          backgroundColor: theme.surface,
          opacity: 0.82
        }}
      >
        <div
          className="ui-stack"
          style={{
            width: 34,
            height: 34,
            flexShrink: 0,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 11,
            backgroundColor: theme.accent + '10'
          }}
        >
          <Music2 size={16} color={theme.accent} />
        </div>

        <div
          className="ui-stack"
          style={{
            minWidth: 0,
            flex: '1 1 0%'
          }}
        >
          <span
            className="ui-text"
            data-lines={1}
            style={{
              fontSize: 14,
              lineHeight: '19px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: 1
            }}
          >
            <span
              className="ui-text"
              style={{
                color: theme.text,
                fontWeight: 700
              }}
            >
              {item.title}
            </span>
            <span
              className="ui-text"
              style={{
                color: theme.muted,
                fontWeight: 500
              }}
            >
              {' '}
              / {artist}
            </span>
          </span>
        </div>
      </Action>
      {
        <div
          className="ui-stack"
          style={{
            position: 'absolute',
            right: 10,
            top: 12
          }}
        >
          <IconAction
            label={`Действия трека «${item.title}»`}
            icon={MoreHorizontal}
            onClick={() => setActionsOpen(true)}
          />
        </div>
      }
      <ActionMenuDialog
        open={actionsOpen}
        onOpenChange={setActionsOpen}
        title={item.title}
        description={details}
        items={[
          {
            key: 'play',
            label: 'Открыть на YouTube',
            icon: 'play',
            onClick: onSearchWeb
          },
          {
            key: 'json',
            label: 'JSON',
            icon: 'json',
            onClick: onViewJson
          },
          {
            key: 'favorite',
            label: item.favorite ? 'Убрать из избранного' : 'Добавить в избранное',
            icon: 'favorite',
            onClick: onToggleFavorite
          },
          {
            key: 'edit',
            label: 'Редактировать',
            icon: 'edit',
            onClick: onOpen
          },
          {
            key: 'delete',
            label: 'Удалить',
            icon: 'delete',
            danger: true,
            onClick: onDelete
          }
        ]}
      />
    </div>
  )
}
function PlaylistCover({ playlist }: { playlist: MusicPlaylistRecord }): React.JSX.Element {
  const theme = useTheme()
  return (
    <div
      className="ui-stack"
      style={{
        width: 48,
        height: 48,
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: playlist.coverUrl ? theme.border : theme.accent + '33',
        borderRadius: 12,
        backgroundColor: playlist.coverUrl ? theme.background : theme.accent + '12'
      }}
    >
      {playlist.coverUrl ? (
        <img
          src={playlist.coverUrl}
          style={{
            width: 48,
            height: 48,
            objectFit: 'cover'
          }}
          alt=""
          draggable="false"
        ></img>
      ) : (
        <ListMusic size={20} color={theme.accent} />
      )}
    </div>
  )
}
function PlaylistCard({
  playlist,
  onOpen,
  onViewJson,
  onEdit,
  onDelete
}: {
  playlist: MusicPlaylistRecord
  onOpen(): void
  onViewJson(): void
  onEdit(): void
  onDelete(): void
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <div
      className="ui-stack"
      style={{
        marginBottom: 10,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 16,
        backgroundColor: theme.background
      }}
    >
      <Action
        role={'button'}
        aria-label={`Открыть плейлист «${playlist.name}»`}
        onClick={onOpen}
        style={{
          minWidth: 0,
          flex: '1 1 0%',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          opacity: 1
        }}
        pressedStyle={{
          opacity: 0.72
        }}
      >
        <PlaylistCover playlist={playlist} />
        <div
          className="ui-stack"
          style={{
            minWidth: 0,
            flex: '1 1 0%'
          }}
        >
          <span
            className="ui-text"
            data-lines={1}
            style={{
              color: theme.text,
              fontSize: 14,
              fontWeight: 700,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: 1
            }}
          >
            {playlist.name}
          </span>
          <span
            className="ui-text"
            style={{
              marginTop: 4,
              color: theme.muted,
              fontSize: 12
            }}
          >
            {playlist.trackIds.length} треков
          </span>
        </div>
      </Action>
      <div
        className="ui-stack"
        style={{
          flexDirection: 'row',
          gap: 1
        }}
      >
        <IconAction
          label={`JSON плейлиста «${playlist.name}»`}
          icon={Braces}
          onClick={onViewJson}
        />
        <IconAction label={`Изменить плейлист «${playlist.name}»`} icon={Pencil} onClick={onEdit} />
        <IconAction
          label={`Удалить плейлист «${playlist.name}»`}
          icon={Trash2}
          danger
          onClick={onDelete}
        />
      </div>
    </div>
  )
}
function PlaylistHeader({
  selectedPlaylist,
  onBackToPlaylists,
  onViewJson,
  onEditPlaylist,
  onDeletePlaylist
}: {
  selectedPlaylist: MusicPlaylistRecord
  onBackToPlaylists(): void
  onViewJson(playlist: MusicPlaylistRecord): void
  onEditPlaylist(playlist: MusicPlaylistRecord): void
  onDeletePlaylist(playlist: MusicPlaylistRecord): void
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <div
      className="ui-stack"
      style={{
        minHeight: 52,
        marginBottom: 10,
        paddingInline: 12,
        paddingBlock: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 16,
        backgroundColor: theme.surface
      }}
    >
      <IconAction label="К списку плейлистов" icon={ArrowLeft} onClick={onBackToPlaylists} />
      <ListMusic size={18} color={theme.accent} />
      <span
        className="ui-text"
        data-lines={1}
        style={{
          minWidth: 0,
          flex: '1 1 0%',
          color: theme.text,
          fontSize: 15,
          fontWeight: 700,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: 1
        }}
      >
        {selectedPlaylist.name}
      </span>
      <div
        className="ui-stack"
        style={{
          flexDirection: 'row',
          gap: 1
        }}
      >
        <IconAction
          label={`JSON плейлиста «${selectedPlaylist.name}»`}
          icon={Braces}
          onClick={() => onViewJson(selectedPlaylist)}
        />
        <IconAction
          label={`Редактировать плейлист «${selectedPlaylist.name}»`}
          icon={Pencil}
          onClick={() => onEditPlaylist(selectedPlaylist)}
        />
        <IconAction
          label={`Удалить плейлист «${selectedPlaylist.name}»`}
          icon={Trash2}
          danger
          onClick={() => onDeletePlaylist(selectedPlaylist)}
        />
      </div>
    </div>
  )
}
export function MusicLibraryView({
  view,
  items,
  playlists,
  selectedPlaylist,
  refreshing,
  emptyBecauseFilter,
  onRefresh,
  onOpenTrack,
  onViewJson,
  onViewPlaylistJson,
  onToggleFavorite,
  onSearchWeb,
  onDeleteTrack,
  onOpenPlaylist,
  onEditPlaylist,
  onDeletePlaylist,
  onBackToPlaylists
}: MusicLibraryViewProps): React.JSX.Element {
  const emptyText = emptyBecauseFilter
    ? 'Ничего не найдено.'
    : view === 'favorites'
      ? 'В избранном пока ничего нет.'
      : view === 'playlists'
        ? 'Плейлистов пока нет.'
        : view === 'playlist'
          ? 'В этом плейлисте пока нет треков.'
          : 'Треков пока нет.'
  const header =
    view === 'playlist' && selectedPlaylist ? (
      <PlaylistHeader
        selectedPlaylist={selectedPlaylist}
        onBackToPlaylists={onBackToPlaylists}
        onViewJson={onViewPlaylistJson}
        onEditPlaylist={onEditPlaylist}
        onDeletePlaylist={onDeletePlaylist}
      />
    ) : null
  if (view === 'playlists') {
    return (
      <RefreshRegion className="ui-scroll" onRefresh={onRefresh} busy={refreshing}>
        <div
          className="ui-stack ui-scroll-content"
          style={{
            paddingBottom: 96
          }}
        >
          {header}
          <div className="ui-stack ui-list" style={{}}>
            {playlists.length > 0 ? (
              playlists.map((item) => {
                const playlist = item
                return (
                  <div className="ui-stack ui-list-item" key={((playlist) => playlist.id)(item)}>
                    {
                      <PlaylistCard
                        playlist={playlist}
                        onOpen={() => onOpenPlaylist(playlist)}
                        onViewJson={() => onViewPlaylistJson(playlist)}
                        onEdit={() => onEditPlaylist(playlist)}
                        onDelete={() => onDeletePlaylist(playlist)}
                      />
                    }
                  </div>
                )
              })
            ) : (
              <EmptyState text={emptyText} />
            )}
          </div>
        </div>
      </RefreshRegion>
    )
  }
  return (
    <RefreshRegion className="ui-scroll" onRefresh={onRefresh} busy={refreshing}>
      <div
        className="ui-stack ui-scroll-content"
        style={{
          paddingBottom: 96
        }}
      >
        {header}
        <div className="ui-stack ui-list" style={{}}>
          {items.length > 0 ? (
            items.map((item) => (
              <div className="ui-stack ui-list-item" key={((item) => item.id)(item)}>
                {
                  <TrackCard
                    item={item}
                    onOpen={() => onOpenTrack(item)}
                    onViewJson={() => onViewJson(item)}
                    onToggleFavorite={() => onToggleFavorite(item)}
                    onSearchWeb={() => onSearchWeb(item)}
                    onDelete={() => onDeleteTrack(item)}
                  />
                }
              </div>
            ))
          ) : (
            <EmptyState text={emptyText} />
          )}
        </div>
      </div>
    </RefreshRegion>
  )
}
