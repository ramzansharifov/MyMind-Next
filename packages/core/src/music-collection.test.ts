import { describe, expect, it } from 'vitest'
import { audiusTrack, jamendoTrack, type DiscoveredTrack } from './music-discovery'
import {
  emptyMusicCollection, migrateLinkedMusicCollection,
  parseMusicCollection, reduceMusicCollection
} from './music-collection'

const track: DiscoveredTrack = {
  key: 'youtube:abcdefghijk', id: 'abcdefghijk', provider: 'youtube',
  title: 'Song', artist: 'Artist', durationSeconds: 200, artworkUrl: null,
  streamUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
  permalink: 'https://www.youtube.com/watch?v=abcdefghijk'
}

describe('provider-based streaming library', () => {
  it('saves songs by provider ID, toggles likes, manages playlists and deletes references', () => {
    let state = reduceMusicCollection(emptyMusicCollection(), { type: 'save', track })
    state = reduceMusicCollection(state, { type: 'save', track })
    expect(Object.keys(state.tracks)).toEqual(['youtube:abcdefghijk'])
    state = reduceMusicCollection(state, { type: 'like', track })
    expect(state.likedKeys).toEqual([track.key])
    state = reduceMusicCollection(state, {
      type: 'playlist-create', id: 'test_playlist', name: 'New Mix', now: 123
    })
    state = reduceMusicCollection(state, { type: 'playlist-toggle', id: 'test_playlist', track })
    expect(state.playlists[0].trackKeys).toEqual([track.key])
    const loaded = parseMusicCollection(JSON.stringify(state))
    expect(loaded).toEqual(state)
    state = reduceMusicCollection(state, { type: 'remove', key: track.key })
    expect(state.likedKeys).toEqual([])
    expect(state.playlists[0].trackKeys).toEqual([])
    expect(Object.keys(state.tracks)).toEqual([])
  })

  it('migrates only source-linked legacy songs; does not import manual entries', () => {
    const collection = migrateLinkedMusicCollection(emptyMusicCollection(),
      JSON.stringify({ 'old-song-1': track, manual: { title: 'Manual' } }))
    expect(Object.values(collection.tracks)).toEqual([track])
  })

  it('ignores injected keys and malformed provider URLs', () => {
    const invalid = {
      version: 2,
      tracks: {
        evil: { ...track, streamUrl: 'http://localhost:9999/admin' },
        valid: track
      },
      likedKeys: ['nonexistent', 'youtube:abcdefghijk']
    }
    const result = parseMusicCollection(JSON.stringify(invalid))
    expect(Object.keys(result.tracks)).toEqual([track.key])
    expect(result.likedKeys).toEqual([track.key])
  })

  it('exposes downloads only when source explicitly permits them', () => {
    const denied = jamendoTrack({
      id: '16', name: 'Allowed Song', artist_name: 'Artist', audio: 'https://audio.example/stream.mp3',
      audiodownload_allowed: false, audiodownload: 'https://download.example/song.mp3'
    })
    expect(denied?.downloadUrl).toBeUndefined()
    const permitted = jamendoTrack({
      id: '16', name: 'Allowed Song', artist_name: 'Artist', audio: 'https://audio.example/stream.mp3',
      audiodownload_allowed: true, audiodownload: 'https://download.example/song.mp3'
    })
    expect(permitted?.downloadUrl).toBe('https://download.example/song.mp3')
    expect(audiusTrack({ id: 'audio1', title: 'Audio', user: { name: 'A' },
      is_downloadable: true })?.downloadUrl).toContain('/download?app_name=MyMind')
  })
})
