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

describe('music runtime compatibility', () => {
  it('normalizes pre-migration artists arrays into the new artist field', () => {
    const legacy = {
      id: 'legacy-track',
      title: 'Legacy Track',
      artists: [' Legacy Artist '],
      year: 2020,
      durationSeconds: 180,
      favorite: true,
      createdAt: 10,
      updatedAt: 20
    }

    expect(normalizeMusicItemRecord(legacy)).toEqual({
      id: 'legacy-track',
      title: 'Legacy Track',
      artist: 'Legacy Artist',
      year: 2020,
      durationSeconds: 180,
      favorite: true,
      createdAt: 10,
      updatedAt: 20
    })

    expect(normalizeMusicOverview({ items: [legacy], playlists: [] }).items[0]?.artist).toBe(
      'Legacy Artist'
    )
  })

  it('keeps records without an old artist value safe instead of crashing the UI', () => {
    expect(
      normalizeMusicItemRecord({
        id: 'legacy-empty',
        title: 'Unknown artist',
        artists: [],
        year: null,
        durationSeconds: null,
        favorite: false,
        createdAt: 1,
        updatedAt: 1
      }).artist
    ).toBe('')
  })
})

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
