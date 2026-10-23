import { NextResponse } from 'next/server'
import { discoverMusic, type MusicSource } from '@mymind/core/music-discovery'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Metadata only; no proxying or caching of audio/video streams. */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const data = await request.json() as Record<string, unknown>
    const provider = data.provider
    const query = typeof data.query === 'string' ? data.query.trim() : ''
    const jamendoClientId = typeof data.jamendoClientId === 'string' ? data.jamendoClientId.trim() : ''
    if ((provider !== 'audius' && provider !== 'jamendo') || query.length > 200 || jamendoClientId.length > 128)
      return NextResponse.json({ error: 'Некорректные параметры поиска' }, { status: 400 })
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12_000)
    try {
      const tracks = await discoverMusic({
        provider: provider as MusicSource,
        query, jamendoClientId, signal: controller.signal
      })
      return NextResponse.json({ tracks }, { headers: { 'Cache-Control': 'no-store' } })
    } finally {
      clearTimeout(timeout)
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Источник временно недоступен' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
