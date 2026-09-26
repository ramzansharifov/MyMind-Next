import { createMusicRepository } from '@mymind/persistence/music'
import { desktopRepositoryRuntime } from '../database/repository-runtime'

export const {
  listMusicOverview,
  getMusicItem,
  createMusicItem,
  createMusicItems,
  upsertMusicLibrary,
  updateMusicItem,
  deleteMusicItem,
  createMusicPlaylist,
  updateMusicPlaylist,
  deleteMusicPlaylist,
  setMusicItemPlaylists
} = createMusicRepository(desktopRepositoryRuntime)
