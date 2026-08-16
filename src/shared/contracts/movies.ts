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
  actors: string[]
  description: string
  status: MovieStatus
  favorite: boolean
  rating: number | null
  comments: string
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
  actors: string[]
  description: string
  status: MovieStatus
  favorite: boolean
  rating: number | null
  comments: string
}

export interface UpdateMovieInput extends CreateMovieInput {
  id: string
}

export interface CreateMoviesInput {
  movies: CreateMovieInput[]
}

export interface GetMovieInput {
  id: string
}

export interface DeleteMovieInput {
  id: string
}

export interface MovieWebSearchInput {
  query: string
}

export const MOVIES_IPC_CHANNELS = {
  listOverview: 'movies:list-overview',
  getMovie: 'movies:get-movie',
  createMovie: 'movies:create-movie',
  createMovies: 'movies:create-movies',
  updateMovie: 'movies:update-movie',
  deleteMovie: 'movies:delete-movie',
  searchWeb: 'movies:search-web'
} as const

export interface MoviesApi {
  listOverview(): Promise<MoviesOverview>
  getMovie(input: GetMovieInput): Promise<MovieRecord | null>
  createMovie(input: CreateMovieInput): Promise<MovieRecord>
  createMovies(input: CreateMoviesInput): Promise<MovieRecord[]>
  updateMovie(input: UpdateMovieInput): Promise<MovieRecord>
  deleteMovie(input: DeleteMovieInput): Promise<boolean>
  searchWeb(input: MovieWebSearchInput): Promise<void>
}
