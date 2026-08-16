import type { MovieType } from '../../../../shared/contracts/movies'

export const MOVIE_TYPE_OPTIONS: Array<{ value: MovieType; label: string }> = [
  { value: 'movie', label: 'Фильм' },
  { value: 'series', label: 'Сериал' },
  { value: 'cartoon', label: 'Мультфильм' },
  { value: 'animated_series', label: 'Мультсериал' },
  { value: 'anime', label: 'Аниме' }
]

const MOVIE_TYPE_LABELS = Object.fromEntries(
  MOVIE_TYPE_OPTIONS.map((option) => [option.value, option.label])
) as Record<MovieType, string>

export function movieTypeLabel(type: MovieType): string {
  return MOVIE_TYPE_LABELS[type]
}
