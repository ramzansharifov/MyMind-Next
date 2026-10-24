/** Server-side only. Private bridge token is never sent to the browser. */
export async function musicBridgeRequest(
  path: '/api/resolve' | '/api/radio' | '/api/search',
  data: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const origin = process.env.MYMIND_MUSIC_BRIDGE_URL?.replace(/\/$/, '')
  const token = process.env.MYMIND_MUSIC_BRIDGE_TOKEN
  if (!origin || !token || !/^https:\/\/[^/]+$/.test(origin))
    throw new Error(
      'Для потоков YouTube и SoundCloud настрой MUSIC_BRIDGE_URL и MUSIC_BRIDGE_TOKEN. См. apps/music-bridge/README.md'
    )
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 80_000)
  try {
    const response = await fetch(origin + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify(data),
      cache: 'no-store',
      signal: controller.signal
    })
    const result = (await response.json()) as Record<string, unknown>
    if (!response.ok)
      throw new Error(typeof result.error === 'string' ? result.error : 'Music bridge unavailable')
    return result
  } finally {
    clearTimeout(timeout)
  }
}
