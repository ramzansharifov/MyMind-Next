import { beforeEach, describe, expect, it, vi } from 'vitest'
import { join } from 'node:path'
import { rm, stat } from 'node:fs/promises'
import type { MusicEngineDownloadInput } from '../../shared/contracts/music'

const root = '/tmp/mymind-offline-music-test-' + process.pid

vi.mock('electron', () => ({
  app: { getPath: () => root }
}))
vi.mock('./music-yt-dlp', () => ({
  downloadMusicTrack: async (_provider: string, _id: string, name: string, directory: string) => {
    const { writeFile } = await import('node:fs/promises')
    const { join } = await import('node:path')
    const file = join(directory, name + '.m4a')
    await writeFile(file, Buffer.from('testing-audio'))
    return file
  }
}))

import {
  downloadOfflineMusic, findOfflineMusic, listOfflineMusic, removeOfflineMusic
} from './music-offline'

const youtube: MusicEngineDownloadInput = {
  key: 'youtube:abcdefghijk', provider: 'youtube', id: 'abcdefghijk',
  title: 'Song', artist: 'Artist', durationSeconds: 90, artworkUrl: null,
  streamUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
  permalink: 'https://www.youtube.com/watch?v=abcdefghijk'
}

describe('MyMind internal music downloads', () => {
  beforeEach(async () => { await rm(join(root, 'music-downloads'), { recursive: true, force: true }) })

  it('stores tracks in userData, lists them after restart, and avoids duplicate copies', async () => {
    expect(await listOfflineMusic()).toEqual([])
    expect(await downloadOfflineMusic(youtube)).toBe(youtube.key)
    const file = await findOfflineMusic({ provider: 'youtube', id: youtube.id })
    expect(file?.path).toContain('music-downloads')
    expect(file?.mime).toBe('audio/mp4')
    expect((await stat(file!.path)).size).toBeGreaterThan(0)
    expect(await downloadOfflineMusic(youtube)).toBe(youtube.key)
    expect(await listOfflineMusic()).toEqual([youtube.key])
    expect(await removeOfflineMusic({ provider: 'youtube', id: youtube.id })).toBe(true)
    expect(await listOfflineMusic()).toEqual([])
    expect(await findOfflineMusic({ provider: 'youtube', id: youtube.id })).toBeNull()
  })

  it('rejects arbitrary links and cannot read or remove paths from user input', async () => {
    const audius: MusicEngineDownloadInput = {
      ...youtube, key: 'audius:alpha', provider: 'audius', id: 'alpha',
      streamUrl: 'https://api.audius.co/v1/tracks/alpha/stream',
      downloadUrl: 'https://example.com/not-authorized.mp3'
    }
    await expect(downloadOfflineMusic(audius)).rejects.toThrow('Некорректная ссылка Audius')
    await expect(removeOfflineMusic({ provider: 'youtube', id: '../secrets' })).rejects.toThrow()
    expect(await listOfflineMusic()).toEqual([])
  })
})
