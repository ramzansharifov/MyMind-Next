import { FlatList, Image, Pressable, Text, View } from 'react-native'
import type { MusicItemRecord, MusicPlaylistRecord } from '@mymind/contracts/music'
import { Button, EmptyState } from '../../shared/ui/primitives'
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
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.surface,
        padding: 14,
        gap: 12,
        marginBottom: 10
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Редактировать трек ${item.title}`}
        onPress={onOpen}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, gap: 5 })}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: theme.text, fontSize: 16, fontWeight: '800' }}>{item.title}</Text>
            <Text style={{ color: theme.muted, fontSize: 13, marginTop: 3 }} numberOfLines={1}>
              {artist}
            </Text>
          </View>
          {item.favorite ? (
            <Text accessibilityLabel="В избранном" style={{ color: theme.accent, fontSize: 19 }}>
              ♥
            </Text>
          ) : null}
        </View>

        {item.year !== null || duration ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 7 }}>
            {item.year !== null ? <MetaBadge value={String(item.year)} /> : null}
            {duration ? <MetaBadge value={duration} /> : null}
          </View>
        ) : null}
      </Pressable>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Button
          label={item.favorite ? '♥ Избранное' : '♡ Избранное'}
          selected={item.favorite}
          onPress={onToggleFavorite}
        />
        <Button label="Послушать" onPress={onSearchWeb} />
        <Button label="Изменить" onPress={onOpen} />
        <Button label="Удалить" danger onPress={onDelete} />
      </View>
    </View>
  )
}

function MetaBadge({ value }: { value: string }): React.JSX.Element {
  const theme = useTheme()
  return (
    <View
      style={{
        borderRadius: 9,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.raised,
        paddingHorizontal: 9,
        paddingVertical: 5
      }}
    >
      <Text style={{ color: theme.muted, fontSize: 11, fontWeight: '600' }}>{value}</Text>
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
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.surface,
        padding: 12,
        gap: 10,
        marginBottom: 10
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Открыть плейлист ${playlist.name}`}
        onPress={onOpen}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          opacity: pressed ? 0.7 : 1
        })}
      >
        <View
          style={{
            width: 54,
            height: 54,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.raised,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {playlist.coverUrl ? (
            <Image
              source={{ uri: playlist.coverUrl }}
              resizeMode="cover"
              style={{ width: '100%', height: '100%' }}
            />
          ) : (
            <Text style={{ color: theme.accent, fontSize: 22, fontWeight: '800' }}>♫</Text>
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: '800' }} numberOfLines={1}>
            {playlist.name}
          </Text>
          <Text style={{ color: theme.muted, fontSize: 13, marginTop: 4 }}>
            {playlist.trackIds.length} треков
          </Text>
        </View>
      </Pressable>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Button label="Открыть" onPress={onOpen} />
        <Button label="Изменить" onPress={onEdit} />
        <Button label="Удалить" danger onPress={onDelete} />
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
  const title =
    view === 'favorites'
      ? 'Избранное'
      : view === 'playlists'
        ? 'Плейлисты'
        : view === 'playlist'
          ? (selectedPlaylist?.name ?? 'Плейлист')
          : 'Все треки'

  return (
    <View
      style={{
        borderRadius: 15,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.surface,
        padding: 12,
        marginBottom: 10,
        gap: 9
      }}
    >
      <Text style={{ color: theme.text, fontSize: 17, fontWeight: '800' }}>{title}</Text>
      {view === 'playlist' && selectedPlaylist ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button label="← Плейлисты" onPress={onBackToPlaylists} />
          <Button label="Изменить" onPress={() => onEditPlaylist(selectedPlaylist)} />
          <Button label="Удалить" danger onPress={() => onDeletePlaylist(selectedPlaylist)} />
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
  const playlistMode = view === 'playlists'
  const emptyText = emptyBecauseFilter
    ? 'Ничего не найдено.'
    : view === 'favorites'
      ? 'В избранном пока ничего нет.'
      : view === 'playlists'
        ? 'Плейлистов пока нет.'
        : view === 'playlist'
          ? 'В этом плейлисте пока нет треков.'
          : 'Треков пока нет.'

  return (
    <FlatList
      data={playlistMode ? playlists : items}
      keyExtractor={(item) => item.id}
      onRefresh={onRefresh}
      refreshing={refreshing}
      contentContainerStyle={{ paddingBottom: 24 }}
      ListHeaderComponent={
        <SectionHeader
          view={view}
          selectedPlaylist={selectedPlaylist}
          onBackToPlaylists={onBackToPlaylists}
          onEditPlaylist={onEditPlaylist}
          onDeletePlaylist={onDeletePlaylist}
        />
      }
      ListEmptyComponent={<EmptyState text={emptyText} />}
      renderItem={({ item }) =>
        playlistMode ? (
          <PlaylistCard
            playlist={item as MusicPlaylistRecord}
            onOpen={() => onOpenPlaylist(item as MusicPlaylistRecord)}
            onEdit={() => onEditPlaylist(item as MusicPlaylistRecord)}
            onDelete={() => onDeletePlaylist(item as MusicPlaylistRecord)}
          />
        ) : (
          <TrackCard
            item={item as MusicItemRecord}
            onOpen={() => onOpenTrack(item as MusicItemRecord)}
            onToggleFavorite={() => onToggleFavorite(item as MusicItemRecord)}
            onSearchWeb={() => onSearchWeb(item as MusicItemRecord)}
            onDelete={() => onDeleteTrack(item as MusicItemRecord)}
          />
        )
      }
    />
  )
}
