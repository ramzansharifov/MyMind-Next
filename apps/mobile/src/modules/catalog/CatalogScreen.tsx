import { useCallback, useState } from 'react'
import { Linking, Pressable, View } from 'react-native'
import {
  Bookmark,
  Check,
  Film,
  Heart,
  ListMusic,
  Music2,
  SlidersHorizontal,
  type LucideIcon
} from 'lucide-react-native'
import type { MovieRecord } from '@mymind/contracts/movies'
import type { MusicItemRecord, MusicPlaylistRecord } from '@mymind/contracts/music'
import * as moviesSchema from '@mymind/core/validation/movies'
import * as musicSchema from '@mymind/core/validation/music'
import { useServices } from '../../app/context'
import { useCollection } from '../../shared/hooks/useCollection'
import { ErrorState, LoadingState  } from '../../shared/ui/primitives'
import { FormSheet } from '../../shared/ui/FormSheet'
import { MobileCreateAction } from '../../shared/ui/MobileCreateAction'
import { choiceField, messageFor, textField, type FormSpec } from '../../shared/ui/form-model'
import { useTheme } from '../../shared/ui/theme'
import { SwipeableTabContent } from '../../shared/ui/SwipeableTabContent'
import { SwipeTabBar } from '../../shared/ui/SwipeTabBar'
import { useSwipeTabFeedback } from '../../shared/ui/useSwipeTabFeedback'
import { movieFields, movieValues, normalizeMovieFormValues } from './catalog-forms'
import { CatalogJsonImportModal } from './CatalogJsonImportModal'
import { MovieDetailView } from './MovieDetailView'
import { MovieLibraryView } from './MovieLibraryView'
import { MusicLibraryView, type MobileMusicView } from './MusicLibraryView'
import { movieRecordToUpdateInput } from './movie-presentation'
import {
  musicFilterArtists,
  musicFilterYears,
  musicRecordToUpdateInput,
  musicTrackDraftFromItem,
  musicYoutubeSearchUrl,
  musicTrackInputFromDraft
} from './music-presentation'

type MovieStatusFilter = 'all' | 'watchlist' | 'watched' | 'favorite'
type MusicTopTab = 'tracks' | 'favorites' | 'playlists'

const MOVIE_STATUS_TAB_IDS = ['all', 'watchlist', 'watched', 'favorite'] as const
const MUSIC_TAB_IDS = ['tracks', 'favorites', 'playlists'] as const

const MOVIE_STATUS_FILTERS: ReadonlyArray<{
  id: MovieStatusFilter
  label: string
  icon: LucideIcon
}> = [
  { id: 'all', label: 'Все фильмы', icon: Film },
  { id: 'watchlist', label: 'Хочу посмотреть', icon: Bookmark },
  { id: 'watched', label: 'Просмотрено', icon: Check },
  { id: 'favorite', label: 'Избранное', icon: Heart }
]

const MUSIC_VIEW_FILTERS: ReadonlyArray<{
  id: MusicTopTab
  label: string
  icon: LucideIcon
}> = [
  { id: 'tracks', label: 'Все треки', icon: Music2 },
  { id: 'favorites', label: 'Избранное', icon: Heart },
  { id: 'playlists', label: 'Плейлисты', icon: ListMusic }
]

export function CatalogScreen({ mode }: { mode: 'movies' | 'music' }): React.JSX.Element {
  const services = useServices()
  const theme = useTheme()
  const state = useCollection(
    useCallback(() => {
      if (mode === 'movies') {
        return { items: services.movies.listMoviesOverview().movies, playlists: [] }
      }
      const overview = services.music.listMusicOverview()
      return { items: overview.items, playlists: overview.playlists }
    }, [mode, services])
  )
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<MovieStatusFilter>('all')
  const [sort, setSort] = useState('recent')
  const [genre, setGenre] = useState('')
  const [type, setType] = useState('')
  const [year, setYear] = useState('')
  const [director, setDirector] = useState('')
  const [actor, setActor] = useState('')
  const [minRating, setMinRating] = useState('')
  const [musicArtist, setMusicArtist] = useState('')
  const [musicYear, setMusicYear] = useState('')
  const [playlistsView, setPlaylistsView] = useState(false)
  const [playlistId, setPlaylistId] = useState<string | null>(null)
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null)
  const [form, setForm] = useState<FormSpec | null>(null)
  const [jsonImportOpen, setJsonImportOpen] = useState(false)
  const [webError, setWebError] = useState('')
  const [movieSwipeFeedback, showMovieSwipeFeedback] = useSwipeTabFeedback<MovieStatusFilter>()
  const [musicSwipeFeedback, showMusicSwipeFeedback] = useSwipeTabFeedback<MusicTopTab>()

  const changeMovieFilter = useCallback(
    (next: MovieStatusFilter): void => {
      if (next === filter) return
      setFilter(next)
    },
    [filter]
  )

  const changeMusicTab = useCallback(
    (next: MusicTopTab): void => {
      const current: MusicTopTab =
        playlistId || playlistsView ? 'playlists' : filter === 'favorite' ? 'favorites' : 'tracks'
      if (next === current && !playlistId) return

      setQuery('')
      setPlaylistId(null)

      if (next === 'favorites') {
        setFilter('favorite')
        setPlaylistsView(false)
      } else if (next === 'playlists') {
        setFilter('all')
        setPlaylistsView(true)
      } else {
        setFilter('all')
        setPlaylistsView(false)
      }
    },
    [filter, playlistId, playlistsView]
  )

  const editMovie = (item?: MovieRecord): void =>
    setForm({
      title: item ? 'Редактирование' : 'Добавить фильм',
      initial: movieValues(item),
      fields: movieFields,
      save: (values) => {
        const normalized = normalizeMovieFormValues(values)
        const input = moviesSchema.createMovieInputSchema.parse({
          ...normalized,
          posterUrl: normalized.posterUrl || null,
          originalTitle: normalized.originalTitle || null
        })
        if (item) services.movies.updateMovie({ ...input, id: item.id })
        else services.movies.createMovie(input)
        state.refresh()
      }
    })

  const editTrack = (item?: MusicItemRecord): void => {
    const draft = musicTrackDraftFromItem(item)
    const playlists = state.data?.playlists ?? []
    setForm({
      title: item ? 'Редактировать трек' : 'Новый трек',
      initial: {
        ...draft,
        ...Object.fromEntries(
          playlists.map((playlist) => [
            `playlist:${playlist.id}`,
            item ? playlist.trackIds.includes(item.id) : false
          ])
        )
      },
      fields: [
        textField('title', 'Название'),
        textField('artist', 'Исполнитель'),
        textField('year', 'Год'),
        textField('duration', 'Длительность', 'text', 'Например 3:45 или 225 секунд'),
        textField('favorite', 'Избранное', 'boolean'),
        ...playlists.map((playlist) =>
          textField(`playlist:${playlist.id}`, `Плейлист · ${playlist.name}`, 'boolean')
        )
      ],
      save: (values) => {
        const input = musicSchema.createMusicItemInputSchema.parse(
          musicTrackInputFromDraft(
            {
              title: String(values.title ?? ''),
              artist: String(values.artist ?? ''),
              year: String(values.year ?? ''),
              duration: String(values.duration ?? ''),
              favorite: Boolean(values.favorite)
            },
            item
          )
        )
        const saved = item
          ? services.music.updateMusicItem({ ...input, id: item.id })
          : services.music.createMusicItem(input)
        services.music.setMusicItemPlaylists({
          itemId: saved.id,
          playlistIds: playlists
            .filter((playlist) => Boolean(values[`playlist:${playlist.id}`]))
            .map((playlist) => playlist.id)
        })
        state.refresh()
      }
    })
  }

  const editPlaylist = (item?: MusicPlaylistRecord): void =>
    setForm({
      title: item ? 'Редактировать плейлист' : 'Новый плейлист',
      initial: { name: item?.name ?? '', coverUrl: item?.coverUrl ?? null },
      fields: [
        textField('name', 'Название'),
        textField('coverUrl', 'Обложка плейлиста', 'text', 'Ссылка http:// или https://')
      ],
      save: (values) => {
        const input = musicSchema.createMusicPlaylistInputSchema.parse({
          name: values.name,
          coverUrl: values.coverUrl || null
        })
        if (item) services.music.updateMusicPlaylist({ ...input, id: item.id })
        else services.music.createMusicPlaylist(input)
        state.refresh()
      }
    })

  const movieFilters = (): void =>
    setForm({
      title: 'Фильтры и сортировка',
      initial: { genre, type, year, director, actor, minRating, sort },
      fields: [
        textField('genre', 'Жанр'),
        choiceField('type', 'Тип', [
          { value: '', label: 'Все' },
          { value: 'movie', label: 'Фильм' },
          { value: 'series', label: 'Сериал' },
          { value: 'cartoon', label: 'Мультфильм' },
          { value: 'animated_series', label: 'Мультсериал' }
        ]),
        textField('year', 'Год; пусто — все'),
        textField('director', 'Режиссёр'),
        textField('actor', 'Актёр'),
        textField('minRating', 'Минимальная оценка 1–10'),
        choiceField('sort', 'Порядок', [
          { value: 'recent', label: 'Недавно изменённые' },
          { value: 'title', label: 'По названию' },
          { value: 'rating', label: 'По оценке' },
          { value: 'year', label: 'По году' }
        ])
      ],
      save: (values) => {
        setGenre(String(values.genre))
        setType(String(values.type))
        setYear(String(values.year))
        setDirector(String(values.director))
        setActor(String(values.actor))
        setMinRating(String(values.minRating))
        setSort(String(values.sort))
      }
    })

  const musicFilters = (): void => {
    const musicItems = (state.data?.items ?? []) as MusicItemRecord[]
    setForm({
      title: 'Фильтры библиотеки',
      initial: { artist: musicArtist, year: musicYear },
      fields: [
        choiceField('artist', 'Исполнитель', [
          { value: '', label: 'Все исполнители' },
          ...musicFilterArtists(musicItems).map((artistName) => ({
            value: artistName,
            label: artistName
          }))
        ]),
        choiceField('year', 'Год', [
          { value: '', label: 'Любой год' },
          ...musicFilterYears(musicItems).map((value) => ({
            value: String(value),
            label: String(value)
          }))
        ])
      ],
      save: (values) => {
        setMusicArtist(String(values.artist ?? ''))
        setMusicYear(String(values.year ?? ''))
      }
    })
  }

  const webSearch = async (searchQuery: string): Promise<void> => {
    setWebError('')
    try {
      await Linking.openURL(`https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`)
    } catch (reason) {
      setWebError(messageFor(reason))
    }
  }

  const movieItems = (mode === 'movies' ? ((state.data?.items ?? []) as MovieRecord[]) : [])
    .filter((item) => {
      const minRatingNumber = Number(minRating)
      return (
        (filter === 'all' || (filter === 'favorite' && item.favorite) || item.status === filter) &&
        (!genre ||
          item.genres.some((value) =>
            value.toLocaleLowerCase().includes(genre.toLocaleLowerCase())
          )) &&
        (!type || item.type === type) &&
        (!year || String(item.year) === year) &&
        (!director || item.director.toLocaleLowerCase().includes(director.toLocaleLowerCase())) &&
        (!actor ||
          item.actors.some((name) =>
            name.toLocaleLowerCase().includes(actor.toLocaleLowerCase())
          )) &&
        (!minRating ||
          !Number.isFinite(minRatingNumber) ||
          (item.rating ?? 0) >= minRatingNumber) &&
        [
          item.title,
          item.description,
          item.comments,
          ...item.genres,
          ...item.actors,
          item.director,
          item.originalTitle ?? ''
        ]
          .join(' ')
          .toLocaleLowerCase()
          .includes(query.toLocaleLowerCase())
      )
    })
    .sort((a, b) =>
      sort === 'title'
        ? a.title.localeCompare(b.title, 'ru')
        : sort === 'rating'
          ? (b.rating ?? 0) - (a.rating ?? 0)
          : sort === 'year'
            ? (b.year ?? 0) - (a.year ?? 0)
            : b.updatedAt - a.updatedAt
    )

  const movieAdvancedFiltersActive = Boolean(
    genre || type || year || director || actor || minRating || sort !== 'recent'
  )

  const musicItems = mode === 'music' ? ((state.data?.items ?? []) as MusicItemRecord[]) : []
  const musicPlaylists = mode === 'music' ? (state.data?.playlists ?? []) : []
  const selectedPlaylist = playlistId
    ? (musicPlaylists.find((playlist) => playlist.id === playlistId) ?? null)
    : null
  const normalizedQuery = query.trim().toLocaleLowerCase('ru')
  const visibleMusicItems = musicItems.filter((item) => {
    if (filter === 'favorite' && !item.favorite) return false
    if (playlistId && !selectedPlaylist?.trackIds.includes(item.id)) return false
    if (musicArtist && !item.artists.includes(musicArtist)) return false
    if (musicYear && item.year?.toString() !== musicYear) return false
    if (!normalizedQuery) return true
    return [item.title, ...item.artists].join(' ').toLocaleLowerCase('ru').includes(normalizedQuery)
  })
  const visiblePlaylists = musicPlaylists.filter((playlist) => {
    if (!normalizedQuery) return true
    if (playlist.name.toLocaleLowerCase('ru').includes(normalizedQuery)) return true
    return playlist.trackIds.some((itemId) => {
      const item = musicItems.find((entry) => entry.id === itemId)
      return item
        ? [item.title, ...item.artists].join(' ').toLocaleLowerCase('ru').includes(normalizedQuery)
        : false
    })
  })
  const musicView: MobileMusicView = playlistsView
    ? 'playlists'
    : playlistId
      ? 'playlist'
      : filter === 'favorite'
        ? 'favorites'
        : 'tracks'
  const musicTopTab: MusicTopTab =
    playlistId || playlistsView ? 'playlists' : filter === 'favorite' ? 'favorites' : 'tracks'
  const musicEmptyBecauseFilter =
    Boolean(normalizedQuery) || Boolean(musicArtist) || Boolean(musicYear)
  const musicAdvancedFiltersActive = Boolean(musicArtist || musicYear)

  const selectedMovie =
    mode === 'movies' && selectedMovieId
      ? ((state.data?.items as MovieRecord[] | undefined)?.find(
          (item) => item.id === selectedMovieId
        ) ?? null)
      : null

  const updateMovie = (movie: MovieRecord): void => {
    state.mutate(() => {
      services.movies.updateMovie(
        moviesSchema.updateMovieInputSchema.parse(movieRecordToUpdateInput(movie))
      )
    })
  }

  const updateMusic = (item: MusicItemRecord): void => {
    state.mutate(() => {
      services.music.updateMusicItem(
        musicSchema.updateMusicItemInputSchema.parse(musicRecordToUpdateInput(item))
      )
    })
  }

  const deletePlaylist = (playlist: MusicPlaylistRecord): void => {
    state.confirmDelete(
      'Удалить плейлист?',
      () => {
        services.music.deleteMusicPlaylist({ id: playlist.id })
        if (playlistId === playlist.id) {
          setPlaylistId(null)
          setPlaylistsView(true)
        }
      },
      'Треки останутся в музыкальной библиотеке. Удалится только сам плейлист.'
    )
  }

  if (mode === 'movies' && selectedMovie) {
    return (
      <View style={{ flex: 1 }}>
        {state.error && <ErrorState message={state.error} retry={state.refresh} />}
        {webError && <ErrorState message={webError} />}
        <MovieDetailView
          movie={selectedMovie}
          busy={state.pending}
          onBack={() => setSelectedMovieId(null)}
          onEdit={() => editMovie(selectedMovie)}
          onDelete={() =>
            state.confirmDelete('Удалить фильм?', () => {
              services.movies.deleteMovie({ id: selectedMovie.id })
              setSelectedMovieId(null)
            })
          }
          onUpdate={updateMovie}
          onSearchWeb={(searchQuery) => {
            void webSearch(searchQuery)
          }}
        />
        {form && <FormSheet spec={form} close={() => setForm(null)} />}
      </View>
    )
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ gap: 8, marginBottom: 12 }}>
        {mode === 'movies' ? (
          <SwipeTabBar
            items={MOVIE_STATUS_FILTERS}
            value={filter}
            onChange={changeMovieFilter}
            feedback={movieSwipeFeedback}
            search={{ value: query, onChangeText: setQuery }}
            renderIcon={(item, selected) => {
              const Icon = item.icon
              return (
                <Icon
                  size={19}
                  strokeWidth={selected ? 2.4 : 2}
                  color={selected ? theme.accent : theme.muted}
                />
              )
            }}
            trailing={
              <>
                <View
                  style={{
                    width: 1,
                    height: 26,
                    marginHorizontal: 2,
                    backgroundColor: theme.border
                  }}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Фильтры и сортировка"
                  accessibilityState={{ selected: movieAdvancedFiltersActive }}
                  disabled={state.pending}
                  onPress={movieFilters}
                  style={({ pressed }) => ({
                    position: 'relative',
                    flex: 1,
                    minWidth: 0,
                    height: 40,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 12,
                    backgroundColor: movieAdvancedFiltersActive
                      ? theme.accent + '18'
                      : pressed
                        ? theme.raised
                        : 'transparent',
                    opacity: state.pending ? 0.45 : pressed ? 0.72 : 1
                  })}
                >
                  <SlidersHorizontal
                    size={19}
                    strokeWidth={movieAdvancedFiltersActive ? 2.4 : 2}
                    color={movieAdvancedFiltersActive ? theme.accent : theme.muted}
                  />
                  {movieAdvancedFiltersActive ? (
                    <View
                      pointerEvents="none"
                      style={{
                        position: 'absolute',
                        top: 7,
                        right: 10,
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: theme.accent
                      }}
                    />
                  ) : null}
                </Pressable>
              </>
            }
          />
        ) : (
          <SwipeTabBar
            items={MUSIC_VIEW_FILTERS}
            value={musicTopTab}
            onChange={changeMusicTab}
            feedback={musicSwipeFeedback}
            search={{ value: query, onChangeText: setQuery }}
            renderIcon={(item, selected) => {
              const Icon = item.icon
              return (
                <Icon
                  size={19}
                  strokeWidth={selected ? 2.4 : 2}
                  color={selected ? theme.accent : theme.muted}
                />
              )
            }}
            trailing={
              <>
                <View
                  style={{
                    width: 1,
                    height: 26,
                    marginHorizontal: 2,
                    backgroundColor: theme.border
                  }}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Фильтры музыки"
                  accessibilityState={{
                    disabled: playlistsView || Boolean(playlistId),
                    selected: musicAdvancedFiltersActive
                  }}
                  disabled={state.pending || playlistsView || Boolean(playlistId)}
                  onPress={musicFilters}
                  style={({ pressed }) => ({
                    position: 'relative',
                    flex: 1,
                    minWidth: 0,
                    height: 40,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 12,
                    backgroundColor: musicAdvancedFiltersActive
                      ? theme.accent + '18'
                      : pressed
                        ? theme.raised
                        : 'transparent',
                    opacity:
                      state.pending || playlistsView || playlistId ? 0.34 : pressed ? 0.72 : 1
                  })}
                >
                  <SlidersHorizontal
                    size={19}
                    strokeWidth={musicAdvancedFiltersActive ? 2.4 : 2}
                    color={musicAdvancedFiltersActive ? theme.accent : theme.muted}
                  />
                  {musicAdvancedFiltersActive ? (
                    <View
                      pointerEvents="none"
                      style={{
                        position: 'absolute',
                        top: 7,
                        right: 10,
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: theme.accent
                      }}
                    />
                  ) : null}
                </Pressable>
              </>
            }
          />
        )}
      </View>

      {state.error && <ErrorState message={state.error} retry={state.refresh} />}
      {webError && <ErrorState message={webError} />}
      {state.loading ? (
        <LoadingState />
      ) : mode === 'movies' ? (
        <SwipeableTabContent
          tabs={MOVIE_STATUS_TAB_IDS}
          value={filter}
          onChange={changeMovieFilter}
          onSwipeChange={showMovieSwipeFeedback}
          disabled={state.pending}
        >
          <MovieLibraryView
            movies={movieItems}
            refreshing={state.loading}
            onRefresh={state.refresh}
            onOpen={(movie) => setSelectedMovieId(movie.id)}
            onToggleFavorite={(movie) => updateMovie({ ...movie, favorite: !movie.favorite })}
            onSearchWeb={(movie) => {
              void webSearch(movie.title)
            }}
          />
        </SwipeableTabContent>
      ) : (
        <SwipeableTabContent
          tabs={MUSIC_TAB_IDS}
          value={musicTopTab}
          onChange={changeMusicTab}
          onSwipeChange={showMusicSwipeFeedback}
          disabled={state.pending || Boolean(playlistId)}
        >
          <MusicLibraryView
            view={musicView}
            items={visibleMusicItems}
            playlists={visiblePlaylists}
            selectedPlaylist={selectedPlaylist}
            refreshing={state.loading}
            emptyBecauseFilter={musicEmptyBecauseFilter}
            onRefresh={state.refresh}
            onOpenTrack={editTrack}
            onToggleFavorite={(item) => updateMusic({ ...item, favorite: !item.favorite })}
            onSearchWeb={(item) => {
              setWebError('')
              void Linking.openURL(musicYoutubeSearchUrl(item)).catch((reason) => {
                setWebError(messageFor(reason))
              })
            }}
            onDeleteTrack={(item) =>
              state.confirmDelete(
                'Удалить трек?',
                () => services.music.deleteMusicItem({ id: item.id }),
                'Трек будет удалён из библиотеки и всех плейлистов.'
              )
            }
            onOpenPlaylist={(playlist) => {
              setQuery('')
              setFilter('all')
              setPlaylistId(playlist.id)
              setPlaylistsView(false)
            }}
            onEditPlaylist={editPlaylist}
            onDeletePlaylist={deletePlaylist}
            onBackToPlaylists={() => {
              setQuery('')
              setPlaylistId(null)
              setPlaylistsView(true)
            }}
          />
        </SwipeableTabContent>
      )}

      <MobileCreateAction
        label={mode === 'movies' ? 'Добавить фильм' : 'Добавить музыку'}
        iconOnly
        actions={
          mode === 'movies'
            ? [
                {
                  key: 'movie-form',
                  label: 'Заполнить форму',
                  description: 'Добавить фильм или сериал вручную',
                  icon: 'movies',
                  onPress: () => editMovie()
                },
                {
                  key: 'movie-json',
                  label: 'Из JSON',
                  description: 'Импортировать одну или несколько записей',
                  icon: 'json',
                  onPress: () => setJsonImportOpen(true)
                }
              ]
            : [
                {
                  key: 'track',
                  label: 'Добавить трек',
                  description: 'Создать новую музыкальную запись',
                  icon: 'music',
                  onPress: () => editTrack()
                },
                {
                  key: 'playlist',
                  label: 'Создать плейлист',
                  description: 'Создать плейлист и затем добавить в него треки',
                  icon: 'folder',
                  onPress: () => editPlaylist()
                }
              ]
        }
      />
      {form && <FormSheet spec={form} close={() => setForm(null)} />}
      {mode === 'movies' && jsonImportOpen && (
        <CatalogJsonImportModal
          mode="movies"
          close={() => setJsonImportOpen(false)}
          importMovies={(importedItems) => {
            services.movies.createMovies({ movies: importedItems })
            state.refresh()
          }}
          importMusic={(importedItems) => {
            services.music.createMusicItems({ items: importedItems })
            state.refresh()
          }}
        />
      )}
    </View>
  )
}
