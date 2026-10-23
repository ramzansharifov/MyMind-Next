import { NextResponse } from 'next/server'
import { discoverMusic, type MusicSource } from '@mymind/core/music-discovery'
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
    signal: AbortSignal.timeout(60_000),
    cache: 'no-store'
  })
  const result = await response.json() as { tracks?: unknown; error?: string }
  if (!response.ok) throw new Error(result.error || 'Музыкальный мост недоступен.')
  return result.tracks ?? []
}

/** Metadata search: streams never flow through Vercel. */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const data = await request.json() as Record<string, unknown>
    const provider = data.provider
    const query = typeof data.query === 'string' ? data.query.trim() : ''
    const jamendoClientId = typeof data.jamendoClientId === 'string' ? data.jamendoClientId.trim() : ''
    if (!['youtube', 'soundcloud', 'audius', 'jamendo'].includes(String(provider)) ||
        query.length > 180 || jamendoClientId.length > 128)
      return NextResponse.json({ error: 'Некорректные параметры поиска' }, { status: 400 })
    let tracks: unknown
    if (provider === 'youtube') tracks = await discoverYouTube(query, { signal: AbortSignal.timeout(13_000) })
    else if (provider === 'soundcloud') tracks = await bridge('/api/search', { provider, query })
    else tracks = await discoverMusic({
      provider: provider as MusicSource, query, jamendoClientId,
      signal: AbortSignal.timeout(13_000)
    })
    return NextResponse.json({ tracks }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Поиск временно недоступен' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
