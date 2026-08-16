export const MUSIC_STATUSES = ['want_to_listen', 'listened'] as const
export const MUSIC_TYPES = ['track', 'album', 'ep', 'single'] as const

export type MusicStatus = (typeof MUSIC_STATUSES)[number]
export type MusicType = (typeof MUSIC_TYPES)[number]

export interface MusicItemRecord {
  id: string
  title: string
  type: MusicType
  year: number | null
  coverUrl: string | null
  artists: string[]
  album: string
  durationSeconds: number | null
  trackCount: number | null
  genres: string[]
  description: string
  status: MusicStatus
  favorite: boolean
  rating: number | null
  comments: string
  createdAt: number
  updatedAt: number
}

export interface MusicOverview {
  items: MusicItemRecord[]
}

export interface CreateMusicItemInput {
  title: string
  type: MusicType
  year: number | null
  coverUrl: string | null
  artists: string[]
  album: string
  durationSeconds: number | null
  trackCount: number | null
  genres: string[]
  description: string
  status: MusicStatus
  favorite: boolean
  rating: number | null
  comments: string
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
  searchWeb: 'music:search-web'
} as const

export interface MusicApi {
  listOverview(): Promise<MusicOverview>
  getItem(input: GetMusicItemInput): Promise<MusicItemRecord | null>
  createItem(input: CreateMusicItemInput): Promise<MusicItemRecord>
  createItems(input: CreateMusicItemsInput): Promise<MusicItemRecord[]>
  updateItem(input: UpdateMusicItemInput): Promise<MusicItemRecord>
  deleteItem(input: DeleteMusicItemInput): Promise<boolean>
  searchWeb(input: MusicWebSearchInput): Promise<void>
}
