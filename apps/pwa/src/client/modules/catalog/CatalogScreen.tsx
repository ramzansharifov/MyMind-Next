import { openExternalUrl, Action } from '../../../ui/browser'
import { useCallback, useState } from 'react'
import {
  Bookmark,
  Braces,
  Check,
  Film,
  Heart,
  ListMusic,
  Music2,
  SlidersHorizontal,
  type LucideIcon
} from 'lucide-react'
import { stringifyMovieJson, type MovieRecord } from '@mymind/contracts/movies'
import {
  normalizeMusicItemRecord,
  stringifyMusicJson,
  type MusicItemRecord,
  type MusicPlaylistRecord
} from '@mymind/contracts/music'
import * as moviesSchema from '@mymind/core/validation/movies'
import * as musicSchema from '@mymind/core/validation/music'
import { useServices } from '../../app/context'
import { useCollection } from '../../shared/hooks/useCollection'
import { ErrorState, LoadingState } from '../../shared/ui/primitives'
import { FormSheet } from '../../shared/ui/FormSheet'
import { MobileCreateAction } from '../../shared/ui/MobileCreateAction'
import { messageFor, textField, type FormSpec } from '../../shared/ui/form-model'
import { useTheme } from '../../shared/ui/theme'
import { SwipeableTabContent } from '../../shared/ui/SwipeableTabContent'
import { SwipeTabBar } from '../../shared/ui/SwipeTabBar'
import { useSwipeTabFeedback } from '../../shared/ui/useSwipeTabFeedback'
import { movieFields, movieValues, normalizeMovieFormValues } from './catalog-forms'
import { CatalogJsonImportModal } from './CatalogJsonImportModal'
import { CatalogJsonViewerModal } from './CatalogJsonViewerModal'
import { MovieDetailView } from './MovieDetailView'
import { MovieLibraryView } from './MovieLibraryView'
import { MovieFiltersSheet } from './MovieFiltersSheet'
import { MusicFiltersSheet } from './MusicFiltersSheet'
import { MusicLibraryView, type MobileMusicView } from './MusicLibraryView'
import {
  movieAdvancedFiltersActive,
  movieMatchesAdvancedFilters,
  sortMovieRecords,
  type MovieAdvancedFilters
} from './movie-filters'
import { movieRecordToUpdateInput } from './movie-presentation'
import {
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
  const [movieAdvancedFilters, setMovieAdvancedFilters] = useState<MovieAdvancedFilters>({
    types: [],
    genre: '',
    year: '',
    director: '',
    actor: '',
    minRating: 0,
    sort: 'recent'
  })
  const [movieFiltersOpen, setMovieFiltersOpen] = useState(false)
  const [musicFiltersOpen, setMusicFiltersOpen] = useState(false)
  const [musicArtist, setMusicArtist] = useState('')
  const [musicYear, setMusicYear] = useState('')
  const [playlistsView, setPlaylistsView] = useState(false)
  const [playlistId, setPlaylistId] = useState<string | null>(null)
  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(null)
  const [form, setForm] = useState<FormSpec | null>(null)
  const [jsonImportOpen, setJsonImportOpen] = useState(false)
  const [jsonView, setJsonView] = useState<{
    title: string
    description: string
    json: string
    note: string
    accessibilityLabel: string
  } | null>(null)
  const [webError, setWebError] = useState('')
  const [movieSwipeFeedback, showMovieSwipeFeedback] = useSwipeTabFeedback<MovieStatusFilter>()
  const [musicSwipeFeedback, showMusicSwipeFeedback] = useSwipeTabFeedback<MusicTopTab>()
  const [searchOpen, setSearchOpen] = useState(false)
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
          musicTrackInputFromDraft({
            title: String(values.title ?? ''),
            artist: String(values.artist ?? ''),
            year: String(values.year ?? ''),
            duration: String(values.duration ?? ''),
            favorite: Boolean(values.favorite)
          })
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
  const webSearch = async (searchQuery: string): Promise<void> => {
    setWebError('')
    try {
      await openExternalUrl(`https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`)
    } catch (reason) {
      setWebError(messageFor(reason))
    }
  }
  const allMovieItems = mode === 'movies' ? ((state.data?.items ?? []) as MovieRecord[]) : []
  const normalizedMovieQuery = query.trim().toLocaleLowerCase('ru')
  const movieItems = sortMovieRecords(
    allMovieItems.filter((item) => {
      const statusMatches =
        filter === 'all' || (filter === 'favorite' && item.favorite) || item.status === filter
      if (!statusMatches || !movieMatchesAdvancedFilters(item, movieAdvancedFilters)) return false
      if (!normalizedMovieQuery) return true
      return [
        item.title,
        item.description,
        item.comments,
        ...item.genres,
        ...item.actors,
        item.director,
        item.originalTitle ?? ''
      ]
        .join(' ')
        .toLocaleLowerCase('ru')
        .includes(normalizedMovieQuery)
    }),
    movieAdvancedFilters.sort
  )
  const movieFiltersActive = movieAdvancedFiltersActive(movieAdvancedFilters)
  const musicItems =
    mode === 'music'
      ? ((state.data?.items ?? []) as MusicItemRecord[]).map(normalizeMusicItemRecord)
      : []
  const musicPlaylists = mode === 'music' ? (state.data?.playlists ?? []) : []
  const selectedPlaylist = playlistId
    ? (musicPlaylists.find((playlist) => playlist.id === playlistId) ?? null)
    : null
  const normalizedQuery = query.trim().toLocaleLowerCase('ru')
  const visibleMusicItems = musicItems.filter((item) => {
    if (filter === 'favorite' && !item.favorite) return false
    if (playlistId && !selectedPlaylist?.trackIds.includes(item.id)) return false
    if (musicArtist && item.artist !== musicArtist) return false
    if (musicYear && item.year?.toString() !== musicYear) return false
    if (!normalizedQuery) return true
    return [item.title, item.artist].join(' ').toLocaleLowerCase('ru').includes(normalizedQuery)
  })
  const visiblePlaylists = musicPlaylists.filter((playlist) => {
    if (!normalizedQuery) return true
    if (playlist.name.toLocaleLowerCase('ru').includes(normalizedQuery)) return true
    return playlist.trackIds.some((itemId) => {
      const item = musicItems.find((entry) => entry.id === itemId)
      return item
        ? [item.title, item.artist].join(' ').toLocaleLowerCase('ru').includes(normalizedQuery)
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
      <div
        className="ui-stack"
        style={{
          flex: '1 1 0%'
        }}
      >
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
          onViewJson={() =>
            setJsonView({
              title: `JSON · ${selectedMovie.title}`,
              description: 'Полная сохранённая запись этого фильма',
              json: stringifyMovieJson(selectedMovie),
              note: 'Оставьте id, чтобы повторная вставка JSON обновила именно этот фильм. createdAt и updatedAt при импорте не подменяют локальные временные метки.',
              accessibilityLabel: 'JSON данных фильма'
            })
          }
          onUpdate={updateMovie}
          onSearchWeb={(searchQuery) => {
            void webSearch(searchQuery)
          }}
        />
        {form && <FormSheet spec={form} close={() => setForm(null)} />}
        {jsonView ? (
          <CatalogJsonViewerModal
            title={jsonView.title}
            description={jsonView.description}
            json={jsonView.json}
            note={jsonView.note}
            accessibilityLabel={jsonView.accessibilityLabel}
            close={() => setJsonView(null)}
          />
        ) : null}
      </div>
    )
  }
  return (
    <div
      className="ui-stack"
      style={{
        flex: '1 1 0%'
      }}
    >
      <div
        className="ui-stack"
        style={{
          gap: 8,
          marginBottom: 12
        }}
      >
        {mode === 'movies' ? (
          <SwipeTabBar
            items={MOVIE_STATUS_FILTERS}
            value={filter}
            onChange={changeMovieFilter}
            feedback={movieSwipeFeedback}
            search={{ value: query, onValueChange: setQuery }}
            onSearchOpenChange={setSearchOpen}
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
                <div
                  className="ui-stack"
                  style={{
                    width: 1,
                    height: 26,
                    marginInline: 2,
                    backgroundColor: theme.border
                  }}
                ></div>
                <Action
                  role={'button'}
                  aria-label={'JSON библиотеки'}
                  disabled={state.pending}
                  onClick={() =>
                    setJsonView({
                      title: 'JSON библиотеки',
                      description: `Полные сохранённые данные всех фильмов · ${allMovieItems.length}`,
                      json: stringifyMovieJson(allMovieItems),
                      note: 'JSON библиотеки можно вставить обратно: фильмы с существующим id обновятся, новые записи создадутся. createdAt и updatedAt не подменяют локальные временные метки.',
                      accessibilityLabel: 'JSON данных фильмов'
                    })
                  }
                  style={{
                    flex: '1 1 0%',
                    minWidth: 0,
                    height: 40,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 12,
                    backgroundColor: 'transparent',
                    opacity: state.pending ? 0.45 : 1
                  }}
                  pressedStyle={{
                    backgroundColor: theme.raised,
                    opacity: state.pending ? 0.45 : 0.72
                  }}
                >
                  <Braces size={19} strokeWidth={2} color={theme.muted} />
                </Action>
                <Action
                  role={'button'}
                  aria-label={'Фильтры и сортировка'}
                  aria-selected={movieFiltersActive}
                  disabled={state.pending}
                  onClick={() => setMovieFiltersOpen(true)}
                  style={{
                    position: 'relative',
                    flex: '1 1 0%',
                    minWidth: 0,
                    height: 40,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 12,
                    backgroundColor: movieFiltersActive ? theme.accent + '18' : 'transparent',
                    opacity: state.pending ? 0.45 : 1
                  }}
                  pressedStyle={{
                    backgroundColor: movieFiltersActive ? theme.accent + '18' : theme.raised,
                    opacity: state.pending ? 0.45 : 0.72
                  }}
                >
                  <SlidersHorizontal
                    size={19}
                    strokeWidth={movieFiltersActive ? 2.4 : 2}
                    color={movieFiltersActive ? theme.accent : theme.muted}
                  />
                  {movieFiltersActive ? (
                    <div
                      className="ui-stack"
                      style={{
                        position: 'absolute',
                        top: 7,
                        right: 10,
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: theme.accent,
                        pointerEvents: 'none'
                      }}
                    ></div>
                  ) : null}
                </Action>
              </>
            }
          />
        ) : (
          <SwipeTabBar
            items={MUSIC_VIEW_FILTERS}
            value={musicTopTab}
            onChange={changeMusicTab}
            feedback={musicSwipeFeedback}
            search={{ value: query, onValueChange: setQuery }}
            onSearchOpenChange={setSearchOpen}
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
                <div
                  className="ui-stack"
                  style={{
                    width: 1,
                    height: 26,
                    marginInline: 2,
                    backgroundColor: theme.border
                  }}
                ></div>
                <Action
                  role={'button'}
                  aria-label={'JSON музыкальной библиотеки'}
                  disabled={state.pending}
                  onClick={() =>
                    setJsonView({
                      title: 'JSON музыкальной библиотеки',
                      description: `Полные данные: ${musicItems.length} записей · ${musicPlaylists.length} плейлистов`,
                      json: stringifyMusicJson({ items: musicItems, playlists: musicPlaylists }),
                      note: 'Полный MusicOverview можно вставить обратно целиком: существующие id обновятся, новые создадутся, а trackIds восстановят состав плейлистов.',
                      accessibilityLabel: 'JSON данных музыки'
                    })
                  }
                  style={{
                    flex: '1 1 0%',
                    minWidth: 0,
                    height: 40,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 12,
                    backgroundColor: 'transparent',
                    opacity: state.pending ? 0.45 : 1
                  }}
                  pressedStyle={{
                    backgroundColor: theme.raised,
                    opacity: state.pending ? 0.45 : 0.72
                  }}
                >
                  <Braces size={19} strokeWidth={2} color={theme.muted} />
                </Action>
                <Action
                  role={'button'}
                  aria-label={'Фильтры музыки'}
                  aria-disabled={playlistsView || Boolean(playlistId)}
                  aria-selected={musicAdvancedFiltersActive}
                  disabled={state.pending || playlistsView || Boolean(playlistId)}
                  onClick={() => setMusicFiltersOpen(true)}
                  style={{
                    position: 'relative',
                    flex: '1 1 0%',
                    minWidth: 0,
                    height: 40,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 12,
                    backgroundColor: musicAdvancedFiltersActive
                      ? theme.accent + '18'
                      : 'transparent',
                    opacity: state.pending || playlistsView || playlistId ? 0.34 : 1
                  }}
                  pressedStyle={{
                    backgroundColor: musicAdvancedFiltersActive
                      ? theme.accent + '18'
                      : theme.raised,
                    opacity: state.pending || playlistsView || playlistId ? 0.34 : 0.72
                  }}
                >
                  <SlidersHorizontal
                    size={19}
                    strokeWidth={musicAdvancedFiltersActive ? 2.4 : 2}
                    color={musicAdvancedFiltersActive ? theme.accent : theme.muted}
                  />
                  {musicAdvancedFiltersActive ? (
                    <div
                      className="ui-stack"
                      style={{
                        position: 'absolute',
                        top: 7,
                        right: 10,
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: theme.accent,
                        pointerEvents: 'none'
                      }}
                    ></div>
                  ) : null}
                </Action>
              </>
            }
          />
        )}
      </div>

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
          disabled={state.pending || searchOpen}
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
          disabled={state.pending || Boolean(playlistId) || searchOpen}
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
            onViewJson={(item) =>
              setJsonView({
                title: `JSON · ${item.title}`,
                description: 'Полная сохранённая запись этого трека',
                json: stringifyMusicJson(item),
                note: 'Оставьте id, чтобы повторная вставка JSON обновила именно этот трек. createdAt и updatedAt при импорте не подменяют локальные временные метки.',
                accessibilityLabel: 'JSON данных трека'
              })
            }
            onViewPlaylistJson={(playlist) =>
              setJsonView({
                title: `JSON · ${playlist.name}`,
                description: 'Полная сохранённая запись этого плейлиста',
                json: stringifyMusicJson(playlist),
                note: 'Оставьте id, чтобы обновить этот же плейлист. trackIds задают его состав при импорте.',
                accessibilityLabel: 'JSON данных плейлиста'
              })
            }
            onToggleFavorite={(item) => updateMusic({ ...item, favorite: !item.favorite })}
            onSearchWeb={(item) => {
              setWebError('')
              void openExternalUrl(musicYoutubeSearchUrl(item)).catch((reason) => {
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
                  onClick: () => editMovie()
                },
                {
                  key: 'movie-json',
                  label: 'Из JSON',
                  description: 'Импортировать одну или несколько записей',
                  icon: 'json',
                  onClick: () => setJsonImportOpen(true)
                }
              ]
            : [
                {
                  key: 'track',
                  label: 'Добавить трек',
                  description: 'Создать новую музыкальную запись',
                  icon: 'music',
                  onClick: () => editTrack()
                },
                {
                  key: 'playlist',
                  label: 'Создать плейлист',
                  description: 'Создать плейлист и затем добавить в него треки',
                  icon: 'folder',
                  onClick: () => editPlaylist()
                },
                {
                  key: 'music-json',
                  label: 'Из JSON',
                  description: 'Импортировать одну или несколько музыкальных записей',
                  icon: 'json',
                  onClick: () => setJsonImportOpen(true)
                }
              ]
        }
      />
      {form && <FormSheet spec={form} close={() => setForm(null)} />}
      {mode === 'movies' && movieFiltersOpen ? (
        <MovieFiltersSheet
          movies={allMovieItems}
          value={movieAdvancedFilters}
          onClose={() => setMovieFiltersOpen(false)}
          onApply={setMovieAdvancedFilters}
        />
      ) : null}
      {mode === 'music' && musicFiltersOpen ? (
        <MusicFiltersSheet
          items={musicItems}
          value={{ artist: musicArtist, year: musicYear }}
          onClose={() => setMusicFiltersOpen(false)}
          onApply={(next) => {
            setMusicArtist(next.artist)
            setMusicYear(next.year)
          }}
        />
      ) : null}
      {jsonImportOpen ? (
        <CatalogJsonImportModal
          mode={mode}
          close={() => setJsonImportOpen(false)}
          importMovies={(importedItems) => {
            services.movies.upsertMovies({ movies: importedItems })
            state.refresh()
          }}
          importMusic={(input) => {
            services.music.upsertMusicLibrary(input)
            state.refresh()
          }}
        />
      ) : null}
      {jsonView ? (
        <CatalogJsonViewerModal
          title={jsonView.title}
          description={jsonView.description}
          json={jsonView.json}
          note={jsonView.note}
          accessibilityLabel={jsonView.accessibilityLabel}
          close={() => setJsonView(null)}
        />
      ) : null}
    </div>
  )
}
