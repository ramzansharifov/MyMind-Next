import { ipcMain, net, shell } from 'electron'

import { MUSIC_IPC_CHANNELS, type MusicEngineSearchInput, type MusicEnginePlaybackInput, type MusicRadioInput, type SetMusicSourceLinkInput } from '../../shared/contracts/music'
import { discoverYouTube, discoverYouTubeWithFallback } from '@mymind/core/music-youtube'
import { searchSoundCloud, searchYouTubeViaYtDlp, youtubeRadio } from '../services/music-yt-dlp'
import { localMusicStream } from '../services/music-audio-proxy'
import { parseSavedMusicSources } from '@mymind/core/music-discovery'
import { MUSIC_COLLECTION_KEY, parseMusicCollection } from '@mymind/core/music-collection'
import { getSqlite } from '../database/client'
import {
  createMusicItemInputSchema,
  createMusicItemsInputSchema,
  createMusicPlaylistInputSchema,
  deleteMusicItemInputSchema,
  deleteMusicPlaylistInputSchema,
  getMusicItemInputSchema,
  musicWebSearchInputSchema,
  setMusicItemPlaylistsInputSchema,
  updateMusicItemInputSchema,
  updateMusicPlaylistInputSchema,
  upsertMusicLibraryInputSchema
} from '../../shared/validation/music'
import {
  createMusicItem,
  createMusicItems,
  createMusicPlaylist,
  deleteMusicItem,
  deleteMusicPlaylist,
  getMusicItem,
  listMusicOverview,
  setMusicItemPlaylists,
  upsertMusicLibrary,
  updateMusicItem,
  updateMusicPlaylist
} from '../repositories/music.repository'
import { mainOperationTracker } from '../services/main-operation-tracker'

const MUSIC_SOURCE_KEY = 'music.sources.v1'

function readSourceLinks(): ReturnType<typeof parseSavedMusicSources> {
  const row = getSqlite().prepare('SELECT value FROM app_meta WHERE key = ?').get(MUSIC_SOURCE_KEY) as { value: string } | undefined
  return parseSavedMusicSources(row?.value)
}

function writeSourceLinks(links: ReturnType<typeof parseSavedMusicSources>): void {
  getSqlite().prepare(
    'INSERT INTO app_meta(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value = excluded.value,updated_at = excluded.updated_at'
  ).run(MUSIC_SOURCE_KEY, JSON.stringify(links), Date.now())
}

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
  ipcMain.handle(MUSIC_IPC_CHANNELS.upsertLibrary, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() =>
      upsertMusicLibrary(upsertMusicLibraryInputSchema.parse(rawInput))
    )
  )
  ipcMain.handle(MUSIC_IPC_CHANNELS.updateItem, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => updateMusicItem(updateMusicItemInputSchema.parse(rawInput)))
  )
  ipcMain.handle(MUSIC_IPC_CHANNELS.deleteItem, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => deleteMusicItem(deleteMusicItemInputSchema.parse(rawInput)))
  )
  ipcMain.handle(MUSIC_IPC_CHANNELS.createPlaylist, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() =>
      createMusicPlaylist(createMusicPlaylistInputSchema.parse(rawInput))
    )
  )
  ipcMain.handle(MUSIC_IPC_CHANNELS.updatePlaylist, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() =>
      updateMusicPlaylist(updateMusicPlaylistInputSchema.parse(rawInput))
    )
  )
  ipcMain.handle(MUSIC_IPC_CHANNELS.deletePlaylist, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() =>
      deleteMusicPlaylist(deleteMusicPlaylistInputSchema.parse(rawInput))
    )
  )
  ipcMain.handle(MUSIC_IPC_CHANNELS.setItemPlaylists, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() =>
      setMusicItemPlaylists(setMusicItemPlaylistsInputSchema.parse(rawInput))
    )
  )
  ipcMain.handle(MUSIC_IPC_CHANNELS.listSourceLinks, () =>
    mainOperationTracker.run(() => readSourceLinks())
  )
  ipcMain.handle(MUSIC_IPC_CHANNELS.setSourceLink, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => {
      const raw = rawInput as SetMusicSourceLinkInput | null
      if (!raw || typeof raw.itemId !== 'string' || !raw.track)
        throw new Error('Некорректная привязка музыкального источника')
      const candidate = parseSavedMusicSources(JSON.stringify({ [raw.itemId]: raw.track }))
      const track = candidate[raw.itemId]
      if (!track) throw new Error('Источник музыки не поддерживается')
      if (!getMusicItem({ id: raw.itemId })) throw new Error('Трек не найден в библиотеке')
      const links = readSourceLinks()
      links[raw.itemId] = track
      writeSourceLinks(links)
    })
  )
  ipcMain.handle(MUSIC_IPC_CHANNELS.streamingCollection, () =>
    mainOperationTracker.run(() => {
      const stored = getSqlite().prepare('SELECT value FROM app_meta WHERE key = ?')
        .get(MUSIC_COLLECTION_KEY) as { value: string } | undefined
      return stored?.value ?? null
    })
  )
  ipcMain.handle(MUSIC_IPC_CHANNELS.saveStreamingCollection, (_event, value: unknown) =>
    mainOperationTracker.run(() => {
      if (typeof value !== 'string' || value.length > 6_000_000)
        throw new Error('Размер музыкальной коллекции превышен')
      // Reject malformed or forged input; only provider-linked music persists.
      const parsed = parseMusicCollection(value)
      const canonical = JSON.stringify(parsed)
      getSqlite().prepare(
        'INSERT INTO app_meta(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at'
      ).run(MUSIC_COLLECTION_KEY, canonical, Date.now())
    })
  )
  ipcMain.handle(MUSIC_IPC_CHANNELS.engineSearch, (_event, rawInput: unknown) =>
    mainOperationTracker.run(async () => {
      const data = rawInput as MusicEngineSearchInput
      if (!data || (data.provider !== 'youtube' && data.provider !== 'soundcloud') ||
          typeof data.query !== 'string' || data.query.length > 180)
        throw new Error('Некорректные параметры поиска')
      return data.provider === 'youtube'
        ? discoverYouTubeWithFallback(
            data.query,
            (query) => discoverYouTube(query, {
              // Chromium networking respects system proxy/PAC settings. Node's
              // global fetch does not automatically use the Electron session.
              fetcher: (url, init) => net.fetch(String(url), init),
              timeoutMs: 9_000
            }),
            searchYouTubeViaYtDlp
          )
        : searchSoundCloud(data.query)
    })
  )
  ipcMain.handle(MUSIC_IPC_CHANNELS.engineResolve, (_event, rawInput: unknown) =>
    mainOperationTracker.run(async () => {
      const data = rawInput as MusicEnginePlaybackInput
      if (!data || (data.provider !== 'youtube' && data.provider !== 'soundcloud') ||
          typeof data.id !== 'string' || data.id.length > 180)
        throw new Error('Некорректные параметры воспроизведения')
      return localMusicStream(data.provider, data.id)
    })
  )
  ipcMain.handle(MUSIC_IPC_CHANNELS.engineRadio, (_event, rawInput: unknown) =>
    mainOperationTracker.run(async () => {
      const data = rawInput as MusicRadioInput
      if (!data || typeof data.videoId !== 'string' || !/^[A-Za-z0-9_-]{11}$/.test(data.videoId))
        throw new Error('Некорректный ID радио')
      return youtubeRadio(data.videoId)
    })
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
