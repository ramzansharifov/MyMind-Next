import { ipcMain, shell } from 'electron'

import { MUSIC_IPC_CHANNELS } from '../../shared/contracts/music'
import {
  createMusicItemInputSchema,
  createMusicItemsInputSchema,
  deleteMusicItemInputSchema,
  getMusicItemInputSchema,
  musicWebSearchInputSchema,
  updateMusicItemInputSchema
} from '../../shared/validation/music'
import {
  createMusicItem,
  createMusicItems,
  deleteMusicItem,
  getMusicItem,
  listMusicOverview,
  updateMusicItem
} from '../repositories/music.repository'
import { mainOperationTracker } from '../services/main-operation-tracker'

export function registerMusicIpcHandlers(): void {
  Object.values(MUSIC_IPC_CHANNELS).forEach((channel) => ipcMain.removeHandler(channel))

  ipcMain.handle(MUSIC_IPC_CHANNELS.listOverview, () =>
    mainOperationTracker.run(() => listMusicOverview())
  )
  ipcMain.handle(MUSIC_IPC_CHANNELS.getItem, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => getMusicItem(getMusicItemInputSchema.parse(rawInput)))
  )
  ipcMain.handle(MUSIC_IPC_CHANNELS.createItem, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => createMusicItem(createMusicItemInputSchema.parse(rawInput)))
  )
  ipcMain.handle(MUSIC_IPC_CHANNELS.createItems, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => createMusicItems(createMusicItemsInputSchema.parse(rawInput)))
  )
  ipcMain.handle(MUSIC_IPC_CHANNELS.updateItem, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => updateMusicItem(updateMusicItemInputSchema.parse(rawInput)))
  )
  ipcMain.handle(MUSIC_IPC_CHANNELS.deleteItem, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => deleteMusicItem(deleteMusicItemInputSchema.parse(rawInput)))
  )
  ipcMain.handle(MUSIC_IPC_CHANNELS.searchWeb, (_event, rawInput: unknown) =>
    mainOperationTracker.run(async () => {
      const { query } = musicWebSearchInputSchema.parse(rawInput)
      const url = new URL('https://www.google.com/search')
      url.searchParams.set('q', query)
      await shell.openExternal(url.toString())
    })
  )
}
