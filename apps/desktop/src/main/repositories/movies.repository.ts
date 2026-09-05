import { createMoviesRepository } from '@mymind/persistence/movies'
import { desktopRepositoryRuntime } from '../database/repository-runtime'

export const { listMoviesOverview, getMovie, createMovie, createMovies, updateMovie, deleteMovie } =
  createMoviesRepository(desktopRepositoryRuntime)
