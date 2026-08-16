import type {
  CreateMusicItemInput,
  CreateMusicItemsInput,
  DeleteMusicItemInput,
  GetMusicItemInput,
  MusicItemRecord,
  MusicOverview,
  MusicWebSearchInput,
  UpdateMusicItemInput
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
  searchWeb(input: MusicWebSearchInput): Promise<void> {
    return window.api.music.searchWeb(input)
  }
}
