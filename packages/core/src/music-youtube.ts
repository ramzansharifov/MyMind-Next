import type { DiscoveredTrack } from './music-discovery'

/** InnerTube is YouTube's undocumented WEB search interface, subject to change. */
const ENDPOINT = 'https://www.youtube.com/youtubei/v1/search?prettyPrint=false'
const FALLBACK_VERSION = '2.20261002.01.00'

type Json = Record<string, unknown>
const rec = (input: unknown): Json =>
  input !== null && typeof input === 'object' && !Array.isArray(input) ? input as Json : {}
const arr = (input: unknown): unknown[] => Array.isArray(input) ? input : []
const str = (input: unknown): string => typeof input === 'string' ? input : ''
const rich = (input: unknown): string => {
  const o = rec(input)
  return str(o.simpleText) || arr(o.runs).map(item => str(rec(item).text)).join('')
}
function lengthSeconds(value: string): number | null {
  if (!/^\d{1,3}(?::\d{1,2}){1,2}$/.test(value)) return null
  return value.split(':').reduce((sum, part) => sum * 60 + Number(part), 0)
}

/** Decode search results; do not rely on brittle fixed nesting paths. */
export function parseYouTubeSearch(input: unknown): DiscoveredTrack[] {
  const output: DiscoveredTrack[] = []
  const seen = new Set<string>()
  const walk = (value: unknown, depth: number): void => {
    if (depth > 24 || output.length >= 40 || !value || typeof value !== 'object') return
    if (Array.isArray(value)) { value.forEach(child => walk(child, depth + 1)); return }
    const node = rec(value)
    const v = rec(node.videoRenderer || node.compactVideoRenderer || node.playlistVideoRenderer)
    const id = str(v.videoId)
    if (/^[A-Za-z0-9_-]{11}$/.test(id) && !seen.has(id)) {
      const title = rich(v.title)
      const artist = rich(v.ownerText) || rich(v.longBylineText) || rich(v.shortBylineText) || 'YouTube'
      if (title) {
        const pictures = arr(rec(v.thumbnail).thumbnails).map(rec)
        const picture = str(pictures[pictures.length - 1]?.url)
        const url = 'https://www.youtube.com/watch?v=' + id
        seen.add(id)
        output.push({
          key: 'youtube:' + id, provider: 'youtube', id, title, artist,
          durationSeconds: lengthSeconds(rich(v.lengthText)),
          artworkUrl: picture.startsWith('https://') ? picture : 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg',
          streamUrl: url, permalink: url
        })
      }
    }
    for (const [key, child] of Object.entries(node)) {
      // Limit traversal to YouTube's response structure, not arbitrary nested metadata.
      if (key !== 'videoRenderer' && key !== 'compactVideoRenderer' && key !== 'playlistVideoRenderer')
        walk(child, depth + 1)
    }
  }
  walk(input, 0)
  return output
}

export async function discoverYouTube(query: string, options: {
  fetcher?: typeof fetch
  signal?: AbortSignal
  clientVersion?: string
  /** Bound the entire request, including response body parsing (Desktop and PWA). */
  timeoutMs?: number
} = {}): Promise<DiscoveredTrack[]> {
  const q = query.trim().slice(0, 180) || 'music'
  const version = options.clientVersion || FALLBACK_VERSION
  const fetcher = options.fetcher ?? fetch
  const deadline = AbortSignal.timeout(options.timeoutMs ?? 12_000)
  const signal = options.signal ? AbortSignal.any([options.signal, deadline]) : deadline
  try {
    const response = await fetcher(ENDPOINT, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'X-YouTube-Client-Name': '1',
      'X-YouTube-Client-Version': version,
      'Origin': 'https://www.youtube.com',
      'Referer': 'https://www.youtube.com/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0 Safari/537.36'
    },
    body: JSON.stringify({
      context: { client: { clientName: 'WEB', clientVersion: version, hl: 'ru', gl: 'US' } },
      query: q,
      params: 'EgIQAQ==' // videos, excluding channels and playlists
    })
  })
    if (!response.ok) throw new Error('Поиск YouTube временно недоступен (HTTP ' + response.status + ').')
    const results = parseYouTubeSearch(await response.json())
    return results
  } catch (error) {
    if (deadline.aborted && !options.signal?.aborted)
      throw new Error('YouTube не ответил вовремя. Проверь подключение и повтори поиск.')
    throw error
  }
}

/**
 * Preferred Chromium/InnerTube search with a maintained yt-dlp fallback.
 * Empty valid searches remain empty if yt-dlp is unavailable. If both fail,
 * report both causes so the user can distinguish connectivity and tooling.
 */
export async function discoverYouTubeWithFallback(
  query: string,
  primary: (query: string) => Promise<DiscoveredTrack[]>,
  secondary: (query: string) => Promise<DiscoveredTrack[]>
): Promise<DiscoveredTrack[]> {
  let firstError: unknown = null
  let primaryCompleted = false
  try {
    const found = await primary(query)
    primaryCompleted = true
    if (found.length) return found
  } catch (error) {
    firstError = error
  }

  try {
    return await secondary(query)
  } catch (error) {
    if (primaryCompleted) return []
    const firstMessage = firstError instanceof Error ? firstError.message : String(firstError)
    const secondMessage = error instanceof Error ? error.message : String(error)
    // Do not print raw URLs containing CDN tokens or external request parameters.
    const summarize = (message: string) => message.replace(/https?:\/\/\S+/g, '[URL]').slice(0, 190)
    throw new Error(
      'Поиск YouTube недоступен через Chromium (' + summarize(firstMessage) +
      ') и резервный yt-dlp (' + summarize(secondMessage) + '). ' +
      'Проверь доступ к youtube.com в браузере и повтори поиск.'
    )
  }
}
