import { useCallback, useState } from 'react'
import { FlatList, Linking, View } from 'react-native'
import type { MovieRecord } from '@mymind/contracts/movies'
import type { MusicItemRecord, MusicPlaylistRecord } from '@mymind/contracts/music'
import * as moviesSchema from '@mymind/core/validation/movies'
import * as musicSchema from '@mymind/core/validation/music'
import { useServices } from '../../app/context'
import { useCollection } from '../../shared/hooks/useCollection'
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  Row,
  SearchField
} from '../../shared/ui/primitives'
import { FormSheet } from '../../shared/ui/FormSheet'
import { choiceField, messageFor, textField, type FormSpec } from '../../shared/ui/form-model'
import { movieFields, movieValues, musicFields, musicValues } from './catalog-forms'

export function CatalogScreen({ mode }: { mode: 'movies' | 'music' }): React.JSX.Element {
  const services = useServices()
  const state = useCollection(
    useCallback(
      () => ({
        items:
          mode === 'movies'
            ? services.movies.listMoviesOverview().movies
            : services.music.listMusicOverview().items,
        playlists: mode === 'music' ? services.music.listMusicOverview().playlists : []
      }),
      [mode, services]
    )
  )
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('recent')
  const [genre, setGenre] = useState('')
  const [type, setType] = useState('')
  const [year, setYear] = useState('')
  const [playlistsView, setPlaylistsView] = useState(false)
  const [playlistId, setPlaylistId] = useState<string | null>(null)
  const [form, setForm] = useState<FormSpec | null>(null)
  const [webError, setWebError] = useState('')
  const done = mode === 'movies' ? 'watched' : 'listened'
  const want = mode === 'movies' ? 'watchlist' : 'want_to_listen'
  const edit = (item?: MovieRecord | MusicItemRecord): void =>
    setForm({
      title: item ? 'Редактирование' : mode === 'movies' ? 'Добавить фильм' : 'Добавить музыку',
      initial:
        mode === 'movies'
          ? movieValues(item as MovieRecord | undefined)
          : musicValues(item as MusicItemRecord | undefined),
      fields: mode === 'movies' ? movieFields : musicFields,
      save: (values) => {
        if (mode === 'movies') {
          const input = moviesSchema.createMovieInputSchema.parse({
            ...values,
            posterUrl: values.posterUrl || null,
            originalTitle: values.originalTitle || null
          })
          if (item) services.movies.updateMovie({ ...input, id: item.id })
          else services.movies.createMovie(input)
        } else {
          const input = musicSchema.createMusicItemInputSchema.parse({
            ...values,
            coverUrl: values.coverUrl || null
          })
          if (item) services.music.updateMusicItem({ ...input, id: item.id })
          else services.music.createMusicItem(input)
        }
        state.refresh()
      }
    })
  const editPlaylist = (item?: MusicPlaylistRecord): void =>
    setForm({
      title: 'Плейлист',
      initial: { name: item?.name ?? '', coverUrl: item?.coverUrl ?? null },
      fields: [textField('name', 'Название'), textField('coverUrl', 'Ссылка на обложку')],
      save: (values) => {
        const input = musicSchema.createMusicPlaylistInputSchema.parse({
          ...values,
          coverUrl: values.coverUrl || null
        })
        if (item) services.music.updateMusicPlaylist({ ...input, id: item.id })
        else services.music.createMusicPlaylist(input)
        state.refresh()
      }
    })
  const membership = (item: MusicItemRecord): void =>
    setForm({
      title: 'Добавить в плейлисты',
      initial: Object.fromEntries(
        (state.data?.playlists ?? []).map((p) => [p.id, p.trackIds.includes(item.id)])
      ),
      fields: (state.data?.playlists ?? []).map((p) => textField(p.id, p.name, 'boolean')),
      save: (values) => {
        services.music.setMusicItemPlaylists(
          musicSchema.setMusicItemPlaylistsInputSchema.parse({
            itemId: item.id,
            playlistIds: Object.entries(values)
              .filter(([, value]) => value)
              .map(([id]) => id)
          })
        )
        state.refresh()
      }
    })
  const filters = (): void =>
    setForm({
      title: 'Фильтры и сортировка',
      initial: { genre, type, year, sort },
      fields: [
        textField('genre', 'Жанр'),
        choiceField('type', 'Тип', [
          { value: '', label: 'Все' },
          ...(mode === 'movies'
            ? [
                { value: 'movie', label: 'Фильм' },
                { value: 'series', label: 'Сериал' },
                { value: 'cartoon', label: 'Мультфильм' },
                { value: 'animated_series', label: 'Мультсериал' }
              ]
            : [
                { value: 'track', label: 'Трек' },
                { value: 'album', label: 'Альбом' },
                { value: 'ep', label: 'EP' },
                { value: 'single', label: 'Сингл' }
              ])
        ]),
        textField('year', 'Год; пусто — все'),
        choiceField('sort', 'Порядок', [
          { value: 'recent', label: 'Недавно изменённые' },
          { value: 'title', label: 'По названию' },
          { value: 'rating', label: 'По оценке' },
          { value: 'year', label: 'По году' }
        ])
      ],
      save: (v) => {
        setGenre(String(v.genre))
        setType(String(v.type))
        setYear(String(v.year))
        setSort(String(v.sort))
      }
    })
  const webSearch = async (title: string): Promise<void> => {
    setWebError('')
    try {
      await Linking.openURL(`https://www.google.com/search?q=${encodeURIComponent(title)}`)
    } catch (reason) {
      setWebError(messageFor(reason))
    }
  }
  const items = (state.data?.items ?? [])
    .filter(
      (item) =>
        (filter === 'all' || (filter === 'favorite' && item.favorite) || item.status === filter) &&
        (!genre ||
          item.genres.some((g) => g.toLocaleLowerCase().includes(genre.toLocaleLowerCase()))) &&
        (!type || item.type === type) &&
        (!year || String(item.year) === year) &&
        (!playlistId ||
          state.data?.playlists.find((p) => p.id === playlistId)?.trackIds.includes(item.id)) &&
        [
          item.title,
          item.description,
          item.comments,
          ...item.genres,
          ...('artists' in item ? item.artists : item.actors),
          ...('director' in item ? [item.director, item.originalTitle ?? ''] : [item.album])
        ]
          .join(' ')
          .toLocaleLowerCase()
          .includes(query.toLocaleLowerCase())
    )
    .sort((a, b) =>
      sort === 'title'
        ? a.title.localeCompare(b.title, 'ru')
        : sort === 'rating'
          ? (b.rating ?? 0) - (a.rating ?? 0)
          : sort === 'year'
            ? (b.year ?? 0) - (a.year ?? 0)
            : b.updatedAt - a.updatedAt
    )
  return (
    <View style={{ flex: 1 }}>
      <View style={{ gap: 8, marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Button
            label={playlistsView ? '+ Плейлист' : '+ Добавить'}
            selected
            onPress={() => (playlistsView ? editPlaylist() : edit())}
          />
          {mode === 'music' && (
            <Button
              label={playlistsView ? 'Каталог' : 'Плейлисты'}
              onPress={() => setPlaylistsView(!playlistsView)}
            />
          )}
          <Button label="Фильтры" onPress={filters} />
        </View>
        <SearchField value={query} onChangeText={setQuery} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[
            { value: 'all', label: 'Все' },
            { value: want, label: 'В планах' },
            { value: done, label: mode === 'movies' ? 'Просмотрено' : 'Прослушано' },
            { value: 'favorite', label: 'Избранное' }
          ].map((f) => (
            <Button
              key={f.value}
              label={f.label}
              selected={filter === f.value}
              onPress={() => setFilter(f.value)}
            />
          ))}
          {playlistId && <Button label="Все плейлисты" onPress={() => setPlaylistId(null)} />}
        </View>
      </View>
      {state.error && <ErrorState message={state.error} retry={state.refresh} />}
      {webError && <ErrorState message={webError} />}
      {state.loading ? (
        <LoadingState />
      ) : playlistsView ? (
        <FlatList
          data={state.data?.playlists ?? []}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<EmptyState />}
          renderItem={({ item }) => (
            <Row
              title={item.name}
              subtitle={`${item.trackIds.length} треков`}
              onPress={() => {
                setPlaylistId(item.id)
                setPlaylistsView(false)
              }}
            >
              <Button label="Изменить" onPress={() => editPlaylist(item)} />
              <Button
                label="Удалить"
                danger
                onPress={() =>
                  state.confirmDelete(
                    'Удалить плейлист?',
                    () => {
                      services.music.deleteMusicPlaylist({ id: item.id })
                      if (playlistId === item.id) setPlaylistId(null)
                    },
                    'Треки останутся в каталоге.'
                  )
                }
              />
            </Row>
          )}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<EmptyState />}
          onRefresh={state.refresh}
          refreshing={state.loading}
          renderItem={({ item }) => (
            <Row
              title={`${item.favorite ? '★ ' : ''}${item.title}`}
              subtitle={[
                item.year,
                item.status === done ? '✓' : 'В планах',
                item.rating ? `${item.rating}/10` : '',
                item.genres.join(', '),
                'artists' in item ? item.artists.join(', ') : item.director,
                item.description
              ]
                .filter(Boolean)
                .join(' · ')}
              onPress={() => edit(item)}
            >
              <Button
                label="В интернете"
                onPress={() => {
                  void webSearch(item.title)
                }}
              />
              {mode === 'music' && item.type === 'track' && (
                <Button label="В плейлист" onPress={() => membership(item as MusicItemRecord)} />
              )}
              <Button
                label="Удалить"
                danger
                onPress={() =>
                  state.confirmDelete('Удалить запись?', () => {
                    if (mode === 'movies') services.movies.deleteMovie({ id: item.id })
                    else services.music.deleteMusicItem({ id: item.id })
                  })
                }
              />
            </Row>
          )}
        />
      )}
      {form && <FormSheet spec={form} close={() => setForm(null)} />}
    </View>
  )
}
