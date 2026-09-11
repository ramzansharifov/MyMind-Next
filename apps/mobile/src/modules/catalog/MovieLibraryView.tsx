import { FlatList, Image, Pressable, Text, View } from 'react-native'
import type { MovieRecord } from '@mymind/contracts/movies'
import { Button, EmptyState } from '../../shared/ui/primitives'
import { useTheme } from '../../shared/ui/theme'
import { formatMovieRuntime, movieLibraryStats, movieTypeLabel } from './movie-presentation'

interface MovieLibraryViewProps {
  movies: MovieRecord[]
  refreshing: boolean
  onRefresh(): void
  onOpen(movie: MovieRecord): void
  onToggleFavorite(movie: MovieRecord): void
  onSearchWeb(movie: MovieRecord): void
}

function StatCard({ label, value }: { label: string; value: string }): React.JSX.Element {
  const theme = useTheme()
  return (
    <View
      style={{
        flexGrow: 1,
        minWidth: 96,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.surface,
        paddingHorizontal: 12,
        paddingVertical: 11,
        gap: 3
      }}
    >
      <Text style={{ color: theme.muted, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: theme.text, fontSize: 20, fontWeight: '800' }}>{value}</Text>
    </View>
  )
}

function MovieCard({
  movie,
  onOpen,
  onToggleFavorite,
  onSearchWeb
}: {
  movie: MovieRecord
  onOpen(): void
  onToggleFavorite(): void
  onSearchWeb(): void
}): React.JSX.Element {
  const theme = useTheme()
  const runtime = formatMovieRuntime(movie.runtimeMinutes)
  const metadata = [
    movieTypeLabel(movie.type),
    movie.year ? String(movie.year) : null,
    runtime,
    movie.status === 'watched' ? 'Просмотрено' : 'Хочу посмотреть',
    movie.rating ? `${movie.rating}/10` : null
  ].filter(Boolean)

  return (
    <View
      style={{
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.surface,
        padding: 12,
        gap: 12,
        marginBottom: 10
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Открыть ${movie.title}`}
        onPress={onOpen}
        style={({ pressed }) => ({
          flexDirection: 'row',
          gap: 13,
          opacity: pressed ? 0.72 : 1
        })}
      >
        <View
          style={{
            width: 82,
            height: 123,
            borderRadius: 11,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.raised,
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {movie.posterUrl ? (
            <Image
              source={{ uri: movie.posterUrl }}
              resizeMode="cover"
              style={{ width: '100%', height: '100%' }}
            />
          ) : (
            <Text style={{ color: theme.muted, fontSize: 11, textAlign: 'center' }}>
              Нет постера
            </Text>
          )}
        </View>

        <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: theme.text, fontSize: 17, fontWeight: '800' }}>
                {movie.title}
              </Text>
              {movie.originalTitle ? (
                <Text style={{ color: theme.muted, fontSize: 13 }} numberOfLines={1}>
                  {movie.originalTitle}
                </Text>
              ) : null}
            </View>
            {movie.favorite ? (
              <Text accessibilityLabel="В избранном" style={{ color: theme.accent, fontSize: 19 }}>
                ★
              </Text>
            ) : null}
          </View>

          <Text style={{ color: theme.muted, fontSize: 13, lineHeight: 19 }}>
            {metadata.join(' · ')}
          </Text>
          {movie.genres.length > 0 ? (
            <Text style={{ color: theme.text, fontSize: 13 }} numberOfLines={2}>
              {movie.genres.join(' · ')}
            </Text>
          ) : null}
          {movie.director ? (
            <Text style={{ color: theme.muted, fontSize: 13 }} numberOfLines={1}>
              {movie.director}
            </Text>
          ) : null}
        </View>
      </Pressable>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Button
          label={movie.favorite ? '★ Избранное' : '☆ Избранное'}
          selected={movie.favorite}
          onPress={onToggleFavorite}
        />
        <Button label="В интернете" onPress={onSearchWeb} />
        <Button label="Подробнее" onPress={onOpen} />
      </View>
    </View>
  )
}

export function MovieLibraryView({
  movies,
  refreshing,
  onRefresh,
  onOpen,
  onToggleFavorite,
  onSearchWeb
}: MovieLibraryViewProps): React.JSX.Element {
  const stats = movieLibraryStats(movies)

  return (
    <FlatList
      data={movies}
      keyExtractor={(item) => item.id}
      onRefresh={onRefresh}
      refreshing={refreshing}
      contentContainerStyle={{ paddingBottom: 96 }}
      ListHeaderComponent={
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          <StatCard label="Всего" value={String(stats.total)} />
          <StatCard label="Просмотрено" value={String(stats.watched)} />
          <StatCard label="В планах" value={String(stats.watchlist)} />
          <StatCard label="Избранное" value={String(stats.favorites)} />
          <StatCard
            label="Средняя оценка"
            value={stats.averageRating === null ? '—' : `${stats.averageRating}/10`}
          />
        </View>
      }
      ListEmptyComponent={<EmptyState />}
      renderItem={({ item }) => (
        <MovieCard
          movie={item}
          onOpen={() => onOpen(item)}
          onToggleFavorite={() => onToggleFavorite(item)}
          onSearchWeb={() => onSearchWeb(item)}
        />
      )}
    />
  )
}
