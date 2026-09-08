import type { MovieRecord } from '@mymind/contracts/movies'
import type { MusicItemRecord } from '@mymind/contracts/music'
import { choiceField, textField, type FormField, type FormValues } from '../../shared/ui/form-model'

const commonFields: FormField[] = [
  textField('year', 'Год', 'nullableNumber'),
  textField('genres', 'Жанры', 'list', 'Через запятую'),
  textField('description', 'Описание', 'multiline'),
  textField('favorite', 'Избранное', 'boolean'),
  textField('rating', 'Оценка от 1 до 10', 'nullableNumber', 'После просмотра или прослушивания'),
  textField('comments', 'Мои заметки', 'multiline')
]
export const movieFields: FormField[] = [
  textField('title', 'Название'),
  textField('originalTitle', 'Оригинальное название'),
  choiceField('type', 'Тип', [
    { value: 'movie', label: 'Фильм' },
    { value: 'series', label: 'Сериал' },
    { value: 'cartoon', label: 'Мультфильм' },
    { value: 'animated_series', label: 'Мультсериал' }
  ]),
  choiceField('status', 'Статус', [
    { value: 'watchlist', label: 'Хочу посмотреть' },
    { value: 'watched', label: 'Просмотрено' }
  ]),
  textField('posterUrl', 'Ссылка на постер'),
  textField('director', 'Режиссёр'),
  textField('actors', 'Актёры', 'list', 'Через запятую'),
  textField('runtimeMinutes', 'Длительность фильма, мин', 'nullableNumber'),
  textField('seasonCount', 'Количество сезонов', 'nullableNumber'),
  textField('episodesPerSeason', 'Серий в сезоне', 'nullableNumber'),
  textField('episodeRuntimeMinutes', 'Длительность серии, мин', 'nullableNumber'),
  ...commonFields
]
export const musicFields: FormField[] = [
  textField('title', 'Название'),
  choiceField('type', 'Тип', [
    { value: 'track', label: 'Трек' },
    { value: 'album', label: 'Альбом' },
    { value: 'ep', label: 'EP' },
    { value: 'single', label: 'Сингл' }
  ]),
  choiceField('status', 'Статус', [
    { value: 'want_to_listen', label: 'Хочу послушать' },
    { value: 'listened', label: 'Прослушано' }
  ]),
  textField('coverUrl', 'Ссылка на обложку'),
  textField('artists', 'Исполнители', 'list', 'Через запятую'),
  textField('album', 'Альбом'),
  textField('durationSeconds', 'Длительность, секунды', 'nullableNumber'),
  textField('trackCount', 'Количество треков', 'nullableNumber'),
  ...commonFields
]
export function movieValues(item?: MovieRecord): FormValues {
  return {
    title: item?.title ?? '',
    originalTitle: item?.originalTitle ?? null,
    type: item?.type ?? 'movie',
    status: item?.status ?? 'watchlist',
    posterUrl: item?.posterUrl ?? null,
    director: item?.director ?? '',
    actors: item?.actors ?? [],
    runtimeMinutes: item?.runtimeMinutes ?? null,
    seasonCount: item?.seasonCount ?? null,
    episodesPerSeason: item?.episodesPerSeason ?? null,
    episodeRuntimeMinutes: item?.episodeRuntimeMinutes ?? null,
    year: item?.year ?? null,
    genres: item?.genres ?? [],
    description: item?.description ?? '',
    favorite: item?.favorite ?? false,
    rating: item?.rating ?? null,
    comments: item?.comments ?? ''
  }
}
export function musicValues(item?: MusicItemRecord): FormValues {
  return {
    title: item?.title ?? '',
    type: item?.type ?? 'track',
    status: item?.status ?? 'want_to_listen',
    coverUrl: item?.coverUrl ?? null,
    artists: item?.artists ?? [],
    album: item?.album ?? '',
    durationSeconds: item?.durationSeconds ?? null,
    trackCount: item?.trackCount ?? null,
    year: item?.year ?? null,
    genres: item?.genres ?? [],
    description: item?.description ?? '',
    favorite: item?.favorite ?? false,
    rating: item?.rating ?? null,
    comments: item?.comments ?? ''
  }
}
