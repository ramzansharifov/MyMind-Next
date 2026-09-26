import { describe, expect, it } from 'vitest'

import {
  normalizeMusicItemRecord,
  normalizeMusicOverview,
  stringifyMusicJson,
  type MusicItemRecord,
  type MusicOverview,
  type MusicPlaylistRecord
} from './music'

const item: MusicItemRecord = {
  id: 'track-json-1',
  title: 'Blinding Lights',
  artist: 'The Weeknd',
  year: 2019,
  durationSeconds: 200,
  favorite: true,
  createdAt: 123,
  updatedAt: 456
}

const playlist: MusicPlaylistRecord = {
  id: 'playlist-json-1',
  name: 'Избранное',
  coverUrl: 'https://example.com/playlist.jpg',
  trackIds: ['track-json-1'],
  createdAt: 789,
  updatedAt: 999
}

describe('stringifyMusicJson', () => {
  it('serializes only the real public fields of one track', () => {
    const parsed = JSON.parse(stringifyMusicJson(item)) as MusicItemRecord

    expect(parsed).toEqual(item)
    expect(parsed).toMatchObject({
      id: 'track-json-1',
      title: 'Blinding Lights',
      artist: 'The Weeknd',
      createdAt: 123,
      updatedAt: 456
    })
    expect(parsed).not.toHaveProperty('coverUrl')
    expect(parsed).not.toHaveProperty('album')
    expect(parsed).not.toHaveProperty('genres')
    expect(parsed).not.toHaveProperty('rating')
    expect(parsed).not.toHaveProperty('status')
  })

  it('keeps playlist cover and track relations', () => {
    expect(JSON.parse(stringifyMusicJson(playlist))).toEqual(playlist)
  })

  it('serializes the complete music overview including playlists', () => {
    const overview: MusicOverview = {
      items: [item],
      playlists: [playlist]
    }

    expect(JSON.parse(stringifyMusicJson(overview))).toEqual(overview)
  })
})


describe('legacy music runtime normalization', () => {
  it('converts the old artists array into the current artist field', () => {
    const legacy = {
      id: 'legacy-track',
      title: 'Legacy track',
      artists: ['  Legacy Artist  '],
      year: 2020,
      durationSeconds: 180,
      favorite: false,
      createdAt: 1,
      updatedAt: 2
    }

    expect(normalizeMusicItemRecord(legacy)).toEqual({
      id: 'legacy-track',
      title: 'Legacy track',
      artist: 'Legacy Artist',
      year: 2020,
      durationSeconds: 180,
      favorite: false,
      createdAt: 1,
      updatedAt: 2
    })
  })

  it('normalizes retained legacy items inside a music overview', () => {
    const normalized = normalizeMusicOverview({
      items: [
        {
          id: 'legacy-track',
          title: 'Legacy track',
          artists: ['Legacy Artist'],
          year: null,
          durationSeconds: null,
          favorite: true,
          createdAt: 1,
          updatedAt: 2
        }
      ],
      playlists: [playlist]
    })

    expect(normalized.items[0]?.artist).toBe('Legacy Artist')
    expect(normalized.playlists).toEqual([playlist])
  })
})
