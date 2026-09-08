import { createMusicRepository } from '@mymind/persistence/music'
import { desktopRepositoryRuntime } from '../database/repository-runtime'

export const {
  listMusicOverview,
  getMusicItem,
  createMusicItem,
  createMusicItems,
  updateMusicItem,
  deleteMusicItem,
  createMusicPlaylist,
  updateMusicPlaylist,
  deleteMusicPlaylist,
  setMusicItemPlaylists
} = createMusicRepository(desktopRepositoryRuntime)
