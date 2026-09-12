import { useState } from 'react'
import { Image, Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native'
import type { MovieRecord } from '@mymind/contracts/movies'
import {
  CalendarDays,
  Clapperboard,
  Clock3,
  Film,
  Heart,
  Layers,
  List,
  Play,
  Star,
  Tags,
  Users,
  type LucideIcon
} from 'lucide-react-native'

import { AppDialog } from '../../shared/ui/AppDialog'
import { useConfirmation } from '../../shared/ui/ConfirmationProvider'
import { Button } from '../../shared/ui/primitives'
import { useTheme } from '../../shared/ui/theme'
import { formatMovieRuntime, isEpisodicMovieType, movieTypeLabel } from './movie-presentation'

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
  icon: Icon,
  onPress
}: {
  label: string
  icon?: LucideIcon
  onPress?: () => void
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({
        minHeight: 38,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        justifyContent: 'center',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: onPress && pressed ? theme.accent + '66' : theme.border,
        backgroundColor: pressed ? theme.raised : theme.surface,
        paddingHorizontal: 12,
        paddingVertical: 8,
        opacity: pressed ? 0.78 : 1
      })}
    >
      {Icon ? <Icon size={15} color={onPress ? theme.accent : theme.muted} /> : null}
      <Text style={{ color: onPress ? theme.accent : theme.text, fontSize: 13, fontWeight: '600' }}>
        {label}
      </Text>
    </Pressable>
  )
}

function PersonRow({
  label,
  icon: Icon,
  children
}: {
  label: string
  icon: LucideIcon
  children: React.ReactNode
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
      <Icon size={16} color={theme.muted} style={{ marginTop: 3 }} />
      <Text style={{ color: theme.muted, fontSize: 13, lineHeight: 22 }}>{label}:</Text>
      <View style={{ minWidth: 0, flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {children}
      </View>
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
  const confirm = useConfirmation()
  const window = useWindowDimensions()
  const [posterOpen, setPosterOpen] = useState(false)
  const [ratingOpen, setRatingOpen] = useState(false)
  const [pendingRating, setPendingRating] = useState<number | null>(null)
  const episodic = isEpisodicMovieType(movie.type)
  const runtime = formatMovieRuntime(movie.runtimeMinutes)
  const episodeRuntime = formatMovieRuntime(movie.episodeRuntimeMinutes)
  const watched = movie.status === 'watched'
  const wide = window.width >= 620

  const requestWatchlist = (): void => {
    if (!watched || busy) return
    void confirm({
      title: 'Вернуть в «Хочу посмотреть»?',
      subject: movie.title,
      description:
        'Запись перестанет считаться просмотренной и вернётся в список «Хочу посмотреть».',
      tone: 'warning',
      notice: movie.rating !== null ? 'Текущая оценка будет удалена' : null,
      confirmLabel: 'Вернуть',
      onConfirm: () => onUpdate({ ...movie, status: 'watchlist', rating: null })
    })
  }

  const requestWatched = (): void => {
    if (watched || busy) return
    setPendingRating(null)
    setRatingOpen(true)
  }

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          marginBottom: 12,
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 8
        }}
      >
        <Button label="К библиотеке" icon="back" onPress={onBack} disabled={busy} />
        <Button label="Изменить" icon="edit" onPress={onEdit} disabled={busy} />
        <Button label="Удалить" icon="delete" danger disabled={busy} onPress={onDelete} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 44 }}>
        <View
          style={{
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 28,
            backgroundColor: theme.surface
          }}
        >
          <View style={{ flexDirection: wide ? 'row' : 'column' }}>
            <Pressable
              accessibilityRole={movie.posterUrl ? 'button' : undefined}
              accessibilityLabel={movie.posterUrl ? 'Открыть постер на весь экран' : undefined}
              disabled={!movie.posterUrl}
              onPress={() => setPosterOpen(true)}
              style={({ pressed }) => ({
                width: wide ? 250 : '100%',
                aspectRatio: wide ? 2 / 3 : 4 / 5,
                maxHeight: wide ? undefined : 430,
                overflow: 'hidden',
                backgroundColor: theme.background,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.82 : 1
              })}
            >
              {movie.posterUrl ? (
                <Image
                  source={{ uri: movie.posterUrl }}
                  resizeMode="cover"
                  style={{ width: '100%', height: '100%' }}
                />
              ) : (
                <Text style={{ color: theme.muted, fontSize: 14 }}>Постер не указан</Text>
              )}
            </Pressable>

            <View style={{ minWidth: 0, flex: 1, padding: wide ? 28 : 18 }}>
              <View
                style={{
                  paddingBottom: 20,
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.border
                }}
              >
                <View style={{ minWidth: 0, flex: 1 }}>
                  <Text
                    style={{
                      color: theme.text,
                      fontSize: wide ? 30 : 25,
                      lineHeight: wide ? 38 : 32,
                      fontWeight: '700',
                      letterSpacing: -0.7
                    }}
                  >
                    {movie.title}
                  </Text>
                  {movie.originalTitle ? (
                    <Text style={{ marginTop: 5, color: theme.muted, fontSize: 15 }}>
                      {movie.originalTitle}
                    </Text>
                  ) : null}
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {watched && movie.rating !== null ? (
                    <View
                      style={{
                        minHeight: 52,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 7,
                        paddingHorizontal: 12,
                        borderWidth: 1,
                        borderColor: '#fbbf2433',
                        borderRadius: 16,
                        backgroundColor: '#fbbf2414'
                      }}
                    >
                      <Star size={19} color="#fde68a" fill="#fde68a" />
                      <Text style={{ color: '#fde68a', fontSize: 19, fontWeight: '700' }}>
                        {movie.rating}
                      </Text>
                      <Text style={{ color: '#fde68aAA', fontSize: 11 }}>/ 10</Text>
                    </View>
                  ) : null}

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={movie.favorite ? 'Убрать из избранного' : 'Добавить в избранное'}
                    accessibilityState={{ selected: movie.favorite, disabled: busy }}
                    disabled={busy}
                    onPress={() => onUpdate({ ...movie, favorite: !movie.favorite })}
                    style={({ pressed }) => ({
                      width: 52,
                      height: 52,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: movie.favorite ? '#fb718533' : theme.border,
                      borderRadius: 16,
                      backgroundColor: movie.favorite ? '#fb718514' : pressed ? theme.raised : theme.surface,
                      opacity: busy ? 0.45 : pressed ? 0.78 : 1
                    })}
                  >
                    <Heart
                      size={20}
                      color={movie.favorite ? '#fda4af' : theme.muted}
                      fill={movie.favorite ? '#fda4af' : 'none'}
                    />
                  </Pressable>
                </View>
              </View>

              <View style={{ marginTop: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <MetadataChip icon={Film} label={movieTypeLabel(movie.type)} />
                {movie.year !== null ? <MetadataChip icon={CalendarDays} label={String(movie.year)} /> : null}
                {!episodic && runtime ? <MetadataChip icon={Clock3} label={runtime} /> : null}
                {episodic && movie.seasonCount !== null ? (
                  <MetadataChip icon={Layers} label={`Сезонов: ${movie.seasonCount}`} />
                ) : null}
                {episodic && movie.episodesPerSeason !== null ? (
                  <MetadataChip icon={List} label={`Серий в сезоне: ${movie.episodesPerSeason}`} />
                ) : null}
                {episodic && episodeRuntime ? (
                  <MetadataChip icon={Clock3} label={`Серия: ${episodeRuntime}`} />
                ) : null}
              </View>

              {movie.genres.length > 0 ? (
                <View style={{ marginTop: 18 }}>
                  <PersonRow label="Жанры" icon={Tags}>
                    {movie.genres.map((genre) => (
                      <MetadataChip
                        key={genre}
                        label={genre}
                        onPress={() => onSearchWeb(`фильмы жанра ${genre}`)}
                      />
                    ))}
                  </PersonRow>
                </View>
              ) : null}

              {movie.director ? (
                <View style={{ marginTop: 16 }}>
                  <PersonRow label="Режиссёр" icon={Clapperboard}>
                    <Pressable onPress={() => onSearchWeb(movie.director)}>
                      <Text style={{ color: theme.text, fontSize: 13, lineHeight: 22, fontWeight: '600' }}>
                        {movie.director}
                      </Text>
                    </Pressable>
                  </PersonRow>
                </View>
              ) : null}

              {movie.actors.length > 0 ? (
                <View style={{ marginTop: 12 }}>
                  <PersonRow label="Актёры" icon={Users}>
                    {movie.actors.map((actor) => (
                      <Pressable key={actor} onPress={() => onSearchWeb(actor)}>
                        <Text style={{ color: theme.text, fontSize: 13, lineHeight: 22, fontWeight: '600' }}>
                          {actor}
                        </Text>
                      </Pressable>
                    ))}
                  </PersonRow>
                </View>
              ) : null}

              <View style={{ marginTop: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <View
                  accessibilityLabel="Статус просмотра"
                  style={{
                    minHeight: 40,
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 4,
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 12,
                    backgroundColor: theme.surface
                  }}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: watched, disabled: busy }}
                    disabled={busy}
                    onPress={requestWatched}
                    style={({ pressed }) => ({
                      minHeight: 32,
                      justifyContent: 'center',
                      paddingHorizontal: 12,
                      borderWidth: watched ? 1 : 0,
                      borderColor: '#34d39933',
                      borderRadius: 8,
                      backgroundColor: watched ? '#34d39914' : pressed ? theme.raised : 'transparent'
                    })}
                  >
                    <Text style={{ color: watched ? '#6ee7b7' : theme.muted, fontSize: 13, fontWeight: watched ? '700' : '500' }}>
                      Просмотрено
                    </Text>
                  </Pressable>
                  <View style={{ width: 1, height: 20, marginHorizontal: 4, backgroundColor: theme.border }} />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: !watched, disabled: busy }}
                    disabled={busy}
                    onPress={requestWatchlist}
                    style={({ pressed }) => ({
                      minHeight: 32,
                      justifyContent: 'center',
                      paddingHorizontal: 12,
                      borderWidth: !watched ? 1 : 0,
                      borderColor: theme.accent + '44',
                      borderRadius: 8,
                      backgroundColor: !watched ? theme.accent + '14' : pressed ? theme.raised : 'transparent'
                    })}
                  >
                    <Text style={{ color: !watched ? theme.accent : theme.muted, fontSize: 13, fontWeight: !watched ? '700' : '500' }}>
                      Хочу посмотреть
                    </Text>
                  </Pressable>
                </View>
                <Button
                  label="Посмотреть"
                  primary
                  onPress={() => onSearchWeb(`Смотреть фильм ${movie.title}`)}
                />
              </View>

              {movie.description ? (
                <View
                  style={{
                    marginTop: 26,
                    padding: 18,
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 16,
                    backgroundColor: theme.background
                  }}
                >
                  <Text style={{ color: theme.text, fontSize: 14, fontWeight: '700' }}>Описание</Text>
                  <Text style={{ marginTop: 10, color: theme.muted, fontSize: 14, lineHeight: 25 }}>
                    {movie.description}
                  </Text>
                </View>
              ) : null}

              {movie.comments ? (
                <View
                  style={{
                    marginTop: 22,
                    paddingTop: 20,
                    borderTopWidth: 1,
                    borderTopColor: theme.border
                  }}
                >
                  <Text style={{ color: theme.text, fontSize: 14, fontWeight: '700' }}>
                    Личные комментарии
                  </Text>
                  <Text style={{ marginTop: 10, color: theme.muted, fontSize: 14, lineHeight: 25 }}>
                    {movie.comments}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </ScrollView>

      <AppDialog
        open={ratingOpen}
        onOpenChange={(open) => {
          setRatingOpen(open)
          if (!open) setPendingRating(null)
        }}
        title="Отметить как просмотрено"
        description={`Выберите оценку для «${movie.title}»`}
        icon="movies"
        busy={busy}
        presentation="card"
        footer={
          <>
            <Button label="Отмена" disabled={busy} onPress={() => setRatingOpen(false)} />
            <Button
              label="Отметить просмотренным"
              primary
              disabled={busy || pendingRating === null}
              onPress={() => {
                if (pendingRating === null) return
                onUpdate({ ...movie, status: 'watched', rating: pendingRating })
                setRatingOpen(false)
                setPendingRating(null)
              }}
            />
          </>
        }
      >
        <View style={{ padding: 16, gap: 12 }}>
          <Text style={{ color: theme.muted, fontSize: 13, lineHeight: 20 }}>
            Выберите оценку. После сохранения фильм перейдёт в «Просмотрено».
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
            {Array.from({ length: 10 }, (_, index) => index + 1).map((rating) => (
              <Pressable
                key={rating}
                accessibilityRole="radio"
                accessibilityState={{ selected: pendingRating === rating }}
                disabled={busy}
                onPress={() => setPendingRating(rating)}
                style={({ pressed }) => ({
                  width: 46,
                  height: 44,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: pendingRating === rating ? '#fbbf2459' : theme.border,
                  borderRadius: 12,
                  backgroundColor:
                    pendingRating === rating ? '#fbbf2426' : pressed ? theme.raised : theme.background
                })}
              >
                <Text style={{ color: pendingRating === rating ? '#fde68a' : theme.muted, fontSize: 14, fontWeight: '600' }}>
                  {rating}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </AppDialog>

      <Modal
        visible={posterOpen}
        animationType="fade"
        transparent={false}
        onRequestClose={() => setPosterOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#000', padding: 16, paddingTop: 48 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Закрыть полноэкранный постер"
            onPress={() => setPosterOpen(false)}
            style={{
              position: 'absolute',
              top: 48,
              right: 18,
              zIndex: 10,
              width: 44,
              height: 44,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 22,
              backgroundColor: '#000000AA'
            }}
          >
            <Text style={{ color: '#fff', fontSize: 22 }}>×</Text>
          </Pressable>
          {movie.posterUrl ? (
            <Image source={{ uri: movie.posterUrl }} resizeMode="contain" style={{ flex: 1, width: '100%' }} />
          ) : null}
        </View>
      </Modal>
    </View>
  )
}
