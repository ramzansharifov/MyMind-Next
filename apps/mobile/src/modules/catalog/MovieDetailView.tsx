import { useState } from 'react'
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions
} from 'react-native'
import type { MovieRecord } from '@mymind/contracts/movies'
import { Button, Label } from '../../shared/ui/primitives'
import { useTheme } from '../../shared/ui/theme'
import {
  formatMovieRuntime,
  isEpisodicMovieType,
  movieTypeLabel
} from './movie-presentation'

interface MovieDetailViewProps {
  movie: MovieRecord
  busy: boolean
  onBack(): void
  onEdit(): void
  onDelete(): void
  onUpdate(movie: MovieRecord): void
  onSearchWeb(query: string): void
}

function MetadataChip({
  label,
  onPress
}: {
  label: string
  onPress?: () => void
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({
        minHeight: 36,
        justifyContent: 'center',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.raised,
        paddingHorizontal: 11,
        paddingVertical: 7,
        opacity: pressed ? 0.7 : 1
      })}
    >
      <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <View style={{ gap: 10 }}>
      <Label title>{title}</Label>
      {children}
    </View>
  )
}

export function MovieDetailView({
  movie,
  busy,
  onBack,
  onEdit,
  onDelete,
  onUpdate,
  onSearchWeb
}: MovieDetailViewProps): React.JSX.Element {
  const theme = useTheme()
  const window = useWindowDimensions()
  const [posterOpen, setPosterOpen] = useState(false)
  const [ratingOpen, setRatingOpen] = useState(false)
  const episodic = isEpisodicMovieType(movie.type)
  const runtime = formatMovieRuntime(movie.runtimeMinutes)
  const episodeRuntime = formatMovieRuntime(movie.episodeRuntimeMinutes)
  const statusWatched = movie.status === 'watched'

  const markWatchlist = (): void => {
    if (!statusWatched || busy) return
    Alert.alert(
      'Вернуть в «Хочу посмотреть»?',
      'Текущая оценка будет удалена, как и в desktop-версии.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Вернуть',
          style: 'destructive',
          onPress: () => {
            setRatingOpen(false)
            onUpdate({ ...movie, status: 'watchlist', rating: null })
          }
        }
      ]
    )
  }

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 8,
          marginBottom: 12
        }}
      >
        <Button label="← Назад" onPress={onBack} disabled={busy} />
        <Button label="Изменить" onPress={onEdit} disabled={busy} />
        <Button
          label={movie.favorite ? '★ В избранном' : '☆ В избранное'}
          selected={movie.favorite}
          disabled={busy}
          onPress={() => onUpdate({ ...movie, favorite: !movie.favorite })}
        />
        <Button label="Удалить" danger disabled={busy} onPress={onDelete} />
      </View>

      <ScrollView contentContainerStyle={{ gap: 22, paddingBottom: 44 }}>
        <View
          style={{
            borderRadius: 18,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.surface,
            padding: 16,
            gap: 18
          }}
        >
          <View style={{ flexDirection: window.width >= 520 ? 'row' : 'column', gap: 18 }}>
            <Pressable
              accessibilityRole={movie.posterUrl ? 'button' : undefined}
              accessibilityLabel={movie.posterUrl ? 'Открыть постер на весь экран' : undefined}
              disabled={!movie.posterUrl}
              onPress={() => setPosterOpen(true)}
              style={({ pressed }) => ({
                width: window.width >= 520 ? 170 : '100%',
                height: window.width >= 520 ? 255 : 360,
                maxHeight: 420,
                borderRadius: 14,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.raised,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.8 : 1
              })}
            >
              {movie.posterUrl ? (
                <Image
                  source={{ uri: movie.posterUrl }}
                  resizeMode="cover"
                  style={{ width: '100%', height: '100%' }}
                />
              ) : (
                <Text style={{ color: theme.muted, fontSize: 15 }}>Нет постера</Text>
              )}
            </Pressable>

            <View style={{ flex: 1, gap: 12 }}>
              <View style={{ gap: 4 }}>
                <Text style={{ color: theme.text, fontSize: 28, fontWeight: '800' }}>
                  {movie.title}
                </Text>
                {movie.originalTitle ? (
                  <Text style={{ color: theme.muted, fontSize: 16 }}>{movie.originalTitle}</Text>
                ) : null}
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <MetadataChip label={movieTypeLabel(movie.type)} />
                {movie.year ? <MetadataChip label={String(movie.year)} /> : null}
                {runtime ? <MetadataChip label={runtime} /> : null}
                {statusWatched && movie.rating ? (
                  <MetadataChip label={`★ ${movie.rating}/10`} />
                ) : null}
              </View>

              {episodic ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {movie.seasonCount ? (
                    <MetadataChip label={`${movie.seasonCount} сез.`} />
                  ) : null}
                  {movie.episodesPerSeason ? (
                    <MetadataChip label={`${movie.episodesPerSeason} эп./сез.`} />
                  ) : null}
                  {episodeRuntime ? <MetadataChip label={`Эпизод · ${episodeRuntime}`} /> : null}
                </View>
              ) : null}

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <Button
                  label="Хочу посмотреть"
                  selected={!statusWatched}
                  disabled={busy}
                  onPress={markWatchlist}
                />
                <Button
                  label="Просмотрено"
                  selected={statusWatched}
                  disabled={busy}
                  onPress={() => {
                    if (!statusWatched) setRatingOpen(true)
                  }}
                />
              </View>

              {ratingOpen && !statusWatched ? (
                <View
                  style={{
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: theme.border,
                    backgroundColor: theme.raised,
                    padding: 12,
                    gap: 10
                  }}
                >
                  <Label>Оцените перед переводом в просмотренные</Label>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
                    {Array.from({ length: 10 }, (_, index) => index + 1).map((rating) => (
                      <Button
                        key={rating}
                        label={String(rating)}
                        disabled={busy}
                        onPress={() => {
                          setRatingOpen(false)
                          onUpdate({ ...movie, status: 'watched', rating })
                        }}
                      />
                    ))}
                  </View>
                </View>
              ) : null}

              <Button
                label="Посмотреть в интернете"
                onPress={() => onSearchWeb(`Смотреть фильм ${movie.title}`)}
              />
            </View>
          </View>
        </View>

        {movie.genres.length > 0 ? (
          <Section title="Жанры">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {movie.genres.map((genre) => (
                <MetadataChip
                  key={genre}
                  label={genre}
                  onPress={() => onSearchWeb(`Жанр ${genre}`)}
                />
              ))}
            </View>
          </Section>
        ) : null}

        {movie.director ? (
          <Section title="Режиссёр">
            <View style={{ alignItems: 'flex-start' }}>
              <MetadataChip
                label={movie.director}
                onPress={() => onSearchWeb(`Режиссер ${movie.director}`)}
              />
            </View>
          </Section>
        ) : null}

        {movie.actors.length > 0 ? (
          <Section title="Актёры">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {movie.actors.map((actor) => (
                <MetadataChip key={actor} label={actor} onPress={() => onSearchWeb(actor)} />
              ))}
            </View>
          </Section>
        ) : null}

        {movie.description ? (
          <Section title="Описание">
            <Text style={{ color: theme.text, fontSize: 16, lineHeight: 24 }}>
              {movie.description}
            </Text>
          </Section>
        ) : null}

        {movie.comments ? (
          <Section title="Мои заметки">
            <View
              style={{
                borderRadius: 14,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.surface,
                padding: 14
              }}
            >
              <Text style={{ color: theme.text, fontSize: 15, lineHeight: 22 }}>
                {movie.comments}
              </Text>
            </View>
          </Section>
        ) : null}
      </ScrollView>

      <Modal
        visible={posterOpen}
        animationType="fade"
        transparent={false}
        onRequestClose={() => setPosterOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: '#000',
            padding: 16,
            paddingTop: 48,
            gap: 12
          }}
        >
          <View style={{ alignItems: 'flex-start' }}>
            <Button label="Закрыть" onPress={() => setPosterOpen(false)} />
          </View>
          {movie.posterUrl ? (
            <Image
              source={{ uri: movie.posterUrl }}
              resizeMode="contain"
              style={{ flex: 1, width: '100%' }}
            />
          ) : null}
        </View>
      </Modal>
    </View>
  )
}
