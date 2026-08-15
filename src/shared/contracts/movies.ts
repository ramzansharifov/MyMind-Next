export const MOVIE_STATUSES = ['watchlist', 'watched'] as const

export type MovieStatus = (typeof MOVIE_STATUSES)[number]

export interface MovieRecord {
  id: string
  title: string
  originalTitle: string | null
  year: number | null
  posterUrl: string | null
  director: string
  runtimeMinutes: number | null
  genres: string[]
  description: string
  status: MovieStatus
  favorite: boolean
  rating: number | null
  watchedAt: number | null
  notes: string
  createdAt: number
  updatedAt: number
}

export interface MoviesOverview {
  movies: MovieRecord[]
}

export interface CreateMovieInput {
  title: string
  originalTitle: string | null
  year: number | null
  posterUrl: string | null
  director: string
  runtimeMinutes: number | null
  genres: string[]
  description: string
  status: MovieStatus
  favorite: boolean
  rating: number | null
  watchedAt: number | null
  notes: string
}

export interface UpdateMovieInput extends CreateMovieInput {
  id: string
}

export interface GetMovieInput {
  id: string
}

export interface DeleteMovieInput {
  id: string
}

export const MOVIES_IPC_CHANNELS = {
  listOverview: 'movies:list-overview',
  getMovie: 'movies:get-movie',
  createMovie: 'movies:create-movie',
  updateMovie: 'movies:update-movie',
  deleteMovie: 'movies:delete-movie'
} as const

export interface MoviesApi {
  listOverview(): Promise<MoviesOverview>
  getMovie(input: GetMovieInput): Promise<MovieRecord | null>
  createMovie(input: CreateMovieInput): Promise<MovieRecord>
  updateMovie(input: UpdateMovieInput): Promise<MovieRecord>
  deleteMovie(input: DeleteMovieInput): Promise<boolean>
}
