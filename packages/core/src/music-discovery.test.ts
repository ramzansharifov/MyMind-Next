import { describe, expect, it, vi } from 'vitest'
import { audiusTrack, jamendoTrack, discoverMusic, mergeMusicSearchResults, providerSearchUrl } from './music-discovery'

describe('music discovery providers', () => {
  it('normalizes Audius track metadata and official stream URL', () => {
    const item = audiusTrack({
      id: 'abc_01', title: 'Night Sky', duration: 205,
      user: { name: 'Orion' }, artwork: { '480x480': 'https://img.example/cover.jpg' },
      permalink: 'https://audius.co/orion/night-sky'
    })
    expect(item).toMatchObject({
      key: 'audius:abc_01', title: 'Night Sky', artist: 'Orion', durationSeconds: 205,
      artworkUrl: 'https://img.example/cover.jpg'
    })
    expect(item?.streamUrl).toContain('/tracks/abc_01/stream')
    expect(item?.streamUrl).not.toContain('yt-dlp')
  })

  it('rejects invalid tracks and non-HTTPS links', () => {
    expect(audiusTrack({ id: 'x', title: 'Song', user: {} })).toBeNull()
    expect(jamendoTrack({ id: 1, name: 'Song', artist_name: 'Artist', audio: 'javascript:alert(1)' })).toBeNull()
  })

  it('normalizes Jamendo MP3 URL and license metadata without guessing audio URLs', () => {
    const item = jamendoTrack({ id: '42', name: 'Sunrise', artist_name: 'Nova', duration: 182,
      audio: 'https://audio.jamendo.com/track.mp3', image: 'https://img.jamendo.com/art.jpg' })
    expect(item).toMatchObject({ key: 'jamendo:42', durationSeconds: 182, title: 'Sunrise' })
    expect(item?.streamUrl).toBe('https://audio.jamendo.com/track.mp3')
  })

  it('requires a user-provided Jamendo key, never embedded in the app', () => {
    expect(() => providerSearchUrl({ provider: 'jamendo' })).toThrow('client_id')
    expect(providerSearchUrl({ provider: 'jamendo', jamendoClientId: 'abc123' })).toContain('client_id=abc123')
  })

  it('fetches and de-duplicates results without sending credentials', async () => {
    const fetcher = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({ data: [
      { id: '1', title: 'A', user: { name: 'B' } },
      { id: '1', title: 'A', user: { name: 'B' } }
    ] }), { status: 200 }))
    const tracks = await discoverMusic({ provider: 'audius', query: 'ambient', fetcher })
    expect(tracks).toHaveLength(1)
    expect(String(fetcher.mock.calls[0]?.[0])).toContain('query=ambient')
  })

  it('interleaves results from every source without losing their provider-specific IDs', () => {
    const youtube = { provider: 'youtube' as const, id: 'abcdefghijk', key: 'youtube:abcdefghijk',
      title: 'Example', artist: 'Artist', durationSeconds: 100, artworkUrl: null,
      streamUrl: 'https://www.youtube.com/watch?v=abcdefghijk', permalink: null }
    const audius = { ...youtube, provider: 'audius' as const, id: '1', key: 'audius:1',
      streamUrl: 'https://api.audius.co/v1/tracks/1/stream' }
    const soundcloud = { ...youtube, provider: 'soundcloud' as const, id: 'artist/song',
      key: 'soundcloud:artist/song', streamUrl: 'https://soundcloud.com/artist/song' }
    const merged = mergeMusicSearchResults({
      youtube: [youtube, youtube], audius: [audius], soundcloud: [soundcloud]
    })
    expect(merged.map(track => track.key)).toEqual([
      'youtube:abcdefghijk', 'soundcloud:artist/song', 'audius:1'
    ])
    expect(mergeMusicSearchResults({ audius: [audius] })).toEqual([audius])
  })
})
