export interface MusicItemRecord {
  id: string
  title: string
  artist: string
  year: number | null
  durationSeconds: number | null
  favorite: boolean
  createdAt: number
  updatedAt: number
}

export interface MusicPlaylistRecord {
  id: string
  name: string
  coverUrl: string | null
  trackIds: string[]
  createdAt: number
  updatedAt: number
}

export interface MusicOverview {
  items: MusicItemRecord[]
  playlists: MusicPlaylistRecord[]
}

export interface CreateMusicItemInput {
  title: string
  artist: string
  year: number | null
  durationSeconds: number | null
  favorite: boolean
}

export interface UpdateMusicItemInput extends CreateMusicItemInput {
  id: string
}

export interface CreateMusicItemsInput {
  items: CreateMusicItemInput[]
}

export interface GetMusicItemInput {
  id: string
}

export interface DeleteMusicItemInput {
  id: string
}

export interface CreateMusicPlaylistInput {
  name: string
  coverUrl?: string | null
}

export interface UpdateMusicPlaylistInput {
  id: string
  name: string
  coverUrl?: string | null
}

export interface DeleteMusicPlaylistInput {
  id: string
}

export interface SetMusicItemPlaylistsInput {
  itemId: string
  playlistIds: string[]
}

export interface MusicWebSearchInput {
  query: string
}

export const MUSIC_IPC_CHANNELS = {
  listOverview: 'music:list-overview',
  getItem: 'music:get-item',
  createItem: 'music:create-item',
  createItems: 'music:create-items',
  updateItem: 'music:update-item',
  deleteItem: 'music:delete-item',
  createPlaylist: 'music:create-playlist',
  updatePlaylist: 'music:update-playlist',
  deletePlaylist: 'music:delete-playlist',
  setItemPlaylists: 'music:set-item-playlists',
  searchWeb: 'music:search-web'
} as const

export interface MusicApi {
  listOverview(): Promise<MusicOverview>
  getItem(input: GetMusicItemInput): Promise<MusicItemRecord | null>
  createItem(input: CreateMusicItemInput): Promise<MusicItemRecord>
  createItems(input: CreateMusicItemsInput): Promise<MusicItemRecord[]>
  updateItem(input: UpdateMusicItemInput): Promise<MusicItemRecord>
  deleteItem(input: DeleteMusicItemInput): Promise<boolean>
  createPlaylist(input: CreateMusicPlaylistInput): Promise<MusicPlaylistRecord>
  updatePlaylist(input: UpdateMusicPlaylistInput): Promise<MusicPlaylistRecord>
  deletePlaylist(input: DeleteMusicPlaylistInput): Promise<boolean>
  setItemPlaylists(input: SetMusicItemPlaylistsInput): Promise<MusicPlaylistRecord[]>
  searchWeb(input: MusicWebSearchInput): Promise<void>
}

export function stringifyMusicJson(
  value: MusicItemRecord | MusicPlaylistRecord | MusicOverview
): string {
  return JSON.stringify(value, null, 2) ?? ''
}
