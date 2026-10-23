import { NextResponse } from 'next/server'
import { musicBridgeRequest } from '../../../../server/music-bridge'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const input = await request.json() as { provider?: unknown; id?: unknown }
    if ((input.provider !== 'youtube' && input.provider !== 'soundcloud') ||
        typeof input.id !== 'string' || input.id.length > 180)
      return NextResponse.json({ error: 'Invalid track' }, { status: 400 })
    const result = await musicBridgeRequest('/api/resolve', { provider: input.provider, id: input.id })
    const streamUrl = result.streamUrl
    const expected = process.env.MYMIND_MUSIC_BRIDGE_URL?.replace(/\/$/, '')
    if (typeof streamUrl !== 'string' || !expected || !streamUrl.startsWith(expected + '/audio/'))
      throw new Error('Музыкальный мост вернул недопустимый адрес потока.')
    return NextResponse.json({ streamUrl }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Audio source error' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
