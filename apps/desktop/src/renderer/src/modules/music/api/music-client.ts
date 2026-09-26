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
  SetMusicItemPlaylistsInput,
  UpdateMusicItemInput,
  UpdateMusicPlaylistInput
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
  }
}
