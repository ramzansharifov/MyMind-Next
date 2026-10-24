import {
  normalizeMusicItemRecord,
  normalizeMusicOverview,
  type CreateMusicItemInput,
  CreateMusicItemsInput,
  CreateMusicPlaylistInput,
  DeleteMusicItemInput,
  DeleteMusicPlaylistInput,
  GetMusicItemInput,
  MusicItemRecord,
  MusicOverview,
  MusicPlaylistRecord,
  MusicWebSearchInput,
  type MusicEngineSearchInput,
  type MusicEnginePlaybackInput,
  type MusicRadioInput,
  type MusicEngineDownloadInput,
  type MusicEngineOfflineInput,
  type MusicSourceLink,
  type SetMusicSourceLinkInput,
  SetMusicItemPlaylistsInput,
  UpdateMusicItemInput,
  UpdateMusicPlaylistInput,
  UpsertMusicLibraryInput,
  UpsertMusicLibraryResult
} from '../../../../../shared/contracts/music'

export const musicClient = {
  async listOverview(): Promise<MusicOverview> {
    return normalizeMusicOverview(await window.api.music.listOverview())
  },
  async getItem(input: GetMusicItemInput): Promise<MusicItemRecord | null> {
    const item = await window.api.music.getItem(input)
    return item ? normalizeMusicItemRecord(item) : null
  },
  async createItem(input: CreateMusicItemInput): Promise<MusicItemRecord> {
    return normalizeMusicItemRecord(await window.api.music.createItem(input))
  },
  async createItems(input: CreateMusicItemsInput): Promise<MusicItemRecord[]> {
    return (await window.api.music.createItems(input)).map(normalizeMusicItemRecord)
  },
  async upsertLibrary(input: UpsertMusicLibraryInput): Promise<UpsertMusicLibraryResult> {
    const result = await window.api.music.upsertLibrary(input)
    return {
      ...result,
      overview: normalizeMusicOverview(result.overview)
    }
  },
  async updateItem(input: UpdateMusicItemInput): Promise<MusicItemRecord> {
    return normalizeMusicItemRecord(await window.api.music.updateItem(input))
  },
  deleteItem(input: DeleteMusicItemInput): Promise<boolean> {
    return window.api.music.deleteItem(input)
  },
  createPlaylist(input: CreateMusicPlaylistInput): Promise<MusicPlaylistRecord> {
    return window.api.music.createPlaylist(input)
  },
  updatePlaylist(input: UpdateMusicPlaylistInput): Promise<MusicPlaylistRecord> {
    return window.api.music.updatePlaylist(input)
  },
  deletePlaylist(input: DeleteMusicPlaylistInput): Promise<boolean> {
    return window.api.music.deletePlaylist(input)
  },
  setItemPlaylists(input: SetMusicItemPlaylistsInput): Promise<MusicPlaylistRecord[]> {
    return window.api.music.setItemPlaylists(input)
  },
  searchWeb(input: MusicWebSearchInput): Promise<void> {
    return window.api.music.searchWeb(input)
  },
  listSourceLinks(): Promise<Record<string, MusicSourceLink>> {
    return window.api.music.listSourceLinks()
  },
  setSourceLink(input: SetMusicSourceLinkInput): Promise<void> {
    return window.api.music.setSourceLink(input)
  },
  engineSearch(input: MusicEngineSearchInput): Promise<MusicSourceLink[]> {
    return window.api.music.engineSearch(input)
  },
  engineResolve(input: MusicEnginePlaybackInput): Promise<string> {
    return window.api.music.engineResolve(input)
  },
  engineRadio(input: MusicRadioInput): Promise<MusicSourceLink[]> {
    return window.api.music.engineRadio(input)
  },
  engineDownload(input: MusicEngineDownloadInput): Promise<string> {
    return window.api.music.engineDownload(input)
  },
  async offlineList(): Promise<string[]> {
    const handler = window.api.music.offlineList
    if (typeof handler !== 'function') {
      throw new Error(
        'Музыкальные загрузки обновились. Полностью закрой MyMind и запусти Electron заново.'
      )
    }
    return handler()
  },
  async offlineResolve(input: MusicEngineOfflineInput): Promise<string> {
    const handler = window.api.music.offlineResolve
    if (typeof handler !== 'function') {
      throw new Error('Для офлайн-воспроизведения требуется перезапуск MyMind.')
    }
    return handler(input)
  },
  async offlineRemove(input: MusicEngineOfflineInput): Promise<boolean> {
    const handler = window.api.music.offlineRemove
    if (typeof handler !== 'function') {
      throw new Error('Для удаления загрузки требуется перезапуск MyMind.')
    }
    return handler(input)
  },
  streamingCollection(): Promise<string | null> {
    return window.api.music.streamingCollection()
  },
  saveStreamingCollection(value: string): Promise<void> {
    return window.api.music.saveStreamingCollection(value)
  }
}
