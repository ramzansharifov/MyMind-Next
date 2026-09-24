import type { MovieRecord, MovieType } from '@mymind/contracts/movies'

export type MovieSort = 'recent' | 'title' | 'rating' | 'year'

export interface MovieAdvancedFilters {
  types: MovieType[]
  genre: string
  year: string
  director: string
  actor: string
  minRating: number
  sort: MovieSort
}

export interface MovieFilterOptions {
  genres: string[]
  directors: string[]
  actors: string[]
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase('ru')
}

function uniqueSorted(values: readonly string[]): string[] {
  const seen = new Map<string, string>()
  for (const raw of values) {
    const value = raw.trim()
    if (!value) continue
    const key = normalize(value)
    if (!seen.has(key)) seen.set(key, value)
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, 'ru'))
}

export function collectMovieFilterOptions(movies: readonly MovieRecord[]): MovieFilterOptions {
  return {
    genres: uniqueSorted(movies.flatMap((movie) => movie.genres)),
    directors: uniqueSorted(movies.map((movie) => movie.director)),
    actors: uniqueSorted(movies.flatMap((movie) => movie.actors))
  }
}

export function movieMatchesAdvancedFilters(
  movie: MovieRecord,
  filters: MovieAdvancedFilters
): boolean {
  const year = filters.year.trim()
  const genre = normalize(filters.genre)
  const director = normalize(filters.director)
  const actor = normalize(filters.actor)

  return (
    (!filters.types.length || filters.types.includes(movie.type)) &&
    (!genre || movie.genres.some((value) => normalize(value) === genre)) &&
    (!year || String(movie.year ?? '') === year) &&
    (!director || normalize(movie.director) === director) &&
    (!actor || movie.actors.some((value) => normalize(value) === actor)) &&
    (filters.minRating <= 0 || (movie.rating ?? 0) >= filters.minRating)
  )
}

export function sortMovieRecords(
  movies: readonly MovieRecord[],
  sort: MovieSort
): MovieRecord[] {
  return [...movies].sort((a, b) =>
    sort === 'title'
      ? a.title.localeCompare(b.title, 'ru')
      : sort === 'rating'
        ? (b.rating ?? 0) - (a.rating ?? 0)
        : sort === 'year'
          ? (b.year ?? 0) - (a.year ?? 0)
          : b.updatedAt - a.updatedAt
  )
}

export function movieAdvancedFiltersActive(filters: MovieAdvancedFilters): boolean {
  return Boolean(
    filters.types.length ||
      filters.genre ||
      filters.year ||
      filters.director ||
      filters.actor ||
      filters.minRating > 0 ||
      filters.sort !== 'recent'
  )
}
