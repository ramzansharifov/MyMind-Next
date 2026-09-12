import { FlatList, Image, Pressable, Text, View } from 'react-native'
import type { MusicItemRecord, MusicPlaylistRecord } from '@mymind/contracts/music'
import {
  ArrowLeft,
  Heart,
  ListMusic,
  Music2,
  Pencil,
  Play,
  Trash2,
  type LucideIcon
} from 'lucide-react-native'

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

function MetaBadge({ value }: { value: string }): React.JSX.Element {
  const theme = useTheme()
  return (
    <View
      style={{
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.surface,
        paddingHorizontal: 8,
        paddingVertical: 4
      }}
    >
      <Text style={{ color: theme.muted, fontSize: 10.5 }}>{value}</Text>
    </View>
  )
}

function TrackCard({
  item,
  onOpen,
  onToggleFavorite,
  onSearchWeb,
  onDelete
}: {
  item: MusicItemRecord
  onOpen(): void
  onToggleFavorite(): void
  onSearchWeb(): void
  onDelete(): void
}): React.JSX.Element {
  const theme = useTheme()
  const artist = item.artists[0] || 'Исполнитель не указан'
  const duration = formatMusicDuration(item.durationSeconds)

  return (
    <View
      style={{
        minWidth: 0,
        marginBottom: 10,
        padding: 16,
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 16,
        backgroundColor: theme.background
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Редактировать трек «${item.title}»`}
          onPress={onOpen}
          style={({ pressed }) => ({
            flex: 1,
            minWidth: 0,
            opacity: pressed ? 0.72 : 1
          })}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Music2 size={14} color={theme.accent} />
            <Text
              numberOfLines={1}
              style={{ flex: 1, color: theme.text, fontSize: 14, fontWeight: '700' }}
            >
              {item.title}
            </Text>
          </View>
          <Text
            numberOfLines={1}
            style={{ marginTop: 4, paddingLeft: 22, color: theme.muted, fontSize: 12 }}
          >
            {artist}
          </Text>
          {item.year !== null || duration ? (
            <View
              style={{
                marginTop: 12,
                paddingLeft: 22,
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 6
              }}
            >
              {item.year !== null ? <MetaBadge value={String(item.year)} /> : null}
              {duration ? <MetaBadge value={duration} /> : null}
            </View>
          ) : null}
        </Pressable>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
          <IconAction label={`Найти «${item.title}»`} icon={Play} onPress={onSearchWeb} />
          <IconAction label={`Редактировать «${item.title}»`} icon={Pencil} onPress={onOpen} />
          <IconAction label={`Удалить «${item.title}»`} icon={Trash2} danger onPress={onDelete} />
          <IconAction
            label={item.favorite ? 'Убрать из избранного' : 'Добавить в избранное'}
            icon={Heart}
            active={item.favorite}
            onPress={onToggleFavorite}
          />
        </View>
      </View>
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
        <Image source={{ uri: playlist.coverUrl }} resizeMode="cover" style={{ width: 48, height: 48 }} />
      ) : (
        <ListMusic size={20} color={theme.accent} />
      )}
    </View>
  )
}

function PlaylistCard({
  playlist,
  onOpen,
  onEdit,
  onDelete
}: {
  playlist: MusicPlaylistRecord
  onOpen(): void
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

function SectionHeader({
  view,
  selectedPlaylist,
  onBackToPlaylists,
  onEditPlaylist,
  onDeletePlaylist
}: {
  view: MobileMusicView
  selectedPlaylist: MusicPlaylistRecord | null
  onBackToPlaylists(): void
  onEditPlaylist(playlist: MusicPlaylistRecord): void
  onDeletePlaylist(playlist: MusicPlaylistRecord): void
}): React.JSX.Element {
  const theme = useTheme()
  const isFavorites = view === 'favorites'
  const isPlaylists = view === 'playlists' || view === 'playlist'
  const title =
    view === 'favorites'
      ? 'Избранное'
      : view === 'playlists'
        ? 'Плейлисты'
        : view === 'playlist'
          ? (selectedPlaylist?.name ?? 'Плейлист')
          : 'Все треки'
  const Icon = isFavorites ? Heart : isPlaylists ? ListMusic : Music2

  return (
    <View
      style={{
        minHeight: 52,
        marginBottom: 10,
        paddingHorizontal: 16,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 16,
        backgroundColor: theme.surface
      }}
    >
      {view === 'playlist' ? (
        <IconAction label="К списку плейлистов" icon={ArrowLeft} onPress={onBackToPlaylists} />
      ) : null}
      <Icon size={19} color={theme.accent} />
      <Text numberOfLines={1} style={{ minWidth: 0, flex: 1, color: theme.text, fontSize: 16, fontWeight: '700' }}>
        {title}
      </Text>
      {view === 'playlist' && selectedPlaylist ? (
        <View style={{ flexDirection: 'row', gap: 1 }}>
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
      ) : null}
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

  const header = (
    <SectionHeader
      view={view}
      selectedPlaylist={selectedPlaylist}
      onBackToPlaylists={onBackToPlaylists}
      onEditPlaylist={onEditPlaylist}
      onDeletePlaylist={onDeletePlaylist}
    />
  )

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
          onToggleFavorite={() => onToggleFavorite(item)}
          onSearchWeb={() => onSearchWeb(item)}
          onDelete={() => onDeleteTrack(item)}
        />
      )}
    />
  )
}
