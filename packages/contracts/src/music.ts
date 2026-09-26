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

export function normalizeMusicItemRecord(value: unknown): MusicItemRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Некорректная музыкальная запись')
  }

  const source = value as Record<string, unknown>
  const legacyArtists = Array.isArray(source.artists)
    ? source.artists.filter((artist): artist is string => typeof artist === 'string')
    : []
  const artist =
    typeof source.artist === 'string'
      ? source.artist.trim()
      : (legacyArtists.find((candidate) => candidate.trim())?.trim() ?? '')

  return {
    id: typeof source.id === 'string' ? source.id : '',
    title: typeof source.title === 'string' ? source.title : '',
    artist,
    year: typeof source.year === 'number' && Number.isFinite(source.year) ? source.year : null,
    durationSeconds:
      typeof source.durationSeconds === 'number' && Number.isFinite(source.durationSeconds)
        ? source.durationSeconds
        : null,
    favorite: source.favorite === true,
    createdAt:
      typeof source.createdAt === 'number' && Number.isFinite(source.createdAt)
        ? source.createdAt
        : 0,
    updatedAt:
      typeof source.updatedAt === 'number' && Number.isFinite(source.updatedAt)
        ? source.updatedAt
        : 0
  }
}

export function normalizeMusicPlaylistRecord(value: unknown): MusicPlaylistRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Некорректный плейлист')
  }

  const source = value as Record<string, unknown>
  return {
    id: typeof source.id === 'string' ? source.id : '',
    name: typeof source.name === 'string' ? source.name : '',
    coverUrl: typeof source.coverUrl === 'string' ? source.coverUrl : null,
    trackIds: Array.isArray(source.trackIds)
      ? source.trackIds.filter((trackId): trackId is string => typeof trackId === 'string')
      : [],
    createdAt:
      typeof source.createdAt === 'number' && Number.isFinite(source.createdAt)
        ? source.createdAt
        : 0,
    updatedAt:
      typeof source.updatedAt === 'number' && Number.isFinite(source.updatedAt)
        ? source.updatedAt
        : 0
  }
}

export function normalizeMusicOverview(value: unknown): MusicOverview {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { items: [], playlists: [] }
  }

  const source = value as Record<string, unknown>
  return {
    items: Array.isArray(source.items) ? source.items.map(normalizeMusicItemRecord) : [],
    playlists: Array.isArray(source.playlists)
      ? source.playlists.map(normalizeMusicPlaylistRecord)
      : []
  }
}

export function stringifyMusicJson(
  value: MusicItemRecord | MusicPlaylistRecord | MusicOverview
): string {
  return JSON.stringify(value, null, 2) ?? ''
}
