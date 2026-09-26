import type { MovieRecord } from '@mymind/contracts/movies'
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
  {
    ...textField('runtimeMinutes', 'Длительность фильма, мин', 'nullableNumber'),
    visibleWhen: { key: 'type', oneOf: ['movie', 'cartoon'] }
  },
  {
    ...textField('seasonCount', 'Количество сезонов', 'nullableNumber'),
    visibleWhen: { key: 'type', oneOf: ['series', 'animated_series'] }
  },
  {
    ...textField('episodesPerSeason', 'Серий в сезоне', 'nullableNumber'),
    visibleWhen: { key: 'type', oneOf: ['series', 'animated_series'] }
  },
  {
    ...textField('episodeRuntimeMinutes', 'Длительность серии, мин', 'nullableNumber'),
    visibleWhen: { key: 'type', oneOf: ['series', 'animated_series'] }
  },
  ...commonFields.map((field) =>
    field.key === 'rating' ? { ...field, visibleWhen: { key: 'status', equals: 'watched' } } : field
  )
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
export function normalizeMovieFormValues(values: FormValues): FormValues {
  const episodic = values.type === 'series' || values.type === 'animated_series'
  return {
    ...values,
    runtimeMinutes: episodic ? null : values.runtimeMinutes,
    seasonCount: episodic ? values.seasonCount : null,
    episodesPerSeason: episodic ? values.episodesPerSeason : null,
    episodeRuntimeMinutes: episodic ? values.episodeRuntimeMinutes : null,
    rating: values.status === 'watched' ? values.rating : null
  }
}
