import type {
  CreateMovieInput,
  CreateMoviesInput,
  DeleteMovieInput,
  GetMovieInput,
  MovieRecord,
  MovieWebSearchInput,
  MoviesApi,
  MoviesOverview,
  UpdateMovieInput
} from '../../../../../shared/contracts/movies'

function getMoviesApi(): MoviesApi {
  if (!window.api?.movies) {
    throw new Error('Movies API is not available')
  }
  return window.api.movies
}

export const moviesClient = {
  listOverview(): Promise<MoviesOverview> {
    return getMoviesApi().listOverview()
  },
  getMovie(input: GetMovieInput): Promise<MovieRecord | null> {
    return getMoviesApi().getMovie(input)
  },
  createMovie(input: CreateMovieInput): Promise<MovieRecord> {
    return getMoviesApi().createMovie(input)
  },
  createMovies(input: CreateMoviesInput): Promise<MovieRecord[]> {
    return getMoviesApi().createMovies(input)
  },
  updateMovie(input: UpdateMovieInput): Promise<MovieRecord> {
    return getMoviesApi().updateMovie(input)
  },
  deleteMovie(input: DeleteMovieInput): Promise<boolean> {
    return getMoviesApi().deleteMovie(input)
  },
  searchWeb(input: MovieWebSearchInput): Promise<void> {
    return getMoviesApi().searchWeb(input)
  }
}
