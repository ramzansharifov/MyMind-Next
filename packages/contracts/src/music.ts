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

export interface MusicSourceLink {
  key: string
  provider: 'youtube' | 'soundcloud' | 'audius' | 'jamendo'
  id: string
  title: string
  artist: string
  durationSeconds: number | null
  artworkUrl: string | null
  streamUrl: string
  permalink: string | null
}

export type ExtractedMusicProvider = 'youtube' | 'soundcloud'
export interface MusicEngineSearchInput { provider: ExtractedMusicProvider; query: string }
export interface MusicEnginePlaybackInput { provider: ExtractedMusicProvider; id: string }
export interface MusicRadioInput { videoId: string }
export interface MusicEngineDownloadInput { provider: ExtractedMusicProvider; id: string; suggestedName: string }

export interface SetMusicSourceLinkInput {
  itemId: string
  track: MusicSourceLink
}

export interface MusicOverview {
  items: MusicItemRecord[]
  playlists: MusicPlaylistRecord[]
}

type LegacyMusicItemRecord = Omit<MusicItemRecord, 'artist'> & {
  artist?: string
  artists?: readonly string[]
}

export function normalizeMusicItemRecord(
  value: MusicItemRecord | LegacyMusicItemRecord
): MusicItemRecord {
  const legacyArtists =
    'artists' in value && Array.isArray(value.artists)
      ? value.artists.filter((artist: unknown): artist is string => typeof artist === 'string')
      : []
  const legacyArtist = legacyArtists.find((artist) => artist.trim() !== '')
  const artist =
    typeof value.artist === 'string' && value.artist.trim() !== ''
      ? value.artist
      : (legacyArtist ?? '')

  return {
    id: value.id,
    title: value.title,
    artist: artist.trim(),
    year: value.year,
    durationSeconds: value.durationSeconds,
    favorite: value.favorite,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt
  }
}

export function normalizeMusicOverview(
  value: MusicOverview | (Omit<MusicOverview, 'items'> & { items: LegacyMusicItemRecord[] })
): MusicOverview {
  return {
    items: value.items.map(normalizeMusicItemRecord),
    playlists: value.playlists
  }
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

export interface UpsertMusicItemInput extends CreateMusicItemInput {
  id?: string | null
}

export interface UpsertMusicPlaylistInput {
  id?: string | null
  name: string
  coverUrl?: string | null
  trackIds: string[]
}

export interface UpsertMusicLibraryInput {
  items: UpsertMusicItemInput[]
  playlists: UpsertMusicPlaylistInput[]
}

export interface UpsertMusicLibraryResult {
  overview: MusicOverview
  itemsCreated: number
  itemsUpdated: number
  playlistsCreated: number
  playlistsUpdated: number
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
  upsertLibrary: 'music:upsert-library',
  updateItem: 'music:update-item',
  deleteItem: 'music:delete-item',
  createPlaylist: 'music:create-playlist',
  updatePlaylist: 'music:update-playlist',
  deletePlaylist: 'music:delete-playlist',
  setItemPlaylists: 'music:set-item-playlists',
  searchWeb: 'music:search-web',
  listSourceLinks: 'music:list-source-links',
  setSourceLink: 'music:set-source-link',
  engineSearch: 'music:engine-search',
  engineResolve: 'music:engine-resolve',
  engineRadio: 'music:engine-radio',
  engineDownload: 'music:engine-download',
  streamingCollection: 'music:streaming-collection',
  saveStreamingCollection: 'music:save-streaming-collection'
} as const

export interface MusicApi {
  listOverview(): Promise<MusicOverview>
  getItem(input: GetMusicItemInput): Promise<MusicItemRecord | null>
  createItem(input: CreateMusicItemInput): Promise<MusicItemRecord>
  createItems(input: CreateMusicItemsInput): Promise<MusicItemRecord[]>
  upsertLibrary(input: UpsertMusicLibraryInput): Promise<UpsertMusicLibraryResult>
  updateItem(input: UpdateMusicItemInput): Promise<MusicItemRecord>
  deleteItem(input: DeleteMusicItemInput): Promise<boolean>
  createPlaylist(input: CreateMusicPlaylistInput): Promise<MusicPlaylistRecord>
  updatePlaylist(input: UpdateMusicPlaylistInput): Promise<MusicPlaylistRecord>
  deletePlaylist(input: DeleteMusicPlaylistInput): Promise<boolean>
  setItemPlaylists(input: SetMusicItemPlaylistsInput): Promise<MusicPlaylistRecord[]>
  searchWeb(input: MusicWebSearchInput): Promise<void>
  listSourceLinks(): Promise<Record<string, MusicSourceLink>>
  setSourceLink(input: SetMusicSourceLinkInput): Promise<void>
  engineSearch(input: MusicEngineSearchInput): Promise<MusicSourceLink[]>
  engineResolve(input: MusicEnginePlaybackInput): Promise<string>
  engineRadio(input: MusicRadioInput): Promise<MusicSourceLink[]>
  engineDownload(input: MusicEngineDownloadInput): Promise<string | null>
  streamingCollection(): Promise<string | null>
  saveStreamingCollection(value: string): Promise<void>
}

export function stringifyMusicJson(
  value: MusicItemRecord | MusicPlaylistRecord | MusicOverview
): string {
  return JSON.stringify(value, null, 2) ?? ''
}
