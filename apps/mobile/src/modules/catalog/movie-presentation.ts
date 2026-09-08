import type { MovieRecord, MovieType, UpdateMovieInput } from '@mymind/contracts/movies'

export interface MovieLibraryStats {
  total: number
  watched: number
  watchlist: number
  favorites: number
  rated: number
  averageRating: number | null
}

const MOVIE_TYPE_LABELS: Record<MovieType, string> = {
  movie: 'Фильм',
  series: 'Сериал',
  cartoon: 'Мультфильм',
  animated_series: 'Мультсериал'
}

export function movieTypeLabel(type: MovieType): string {
  return MOVIE_TYPE_LABELS[type]
}

export function isEpisodicMovieType(type: MovieType): boolean {
  return type === 'series' || type === 'animated_series'
}

export function formatMovieRuntime(minutes: number | null): string | null {
  if (minutes === null || minutes <= 0) return null
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  if (hours === 0) return `${remainder} мин`
  if (remainder === 0) return `${hours} ч`
  return `${hours} ч ${remainder} мин`
}

export function movieRecordToUpdateInput(movie: MovieRecord): UpdateMovieInput {
  return {
    id: movie.id,
    title: movie.title,
    originalTitle: movie.originalTitle,
    type: movie.type,
    year: movie.year,
    posterUrl: movie.posterUrl,
    director: movie.director,
    runtimeMinutes: movie.runtimeMinutes,
    seasonCount: movie.seasonCount,
    episodesPerSeason: movie.episodesPerSeason,
    episodeRuntimeMinutes: movie.episodeRuntimeMinutes,
    genres: movie.genres,
    actors: movie.actors,
    description: movie.description,
    status: movie.status,
    favorite: movie.favorite,
    rating: movie.rating,
    comments: movie.comments
  }
}

export function movieLibraryStats(movies: readonly MovieRecord[]): MovieLibraryStats {
  let watched = 0
  let watchlist = 0
  let favorites = 0
  let ratingTotal = 0
  let rated = 0

  for (const movie of movies) {
    if (movie.status === 'watched') watched += 1
    else watchlist += 1
    if (movie.favorite) favorites += 1
    if (movie.rating !== null) {
      ratingTotal += movie.rating
      rated += 1
    }
  }

  return {
    total: movies.length,
    watched,
    watchlist,
    favorites,
    rated,
    averageRating: rated === 0 ? null : Math.round((ratingTotal / rated) * 10) / 10
  }
}
