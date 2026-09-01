import type {
  CreateMusicItemInput,
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
  listOverview(): Promise<MusicOverview> {
    return window.api.music.listOverview()
  },
  getItem(input: GetMusicItemInput): Promise<MusicItemRecord | null> {
    return window.api.music.getItem(input)
  },
  createItem(input: CreateMusicItemInput): Promise<MusicItemRecord> {
    return window.api.music.createItem(input)
  },
  createItems(input: CreateMusicItemsInput): Promise<MusicItemRecord[]> {
    return window.api.music.createItems(input)
  },
  updateItem(input: UpdateMusicItemInput): Promise<MusicItemRecord> {
    return window.api.music.updateItem(input)
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
