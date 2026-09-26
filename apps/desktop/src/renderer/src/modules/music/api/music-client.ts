import {
  normalizeMusicItemRecord,
  normalizeMusicOverview,
  normalizeMusicPlaylistRecord,
  type CreateMusicItemInput,
  type CreateMusicItemsInput,
  type CreateMusicPlaylistInput,
  type DeleteMusicItemInput,
  type DeleteMusicPlaylistInput,
  type GetMusicItemInput,
  type MusicItemRecord,
  type MusicOverview,
  type MusicPlaylistRecord,
  type MusicWebSearchInput,
  type SetMusicItemPlaylistsInput,
  type UpdateMusicItemInput,
  type UpdateMusicPlaylistInput
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
  async updateItem(input: UpdateMusicItemInput): Promise<MusicItemRecord> {
    return normalizeMusicItemRecord(await window.api.music.updateItem(input))
  },
  deleteItem(input: DeleteMusicItemInput): Promise<boolean> {
    return window.api.music.deleteItem(input)
  },
  async createPlaylist(input: CreateMusicPlaylistInput): Promise<MusicPlaylistRecord> {
    return normalizeMusicPlaylistRecord(await window.api.music.createPlaylist(input))
  },
  async updatePlaylist(input: UpdateMusicPlaylistInput): Promise<MusicPlaylistRecord> {
    return normalizeMusicPlaylistRecord(await window.api.music.updatePlaylist(input))
  },
  deletePlaylist(input: DeleteMusicPlaylistInput): Promise<boolean> {
    return window.api.music.deletePlaylist(input)
  },
  async setItemPlaylists(input: SetMusicItemPlaylistsInput): Promise<MusicPlaylistRecord[]> {
    return (await window.api.music.setItemPlaylists(input)).map(normalizeMusicPlaylistRecord)
  },
  searchWeb(input: MusicWebSearchInput): Promise<void> {
    return window.api.music.searchWeb(input)
  }
}
