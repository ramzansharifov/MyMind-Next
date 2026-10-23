import { NextResponse } from 'next/server'
import { musicBridgeRequest } from '../../../../server/music-bridge'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const input = await request.json() as { videoId?: unknown }
    if (typeof input.videoId !== 'string' || !/^[A-Za-z0-9_-]{11}$/.test(input.videoId))
      return NextResponse.json({ error: 'Invalid YouTube ID' }, { status: 400 })
    const result = await musicBridgeRequest('/api/radio', { videoId: input.videoId })
    return NextResponse.json({ tracks: result.tracks ?? [] }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Radio unavailable' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
