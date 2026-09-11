import { useCallback, useState } from 'react'
import { Linking, View } from 'react-native'
import type { MovieRecord } from '@mymind/contracts/movies'
import type { MusicItemRecord, MusicPlaylistRecord } from '@mymind/contracts/music'
import * as moviesSchema from '@mymind/core/validation/movies'
import * as musicSchema from '@mymind/core/validation/music'
import { useServices } from '../../app/context'
import { useCollection } from '../../shared/hooks/useCollection'
import { Button, ErrorState, LoadingState, SearchField } from '../../shared/ui/primitives'
import { FormSheet } from '../../shared/ui/FormSheet'
import { MobileCreateAction } from '../../shared/ui/MobileCreateAction'
import { choiceField, messageFor, textField, type FormSpec } from '../../shared/ui/form-model'
import { movieFields, movieValues } from './catalog-forms'
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
  musicTrackInputFromDraft
} from './music-presentation'

export function CatalogScreen({ mode }: { mode: 'movies' | 'music' }): React.JSX.Element {
  const services = useServices()
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
  const [filter, setFilter] = useState('all')
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

  const editMovie = (item?: MovieRecord): void =>
    setForm({
      title: item ? 'Редактирование' : 'Добавить фильм',
      initial: movieValues(item),
      fields: movieFields,
      save: (values) => {
        const input = moviesSchema.createMovieInputSchema.parse({
          ...values,
          posterUrl: values.posterUrl || null,
          originalTitle: values.originalTitle || null
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

  const movieItems = ((state.data?.items ?? []) as MovieRecord[])
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

  const musicItems = (state.data?.items ?? []) as MusicItemRecord[]
  const musicPlaylists = state.data?.playlists ?? []
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
  const musicEmptyBecauseFilter =
    Boolean(normalizedQuery) || Boolean(musicArtist) || Boolean(musicYear)

  const selectedMovie = selectedMovieId
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
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Button label="Из JSON" onPress={() => setJsonImportOpen(true)} />
              <Button label="Фильтры" onPress={movieFilters} />
            </View>
            <SearchField value={query} onChangeText={setQuery} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {[
                { value: 'all', label: 'Все' },
                { value: 'watchlist', label: 'В планах' },
                { value: 'watched', label: 'Просмотрено' },
                { value: 'favorite', label: 'Избранное' }
              ].map((item) => (
                <Button
                  key={item.value}
                  label={item.label}
                  selected={filter === item.value}
                  onPress={() => setFilter(item.value)}
                />
              ))}
            </View>
          </>
        ) : (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {!playlistsView && <Button label="Фильтры" onPress={musicFilters} />}
            </View>
            <SearchField value={query} onChangeText={setQuery} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Button
                label="Все треки"
                selected={musicView === 'tracks'}
                onPress={() => {
                  setQuery('')
                  setFilter('all')
                  setPlaylistId(null)
                  setPlaylistsView(false)
                }}
              />
              <Button
                label="Избранное"
                selected={musicView === 'favorites'}
                onPress={() => {
                  setQuery('')
                  setFilter('favorite')
                  setPlaylistId(null)
                  setPlaylistsView(false)
                }}
              />
              <Button
                label="Плейлисты"
                selected={musicView === 'playlists' || musicView === 'playlist'}
                onPress={() => {
                  setQuery('')
                  setFilter('all')
                  setPlaylistId(null)
                  setPlaylistsView(true)
                }}
              />
            </View>
          </>
        )}
      </View>

      {state.error && <ErrorState message={state.error} retry={state.refresh} />}
      {webError && <ErrorState message={webError} />}
      {state.loading ? (
        <LoadingState />
      ) : mode === 'movies' ? (
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
      ) : (
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
            const artist = item.artists[0]
            void webSearch(`Слушать ${item.title}${artist ? ` ${artist}` : ''}`)
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
      )}

      <MobileCreateAction
        actions={
          mode === 'movies'
            ? [
                {
                  key: 'movie',
                  label: 'Добавить фильм',
                  description: 'Создать запись фильма или сериала',
                  icon: 'movies',
                  onPress: () => editMovie()
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
                  label: 'Новый плейлист',
                  description: 'Создать плейлист и добавить в него треки',
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
