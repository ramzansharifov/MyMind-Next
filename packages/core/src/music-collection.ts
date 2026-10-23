import {
  parseSavedMusicSources, type DiscoveredTrack, type MusicSource
} from './music-discovery'

export const MUSIC_COLLECTION_KEY = 'music.streaming.collection.v2'
export interface MusicStreamingPlaylist {
  id: string
  name: string
  trackKeys: string[]
  createdAt: number
}
export interface MusicStreamingCollection {
  version: 2
  tracks: Record<string, DiscoveredTrack>
  likedKeys: string[]
  playlists: MusicStreamingPlaylist[]
}

const providers = new Set<MusicSource>(['youtube', 'soundcloud', 'audius', 'jamendo'])
const object = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {}
const str = (value: unknown): string => typeof value === 'string' ? value : ''
const safeHttps = (value: unknown): string | null => {
  const v = str(value)
  if (!v) return null
  try { const url = new URL(v); return url.protocol === 'https:' ? url.href : null } catch { return null }
}

export function emptyMusicCollection(): MusicStreamingCollection {
  return { version: 2, tracks: Object.create(null) as Record<string, DiscoveredTrack>, likedKeys: [], playlists: [] }
}
export function validStreamingTrack(value: unknown): DiscoveredTrack | null {
  const t = object(value)
  const provider = t.provider as MusicSource
  const id = str(t.id).trim()
  const title = str(t.title).trim().slice(0, 300)
  const rawArtist = str(t.artist).trim().slice(0, 300)
  let streamUrl = safeHttps(t.streamUrl)
  if (!providers.has(provider) || !id || id.length > 250 || !title || !streamUrl) return null
  const stream = new URL(streamUrl)
  const host = stream.hostname
  if (provider === 'youtube') {
    if (!/^[\w-]{11}$/.test(id) ||
        !['www.youtube.com', 'music.youtube.com', 'm.youtube.com'].includes(host) ||
        stream.pathname !== '/watch' || stream.searchParams.get('v') !== id) return null
    // All supported YouTube entrypoints refer to the same canonical video ID.
    streamUrl = 'https://www.youtube.com/watch?v=' + id
  }
  if (provider === 'soundcloud' &&
      (host !== 'soundcloud.com' || stream.pathname !== '/' + id ||
       !/^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+){1,3}$/.test(id))) return null
  if (provider === 'audius' && host !== 'api.audius.co') return null
  if (provider === 'jamendo' && !/^\d+$/.test(id)) return null
  // Some provider searches omit the uploader. That should not make a playable
  // result disappear from "Downloads" after the user explicitly saves it.
  const artist = rawArtist || (provider === 'youtube' ? 'YouTube' :
    provider === 'soundcloud' ? 'SoundCloud' : '')
  if (!artist) return null
  const sec = typeof t.durationSeconds === 'number' && Number.isFinite(t.durationSeconds) &&
    t.durationSeconds >= 0 ? Math.round(t.durationSeconds) : null
  // Download URLs come only from provider-confirmed, opt-in metadata, never
  // inferred from stream endpoints or unknown stored payloads.
  const download = provider === 'jamendo' || provider === 'audius' ? safeHttps(t.downloadUrl) : null
  return {
    key: provider + ':' + id, provider, id, title, artist,
    durationSeconds: sec, artworkUrl: safeHttps(t.artworkUrl),
    streamUrl, permalink: safeHttps(t.permalink),
    ...(download ? { downloadUrl: download } : {})
  }
}
export function parseMusicCollection(value: string | null | undefined): MusicStreamingCollection {
  const result = emptyMusicCollection()
  if (!value || value.length > 6_000_000) return result
  try {
    const input = object(JSON.parse(value))
    for (const item of Object.values(object(input.tracks)).slice(0, 5000)) {
      const track = validStreamingTrack(item)
      if (track) result.tracks[track.key] = track
    }
    const liked = Array.isArray(input.likedKeys) ? input.likedKeys : []
    result.likedKeys = Array.from(new Set(liked.filter((v): v is string =>
      typeof v === 'string' && v in result.tracks)))
    const playlists = Array.isArray(input.playlists) ? input.playlists.slice(0, 500) : []
    const ids = new Set<string>()
    for (const raw of playlists) {
      const playlist = object(raw)
      const id = str(playlist.id)
      const name = str(playlist.name).trim().slice(0, 100)
      if (!/^[a-zA-Z0-9_-]{1,128}$/.test(id) || !name || ids.has(id)) continue
      ids.add(id)
      const keys = Array.isArray(playlist.trackKeys) ? playlist.trackKeys : []
      result.playlists.push({
        id, name,
        trackKeys: Array.from(new Set(keys.filter((v): v is string =>
          typeof v === 'string' && v in result.tracks))),
        createdAt: typeof playlist.createdAt === 'number' && Number.isFinite(playlist.createdAt)
          ? playlist.createdAt : Date.now()
      })
    }
  } catch { /* malformed local data: do not delete it */ }
  return result
}
/** Import only previously provider-linked tracks, ignoring manual legacy entries. */
export function migrateLinkedMusicCollection(
  collection: MusicStreamingCollection,
  legacySources: string | null
): MusicStreamingCollection {
  const legacy = parseSavedMusicSources(legacySources)
  const next = { ...collection, tracks: { ...collection.tracks } }
  for (const value of Object.values(legacy)) {
    const track = validStreamingTrack(value)
    if (track && !next.tracks[track.key]) next.tracks[track.key] = track
  }
  return next
}
export type MusicCollectionAction =
  | { type: 'save'; track: DiscoveredTrack }
  | { type: 'remove'; key: string }
  | { type: 'like'; track: DiscoveredTrack }
  | { type: 'playlist-create'; id: string; name: string; now: number }
  | { type: 'playlist-rename'; id: string; name: string }
  | { type: 'playlist-delete'; id: string }
  | { type: 'playlist-toggle'; id: string; track: DiscoveredTrack }

export function reduceMusicCollection(
  prev: MusicStreamingCollection, action: MusicCollectionAction
): MusicStreamingCollection {
  const tracks = { ...prev.tracks }
  let likedKeys = [...prev.likedKeys]
  let playlists = prev.playlists.map(p => ({ ...p, trackKeys: [...p.trackKeys] }))
  if (action.type === 'save' || action.type === 'like' || action.type === 'playlist-toggle') {
    const track = validStreamingTrack(action.track)
    if (!track) return prev
    tracks[track.key] = track
    if (action.type === 'like') {
      likedKeys = likedKeys.includes(track.key)
        ? likedKeys.filter(key => key !== track.key)
        : [...likedKeys, track.key]
    }
    if (action.type === 'playlist-toggle') playlists = playlists.map(p =>
      p.id !== action.id ? p : {
        ...p, trackKeys: p.trackKeys.includes(track.key)
          ? p.trackKeys.filter(key => key !== track.key)
          : [...p.trackKeys, track.key]
      })
  }
  if (action.type === 'remove') {
    delete tracks[action.key]
    likedKeys = likedKeys.filter(key => key !== action.key)
    playlists = playlists.map(p => ({ ...p, trackKeys: p.trackKeys.filter(key => key !== action.key) }))
  }
  if (action.type === 'playlist-create') {
    const name = action.name.trim().slice(0, 100)
    if (name && !playlists.some(p => p.id === action.id))
      playlists.push({ id: action.id, name, trackKeys: [], createdAt: action.now })
  }
  if (action.type === 'playlist-rename') playlists = playlists.map(p =>
    p.id === action.id && action.name.trim()
      ? { ...p, name: action.name.trim().slice(0, 100) } : p)
  if (action.type === 'playlist-delete') playlists = playlists.filter(p => p.id !== action.id)
  return { version: 2, tracks, likedKeys, playlists }
}
