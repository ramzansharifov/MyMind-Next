export type MusicSource = 'youtube' | 'soundcloud' | 'audius' | 'jamendo'

export const MUSIC_SOURCES: readonly MusicSource[] = ['youtube', 'soundcloud', 'audius', 'jamendo']

/** Interleave ranked results from all providers; preserve provider identity for playback/downloads. */
export function mergeMusicSearchResults(
  results: Partial<Record<MusicSource, readonly DiscoveredTrack[]>>
): DiscoveredTrack[] {
  const merged: DiscoveredTrack[] = []
  const seen = new Set<string>()
  const max = Math.max(0, ...MUSIC_SOURCES.map((source) => results[source]?.length ?? 0))
  for (let i = 0; i < max; i++) {
    for (const source of MUSIC_SOURCES) {
      const track = results[source]?.[i]
      if (!track || track.provider !== source || seen.has(track.key)) continue
      seen.add(track.key)
      merged.push(track)
    }
  }
  return merged
}

export interface DiscoveredTrack {
  key: string
  provider: MusicSource
  id: string
  title: string
  artist: string
  durationSeconds: number | null
  artworkUrl: string | null
  streamUrl: string
  permalink: string | null
  /** Present only when the provider explicitly authorizes a downloadable copy. */
  downloadUrl?: string | null
}

export interface MusicSearchOptions {
  provider: MusicSource
  query?: string
  jamendoClientId?: string
  signal?: AbortSignal
  fetcher?: typeof fetch
}

const AUDIUS_API = 'https://api.audius.co/v1'
const JAMENDO_API = 'https://api.jamendo.com/v3.0'
const obj = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
const str = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')
const positive = (value: unknown): number | null => {
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number) && number > 0 ? Math.round(number) : null
}
const secureUrl = (url: unknown): string | null => {
  const value = str(url)
  if (!value) return null
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' ? parsed.href : null
  } catch {
    return null
  }
}

export function audiusTrack(raw: unknown): DiscoveredTrack | null {
  const track = obj(raw)
  const id = str(track.id)
  const title = str(track.title)
  const artist = str(obj(track.user).name)
  if (!id || !title || !artist || track.is_streamable === false) return null
  const artwork = obj(track.artwork)
  const path = new URL(AUDIUS_API + '/tracks/' + encodeURIComponent(id) + '/stream')
  path.searchParams.set('app_name', 'MyMind')
  return {
    key: 'audius:' + id,
    provider: 'audius',
    id,
    title,
    artist,
    durationSeconds: positive(track.duration),
    artworkUrl: secureUrl(artwork['480x480'] ?? artwork['1000x1000'] ?? artwork['150x150']),
    streamUrl: path.href,
    permalink: secureUrl(track.permalink),
    ...(track.is_downloadable === true
      ? {
          downloadUrl:
            AUDIUS_API + '/tracks/' + encodeURIComponent(id) + '/download?app_name=MyMind'
        }
      : {})
  }
}

export function jamendoTrack(raw: unknown): DiscoveredTrack | null {
  const track = obj(raw)
  const id = str(track.id) || (typeof track.id === 'number' ? String(track.id) : '')
  const title = str(track.name)
  const artist = str(track.artist_name)
  const streamUrl = secureUrl(track.audio)
  if (!id || !title || !artist || !streamUrl) return null
  return {
    key: 'jamendo:' + id,
    provider: 'jamendo',
    id,
    title,
    artist,
    durationSeconds: positive(track.duration),
    artworkUrl: secureUrl(track.image ?? track.album_image),
    streamUrl,
    permalink: secureUrl(track.shareurl),
    ...(track.audiodownload_allowed === true && secureUrl(track.audiodownload)
      ? { downloadUrl: secureUrl(track.audiodownload) }
      : {})
  }
}

export function providerSearchUrl(
  options: Pick<MusicSearchOptions, 'provider' | 'query' | 'jamendoClientId'>
): string {
  const query = options.query?.trim().slice(0, 200) ?? ''
  if (options.provider === 'youtube' || options.provider === 'soundcloud')
    throw new Error('Этот источник использует отдельный музыкальный движок.')
  if (options.provider === 'audius') {
    const url = new URL(AUDIUS_API + '/tracks/' + (query ? 'search' : 'trending'))
    if (query) url.searchParams.set('query', query)
    url.searchParams.set('limit', '30')
    url.searchParams.set('app_name', 'MyMind')
    return url.href
  }
  const id = options.jamendoClientId?.trim() ?? ''
  if (!id) throw new Error('Укажите client_id Jamendo в настройках источника.')
  const url = new URL(JAMENDO_API + '/tracks/')
  url.searchParams.set('client_id', id)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', '30')
  url.searchParams.set('order', query ? 'relevance' : 'popularity_week')
  url.searchParams.set('audioformat', 'mp32')
  url.searchParams.set('audiodlformat', 'mp32')
  if (query) url.searchParams.set('search', query)
  return url.href
}

export async function discoverMusic(options: MusicSearchOptions): Promise<DiscoveredTrack[]> {
  if (options.provider === 'youtube' || options.provider === 'soundcloud')
    throw new Error('Требуется музыкальный движок для этого источника.')
  const fetcher = options.fetcher ?? fetch
  const response = await fetcher(providerSearchUrl(options), {
    signal: options.signal,
    headers: { Accept: 'application/json' }
  })
  if (!response.ok) throw new Error('Источник музыки недоступен (HTTP ' + response.status + ').')
  const json = obj(await response.json())
  const header = obj(json.headers)
  if (options.provider === 'jamendo' && typeof header.code === 'number' && header.code !== 0)
    throw new Error(str(header.error_message) || 'Ошибка запроса к Jamendo.')
  const data = Array.isArray(json.data)
    ? json.data
    : Array.isArray(json.results)
      ? json.results
      : []
  const normalize = options.provider === 'audius' ? audiusTrack : jamendoTrack
  const unique = new Set<string>()
  const tracks: DiscoveredTrack[] = []
  for (const raw of data) {
    const track = normalize(raw)
    if (track && !unique.has(track.key)) {
      unique.add(track.key)
      tracks.push(track)
    }
  }
  return tracks
}

export const providerLabel = (provider: MusicSource): string =>
  ({ youtube: 'YouTube', soundcloud: 'SoundCloud', audius: 'Audius', jamendo: 'Jamendo' })[provider]

/**
 * Device-local link between existing library item IDs and provider tracks.
 * Stored in Desktop app_meta / PWA mobile_preferences, without a DB migration.
 */
export type SavedMusicSourceMap = Record<string, DiscoveredTrack>

export function parseSavedMusicSources(value: string | null | undefined): SavedMusicSourceMap {
  if (!value || value.length > 4_000_000) return {}
  try {
    const raw = obj(JSON.parse(value))
    const mapped: SavedMusicSourceMap = Object.create(null) as SavedMusicSourceMap
    for (const [itemId, candidate] of Object.entries(raw)) {
      if (
        !/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(itemId) ||
        ['__proto__', 'prototype', 'constructor'].includes(itemId)
      )
        continue
      const track = obj(candidate)
      const provider = track.provider
      const id = str(track.id)
      const url = secureUrl(track.streamUrl)
      const artist = str(track.artist)
      const title = str(track.title)
      if (
        (provider !== 'youtube' &&
          provider !== 'soundcloud' &&
          provider !== 'audius' &&
          provider !== 'jamendo') ||
        !id ||
        !url ||
        !title ||
        !artist
      )
        continue
      const host = new URL(url).hostname
      if (
        provider === 'youtube' &&
        (!/^[A-Za-z0-9_-]{11}$/.test(id) ||
          host !== 'www.youtube.com' ||
          new URL(url).searchParams.get('v') !== id)
      )
        continue
      if (provider === 'soundcloud' && host !== 'soundcloud.com') continue
      if (provider === 'audius' && host !== 'api.audius.co') continue
      mapped[itemId] = {
        key: provider + ':' + id,
        provider,
        id,
        title,
        artist,
        durationSeconds: positive(track.durationSeconds),
        artworkUrl: secureUrl(track.artworkUrl),
        streamUrl: url,
        permalink: secureUrl(track.permalink)
      }
    }
    return mapped
  } catch {
    return {}
  }
}
