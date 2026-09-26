import { describe, expect, it } from 'vitest'

import {
  stringifyMusicJson,
  type MusicItemRecord,
  type MusicOverview,
  type MusicPlaylistRecord
} from './music'

const item: MusicItemRecord = {
  id: 'track-json-1',
  title: 'Blinding Lights',
  type: 'track',
  year: 2019,
  coverUrl: 'https://example.com/blinding-lights.jpg',
  artists: ['The Weeknd'],
  album: 'After Hours',
  durationSeconds: 200,
  trackCount: null,
  genres: ['Synth-pop', 'R&B'],
  description: 'Описание',
  status: 'listened',
  favorite: true,
  rating: 9,
  comments: 'Комментарий',
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
  it('keeps every persisted field for one music item', () => {
    const parsed = JSON.parse(stringifyMusicJson(item)) as MusicItemRecord

    expect(parsed).toEqual(item)
    expect(parsed).toMatchObject({
      id: 'track-json-1',
      createdAt: 123,
      updatedAt: 456,
      album: 'After Hours'
    })
  })

  it('serializes the complete music overview including playlists', () => {
    const overview: MusicOverview = {
      items: [item],
      playlists: [playlist]
    }

    expect(JSON.parse(stringifyMusicJson(overview))).toEqual(overview)
  })
})
