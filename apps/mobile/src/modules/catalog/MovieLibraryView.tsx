import { FlatList, Image, Pressable, Text, View } from 'react-native'
import type { MovieRecord } from '@mymind/contracts/movies'
import { Bookmark, Check, Heart, Star } from 'lucide-react-native'

import { EmptyState } from '../../shared/ui/primitives'
import { useTheme } from '../../shared/ui/theme'
import { movieTypeLabel } from './movie-presentation'

interface MovieLibraryViewProps {
  movies: MovieRecord[]
  refreshing: boolean
  onRefresh(): void
  onOpen(movie: MovieRecord): void
  onToggleFavorite(movie: MovieRecord): void
  onSearchWeb(movie: MovieRecord): void
}

function MoviePoster({ movie }: { movie: MovieRecord }): React.JSX.Element {
  const theme = useTheme()
  return movie.posterUrl ? (
    <Image
      source={{ uri: movie.posterUrl }}
      resizeMode="cover"
      style={{ width: '100%', aspectRatio: 2 / 3 }}
    />
  ) : (
    <View
      style={{
        width: '100%',
        aspectRatio: 2 / 3,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.raised
      }}
    >
      <Text style={{ paddingHorizontal: 10, textAlign: 'center', color: theme.muted, fontSize: 11 }}>
        Постер не указан
      </Text>
    </View>
  )
}

function MovieCard({
  movie,
  onOpen,
  onToggleFavorite
}: {
  movie: MovieRecord
  onOpen(): void
  onToggleFavorite(): void
}): React.JSX.Element {
  const theme = useTheme()
  const watched = movie.status === 'watched'

  return (
    <View
      style={{
        flex: 1,
        minWidth: 0,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 16,
        backgroundColor: theme.surface
      }}
    >
      <View style={{ position: 'relative', overflow: 'hidden' }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Открыть фильм «${movie.title}»`}
          onPress={onOpen}
          style={({ pressed }) => ({ opacity: pressed ? 0.78 : 1 })}
        >
          <MoviePoster movie={movie} />
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: 72,
              backgroundColor: '#00000055'
            }}
          />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={movie.favorite ? 'Убрать из избранного' : 'Добавить в избранное'}
          accessibilityState={{ selected: movie.favorite }}
          hitSlop={4}
          onPress={onToggleFavorite}
          style={({ pressed }) => ({
            position: 'absolute',
            top: 10,
            right: 10,
            width: 36,
            height: 36,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: movie.favorite ? '#fda4af44' : '#ffffff22',
            borderRadius: 12,
            backgroundColor: pressed ? '#000000AA' : '#00000080'
          })}
        >
          <Heart
            size={16}
            color={movie.favorite ? '#fda4af' : '#ffffffB3'}
            fill={movie.favorite ? '#fda4af' : 'none'}
          />
        </Pressable>

        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 10,
            right: 10,
            bottom: 10,
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 6
          }}
        >
          <View
            style={{
              maxWidth: '72%',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: 7,
              paddingVertical: 4,
              borderWidth: 1,
              borderColor: watched ? '#6ee7b733' : theme.accent + '44',
              borderRadius: 8,
              backgroundColor: '#00000088'
            }}
          >
            {watched ? (
              <Check size={11} color="#a7f3d0" />
            ) : (
              <Bookmark size={11} color={theme.accent} />
            )}
            <Text
              numberOfLines={1}
              style={{ color: watched ? '#a7f3d0' : '#c4b5fd', fontSize: 10.5, fontWeight: '600' }}
            >
              {watched ? 'Просмотрено' : 'Хочу посмотреть'}
            </Text>
          </View>

          {watched && movie.rating !== null ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 3,
                paddingHorizontal: 7,
                paddingVertical: 4,
                borderRadius: 8,
                backgroundColor: '#00000099'
              }}
            >
              <Star size={11} color="#fde68a" fill="#fde68a" />
              <Text style={{ color: '#fde68a', fontSize: 10.5, fontWeight: '700' }}>
                {movie.rating.toFixed(1)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Подробнее о фильме «${movie.title}»`}
        onPress={onOpen}
        style={({ pressed }) => ({
          minHeight: 64,
          justifyContent: 'center',
          paddingHorizontal: 14,
          paddingVertical: 11,
          borderTopWidth: 1,
          borderTopColor: theme.border,
          backgroundColor: pressed ? theme.raised : theme.surface,
          opacity: pressed ? 0.82 : 1
        })}
      >
        <Text numberOfLines={1} style={{ color: theme.text, fontSize: 14, fontWeight: '700' }}>
          {movie.title}
        </Text>
        <Text style={{ marginTop: 2, color: theme.muted, fontSize: 11 }}>
          {movieTypeLabel(movie.type)}
        </Text>
      </Pressable>
    </View>
  )
}

export function MovieLibraryView({
  movies,
  refreshing,
  onRefresh,
  onOpen,
  onToggleFavorite,
  onSearchWeb: _onSearchWeb
}: MovieLibraryViewProps): React.JSX.Element {
  return (
    <FlatList
      key="desktop-parity-movie-grid"
      data={movies}
      keyExtractor={(item) => item.id}
      numColumns={2}
      columnWrapperStyle={{ gap: 12 }}
      ItemSeparatorComponent={() => <View style={{ height: 18 }} />}
      onRefresh={onRefresh}
      refreshing={refreshing}
      contentContainerStyle={{ paddingBottom: 96 }}
      ListEmptyComponent={<EmptyState />}
      renderItem={({ item }) => (
        <View style={{ flex: 1, minWidth: 0 }}>
          <MovieCard
            movie={item}
            onOpen={() => onOpen(item)}
            onToggleFavorite={() => onToggleFavorite(item)}
          />
        </View>
      )}
    />
  )
}
