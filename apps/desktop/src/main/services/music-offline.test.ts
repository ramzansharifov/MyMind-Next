import { beforeEach, describe, expect, it, vi } from 'vitest'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { rm, stat } from 'node:fs/promises'
import type { MusicEngineDownloadInput } from '../../shared/contracts/music'

const root = join(tmpdir(), 'mymind-offline-music-test-' + process.pid)

vi.mock('electron', () => ({
  app: { getPath: () => root }
}))
vi.mock('./music-yt-dlp', () => ({
  resolveAudioUrl: async () => {
    throw new Error('Offline playback must not access the provider')
  },
  downloadMusicTrack: async (_provider: string, _id: string, name: string, directory: string) => {
    const { writeFile } = await import('node:fs/promises')
    const { join } = await import('node:path')
    const file = join(directory, name + '.m4a')
    await writeFile(file, Buffer.from('testing-audio'))
    return file
  }
}))

import {
  downloadOfflineMusic,
  findOfflineMusic,
  listOfflineMusic,
  removeOfflineMusic
} from './music-offline'
import { localOfflineMusicStream, stopLocalMusicStream } from './music-audio-proxy'

const youtube: MusicEngineDownloadInput = {
  key: 'youtube:abcdefghijk',
  provider: 'youtube',
  id: 'abcdefghijk',
  title: 'Song',
  artist: 'Artist',
  durationSeconds: 90,
  artworkUrl: null,
  streamUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
  permalink: 'https://www.youtube.com/watch?v=abcdefghijk'
}

describe('MyMind internal music downloads', () => {
  beforeEach(async () => {
    await rm(join(root, 'music-downloads'), { recursive: true, force: true })
  })

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

  it('downloads a YouTube result when provider metadata differs from the library schema', async () => {
    // Matches the production failure: search results can be playable without
    // passing the stricter saved-library parser (e.g. a YouTube Music URL).
    const result = {
      ...youtube,
      artist: '',
      streamUrl: 'https://music.youtube.com/watch?v=abcdefghijk'
    }
    expect(await downloadOfflineMusic(result)).toBe('youtube:abcdefghijk')
    expect(await listOfflineMusic()).toEqual(['youtube:abcdefghijk'])
    const audio = await findOfflineMusic({ provider: 'youtube', id: result.id })
    expect(audio).not.toBeNull()
  })

  it('downloads a SoundCloud result by its canonical ID even if display metadata is incomplete', async () => {
    const result: MusicEngineDownloadInput = {
      ...youtube,
      key: 'soundcloud:artist/song',
      provider: 'soundcloud',
      id: 'artist/song',
      title: '',
      artist: '',
      streamUrl: 'https://soundcloud.com/artist/song?utm_source=search',
      permalink: null
    }
    expect(await downloadOfflineMusic(result)).toBe('soundcloud:artist/song')
    expect(await listOfflineMusic()).toEqual(['soundcloud:artist/song'])
  })

  it('rejects unsupported or malformed media IDs without downloading anything', async () => {
    await expect(
      downloadOfflineMusic({
        ...youtube,
        id: 'bad',
        key: 'youtube:bad',
        streamUrl: 'https://music.youtube.com/watch?v=bad'
      })
    ).rejects.toThrow('идентификатор YouTube')
    await expect(
      downloadOfflineMusic({
        ...youtube,
        provider: 'soundcloud',
        id: '../invalid',
        key: 'soundcloud:../invalid'
      })
    ).rejects.toThrow('идентификатор')
    expect(await listOfflineMusic()).toEqual([])
  })

  it('plays offline audio through the local server with byte-range seeking', async () => {
    await downloadOfflineMusic(youtube)
    const url = await localOfflineMusicStream({ provider: 'youtube', id: youtube.id })
    try {
      const response = await fetch(url, { headers: { Range: 'bytes=0-6' } })
      expect(response.status).toBe(206)
      expect(response.headers.get('accept-ranges')).toBe('bytes')
      expect(response.headers.get('content-type')).toBe('audio/mp4')
      expect(await response.text()).toBe('testing')
    } finally {
      stopLocalMusicStream()
    }
  })

  it('rejects arbitrary links and cannot read or remove paths from user input', async () => {
    const audius: MusicEngineDownloadInput = {
      ...youtube,
      key: 'audius:alpha',
      provider: 'audius',
      id: 'alpha',
      streamUrl: 'https://api.audius.co/v1/tracks/alpha/stream',
      downloadUrl: 'https://example.com/not-authorized.mp3'
    }
    await expect(downloadOfflineMusic(audius)).rejects.toThrow('Некорректная ссылка Audius')
    await expect(removeOfflineMusic({ provider: 'youtube', id: '../secrets' })).rejects.toThrow()
    expect(await listOfflineMusic()).toEqual([])
  })
})
