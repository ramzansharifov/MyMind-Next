import { useState } from 'react'
import { FlatList, Image, Pressable, Text, View } from 'react-native'
import { musicItemArtist, type MusicItemRecord, type MusicPlaylistRecord } from '@mymind/contracts/music'
import {
  ArrowLeft,
  Braces,
  Heart,
  ListMusic,
  Music2,
  Pencil,
  Trash2,
  type LucideIcon
} from 'lucide-react-native'

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
  onPress
}: {
  label: string
  icon: LucideIcon
  active?: boolean
  danger?: boolean
  onPress(): void
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      hitSlop={5}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        backgroundColor: active
          ? danger
            ? theme.error + '14'
            : theme.accent + '14'
          : pressed
            ? danger
              ? theme.error + '12'
              : theme.surface
            : 'transparent',
        opacity: pressed ? 0.72 : 1
      })}
    >
      <Icon
        size={15}
        color={danger ? theme.error : active ? theme.accent : theme.muted}
        fill={active && Icon === Heart ? theme.accent : 'none'}
      />
    </Pressable>
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
  const artist = musicItemArtist(item)
  const duration = formatMusicDuration(item.durationSeconds)
  const details = [artist, item.year !== null ? String(item.year) : '', duration]
    .filter(Boolean)
    .join(' • ')

  return (
    <View style={{ marginBottom: 10 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={item.title}
        accessibilityHint="Удерживайте для действий с треком"
        onLongPress={() => setActionsOpen(true)}
        delayLongPress={380}
        style={({ pressed }) => ({
          minWidth: 0,
          minHeight: 60,
          paddingHorizontal: 14,
          paddingVertical: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 16,
          backgroundColor: pressed ? theme.surface : theme.background,
          opacity: pressed ? 0.82 : 1
        })}
      >
        <View
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
        </View>

        <View style={{ minWidth: 0, flex: 1 }}>
          <Text numberOfLines={1} style={{ fontSize: 14, lineHeight: 19 }}>
            <Text style={{ color: theme.text, fontWeight: '700' }}>{item.title}</Text>
            <Text style={{ color: theme.muted, fontWeight: '500' }}> / {artist}</Text>
          </Text>
        </View>
      </Pressable>
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
            onPress: onSearchWeb
          },
          {
            key: 'json',
            label: 'JSON',
            icon: 'json',
            onPress: onViewJson
          },
          {
            key: 'favorite',
            label: item.favorite ? 'Убрать из избранного' : 'Добавить в избранное',
            icon: 'favorite',
            onPress: onToggleFavorite
          },
          {
            key: 'edit',
            label: 'Редактировать',
            icon: 'edit',
            onPress: onOpen
          },
          {
            key: 'delete',
            label: 'Удалить',
            icon: 'delete',
            danger: true,
            onPress: onDelete
          }
        ]}
      />
    </View>
  )
}

function PlaylistCover({ playlist }: { playlist: MusicPlaylistRecord }): React.JSX.Element {
  const theme = useTheme()
  return (
    <View
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
        <Image
          source={{ uri: playlist.coverUrl }}
          resizeMode="cover"
          style={{ width: 48, height: 48 }}
        />
      ) : (
        <ListMusic size={20} color={theme.accent} />
      )}
    </View>
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
    <View
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Открыть плейлист «${playlist.name}»`}
        onPress={onOpen}
        style={({ pressed }) => ({
          minWidth: 0,
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          opacity: pressed ? 0.72 : 1
        })}
      >
        <PlaylistCover playlist={playlist} />
        <View style={{ minWidth: 0, flex: 1 }}>
          <Text numberOfLines={1} style={{ color: theme.text, fontSize: 14, fontWeight: '700' }}>
            {playlist.name}
          </Text>
          <Text style={{ marginTop: 4, color: theme.muted, fontSize: 12 }}>
            {playlist.trackIds.length} треков
          </Text>
        </View>
      </Pressable>
      <View style={{ flexDirection: 'row', gap: 1 }}>
        <IconAction
          label={`JSON плейлиста «${playlist.name}»`}
          icon={Braces}
          onPress={onViewJson}
        />
        <IconAction label={`Изменить плейлист «${playlist.name}»`} icon={Pencil} onPress={onEdit} />
        <IconAction
          label={`Удалить плейлист «${playlist.name}»`}
          icon={Trash2}
          danger
          onPress={onDelete}
        />
      </View>
    </View>
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
    <View
      style={{
        minHeight: 52,
        marginBottom: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 16,
        backgroundColor: theme.surface
      }}
    >
      <IconAction label="К списку плейлистов" icon={ArrowLeft} onPress={onBackToPlaylists} />
      <ListMusic size={18} color={theme.accent} />
      <Text
        numberOfLines={1}
        style={{ minWidth: 0, flex: 1, color: theme.text, fontSize: 15, fontWeight: '700' }}
      >
        {selectedPlaylist.name}
      </Text>
      <View style={{ flexDirection: 'row', gap: 1 }}>
        <IconAction
          label={`JSON плейлиста «${selectedPlaylist.name}»`}
          icon={Braces}
          onPress={() => onViewJson(selectedPlaylist)}
        />
        <IconAction
          label={`Редактировать плейлист «${selectedPlaylist.name}»`}
          icon={Pencil}
          onPress={() => onEditPlaylist(selectedPlaylist)}
        />
        <IconAction
          label={`Удалить плейлист «${selectedPlaylist.name}»`}
          icon={Trash2}
          danger
          onPress={() => onDeletePlaylist(selectedPlaylist)}
        />
      </View>
    </View>
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
      <FlatList<MusicPlaylistRecord>
        data={playlists}
        keyExtractor={(playlist) => playlist.id}
        onRefresh={onRefresh}
        refreshing={refreshing}
        contentContainerStyle={{ paddingBottom: 96 }}
        ListHeaderComponent={header}
        ListEmptyComponent={<EmptyState text={emptyText} />}
        renderItem={({ item: playlist }) => (
          <PlaylistCard
            playlist={playlist}
            onOpen={() => onOpenPlaylist(playlist)}
            onViewJson={() => onViewPlaylistJson(playlist)}
            onEdit={() => onEditPlaylist(playlist)}
            onDelete={() => onDeletePlaylist(playlist)}
          />
        )}
      />
    )
  }

  return (
    <FlatList<MusicItemRecord>
      data={items}
      keyExtractor={(item) => item.id}
      onRefresh={onRefresh}
      refreshing={refreshing}
      contentContainerStyle={{ paddingBottom: 96 }}
      ListHeaderComponent={header}
      ListEmptyComponent={<EmptyState text={emptyText} />}
      renderItem={({ item }) => (
        <TrackCard
          item={item}
          onOpen={() => onOpenTrack(item)}
          onViewJson={() => onViewJson(item)}
          onToggleFavorite={() => onToggleFavorite(item)}
          onSearchWeb={() => onSearchWeb(item)}
          onDelete={() => onDeleteTrack(item)}
        />
      )}
    />
  )
}
