import { ipcMain, shell } from 'electron'

import { MOVIES_IPC_CHANNELS } from '../../shared/contracts/movies'
import {
  createMovieInputSchema,
  createMoviesInputSchema,
  deleteMovieInputSchema,
  getMovieInputSchema,
  movieWebSearchInputSchema,
  updateMovieInputSchema
} from '../../shared/validation/movies'
import {
  createMovie,
  createMovies,
  deleteMovie,
  getMovie,
  listMoviesOverview,
  updateMovie
} from '../repositories/movies.repository'
import { mainOperationTracker } from '../services/main-operation-tracker'

export function registerMoviesIpcHandlers(): void {
  Object.values(MOVIES_IPC_CHANNELS).forEach((channel) => ipcMain.removeHandler(channel))

  ipcMain.handle(MOVIES_IPC_CHANNELS.listOverview, () =>
    mainOperationTracker.run(() => listMoviesOverview())
  )
  ipcMain.handle(MOVIES_IPC_CHANNELS.getMovie, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => getMovie(getMovieInputSchema.parse(rawInput)))
  )
  ipcMain.handle(MOVIES_IPC_CHANNELS.createMovie, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => createMovie(createMovieInputSchema.parse(rawInput)))
  )
  ipcMain.handle(MOVIES_IPC_CHANNELS.createMovies, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => createMovies(createMoviesInputSchema.parse(rawInput)))
  )
  ipcMain.handle(MOVIES_IPC_CHANNELS.updateMovie, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => updateMovie(updateMovieInputSchema.parse(rawInput)))
  )
  ipcMain.handle(MOVIES_IPC_CHANNELS.deleteMovie, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => deleteMovie(deleteMovieInputSchema.parse(rawInput)))
  )
  ipcMain.handle(MOVIES_IPC_CHANNELS.searchWeb, (_event, rawInput: unknown) =>
    mainOperationTracker.run(async () => {
      const { query } = movieWebSearchInputSchema.parse(rawInput)
      const url = new URL('https://www.google.com/search')
      url.searchParams.set('q', query)
      await shell.openExternal(url.toString())
    })
  )
}
