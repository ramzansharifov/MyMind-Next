import { NextResponse } from 'next/server'
import { discoverMusic, mergeMusicSearchResults, type DiscoveredTrack, type MusicSource } from '@mymind/core/music-discovery'
import { discoverYouTube } from '@mymind/core/music-youtube'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function bridge(path: string, data: Record<string, unknown>): Promise<unknown> {
  const url = process.env.MYMIND_MUSIC_BRIDGE_URL
  const token = process.env.MYMIND_MUSIC_BRIDGE_TOKEN
  if (!url || !token || !/^https:\/\/[^/]+$/.test(url))
    throw new Error('SoundCloud требует подключить личный музыкальный мост (MUSIC_BRIDGE_URL).')
  const response = await fetch(url + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify(data),
    signal: AbortSignal.timeout(16_000),
    cache: 'no-store'
  })
  const result = await response.json() as { tracks?: unknown; error?: string }
  if (!response.ok) throw new Error(result.error || 'Музыкальный мост недоступен.')
  return result.tracks ?? []
}

interface RequestSearch {
  query: string
  jamendoClientId: string
}

async function searchSource(provider: MusicSource, input: RequestSearch): Promise<DiscoveredTrack[]> {
  if (provider === 'youtube') return discoverYouTube(input.query, { signal: AbortSignal.timeout(13_000) })
  if (provider === 'soundcloud') {
    const data = await bridge('/api/search', { provider, query: input.query })
    return Array.isArray(data) ? data as DiscoveredTrack[] : []
  }
  return discoverMusic({
    provider, query: input.query, jamendoClientId: input.jamendoClientId,
    signal: AbortSignal.timeout(13_000)
  })
}

/** One search across the providers; a failed/disabled source cannot hide healthy results. */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const data = await request.json() as Record<string, unknown>
    const provider = data.provider ?? 'all'
    const query = typeof data.query === 'string' ? data.query.trim() : ''
    const jamendoClientId = typeof data.jamendoClientId === 'string' ? data.jamendoClientId.trim() : ''
    if (!['all', 'youtube', 'soundcloud', 'audius', 'jamendo'].includes(String(provider)) ||
        query.length > 180 || jamendoClientId.length > 128) {
      return NextResponse.json({ error: 'Некорректные параметры поиска' }, { status: 400 })
    }
    const input = { query, jamendoClientId }
    if (provider !== 'all') {
      const tracks = await searchSource(provider as MusicSource, input)
      return NextResponse.json({ tracks }, { headers: { 'Cache-Control': 'no-store' } })
    }

    const sources: MusicSource[] = ['youtube', 'audius']
    if (query) sources.push('soundcloud')
    if (jamendoClientId) sources.push('jamendo')
    const settled = await Promise.allSettled(sources.map(source => searchSource(source, input)))
    const results: Partial<Record<MusicSource, DiscoveredTrack[]>> = {}
    let failures = 0
    let successes = 0
    settled.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results[sources[index]] = result.value
        successes++
      } else failures++
    })
    if (successes === 0) {
      return NextResponse.json(
        { error: 'Источники музыки не ответили. Проверь соединение и повтори поиск.' },
        { status: 502, headers: { 'Cache-Control': 'no-store' } }
      )
    }
    return NextResponse.json({
      tracks: mergeMusicSearchResults(results),
      partial: failures > 0,
      jamendoNeedsSetup: !jamendoClientId
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Поиск временно недоступен' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
