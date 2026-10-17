import { networkInterfaces } from 'node:os'
import { isIP } from 'node:net'
import { LAN_SYNC_DEFAULT_PORT, LAN_SYNC_PORT_SPAN } from '@mymind/contracts/profile-sync'

const ENDPOINTS = new Set([
  'hello',
  'challenge',
  'prove',
  'inventory',
  'plan',
  'commit',
  'assets/upload',
  'assets/download'
])
const MAX_BODY_BYTES = 128 * 1024 * 1024

export function localIpv4Addresses(): string[] {
  return Object.values(networkInterfaces())
    .flatMap((entries) => entries ?? [])
    .filter((entry) => entry.family === 'IPv4' && !entry.internal && privateIpv4(entry.address))
    .map((entry) => entry.address)
}
function privateIpv4(value: string): boolean {
  if (isIP(value) !== 4) return false
  const [a, b] = value.split('.').map(Number)
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
}
export function allowedRelayTarget(
  host: string,
  port: number,
  addresses = localIpv4Addresses()
): boolean {
  if (
    !Number.isInteger(port) ||
    port < LAN_SYNC_DEFAULT_PORT ||
    port >= LAN_SYNC_DEFAULT_PORT + LAN_SYNC_PORT_SPAN ||
    isIP(host) !== 4
  )
    return false
  if (host === '127.0.0.1') return true
  // Discovery is confined to the local service's /24 LAN; arbitrary hosts and metadata services are excluded.
  return (
    privateIpv4(host) &&
    addresses.some(
      (address) =>
        address.split('.').slice(0, 3).join('.') === host.split('.').slice(0, 3).join('.')
    )
  )
}

export async function relayLanRequest(
  request: Request,
  target: string[],
  enabled = process.env.MYMIND_LAN_SYNC_ENABLED === '1',
  transport: typeof fetch = fetch
): Promise<Response> {
  const json = (value: unknown, status: number): Response =>
    Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } })
  if (!enabled)
    return json(
      {
        error:
          'Локальный LAN-сервис выключен. Запустите npm run start:pwa:lan на компьютере с MyMind.'
      },
      503
    )
  const origin = request.headers.get('origin')
  // Next's internal hostname can differ from the address opened on the phone.
  const url = new URL(request.url)
  const serviceHost = request.headers.get('host')
  let expectedOrigin = url.origin
  if (serviceHost) {
    try {
      expectedOrigin = new URL(`${url.protocol}//${serviceHost}`).origin
    } catch {
      return json({ error: 'Недопустимый адрес сервиса' }, 400)
    }
  }
  if (
    request.headers.get('X-MyMind-Lan') !== '1' ||
    (origin && origin !== expectedOrigin) ||
    request.headers.get('sec-fetch-site') === 'cross-site'
  )
    return json({ error: 'Недопустимый источник запроса' }, 403)
  if (target.length === 1 && target[0] === 'network' && request.method === 'GET')
    return json({ ip: localIpv4Addresses()[0] ?? '127.0.0.1' }, 200)
  const [host, portString, ...segments] = target
  const port = Number(portString)
  const endpoint = segments.join('/')
  if (
    !allowedRelayTarget(host, port) ||
    !ENDPOINTS.has(endpoint) ||
    (endpoint === 'hello' ? request.method !== 'GET' : request.method !== 'POST')
  )
    return json({ error: 'Адрес или операция LAN-синхронизации не разрешены' }, 400)
  try {
    let body: Uint8Array<ArrayBuffer> | undefined
    if (request.method === 'POST') {
      const declared = Number(request.headers.get('content-length') ?? 0)
      if (declared > MAX_BODY_BYTES) return json({ error: 'Запрос слишком большой' }, 413)
      const reader = request.body?.getReader()
      const parts: Uint8Array[] = []
      let size = 0
      if (reader) {
        while (true) {
          const chunk = await reader.read()
          if (chunk.done) break
          size += chunk.value.length
          if (size > MAX_BODY_BYTES) {
            await reader.cancel()
            return json({ error: 'Запрос слишком большой' }, 413)
          }
          parts.push(chunk.value)
        }
      }
      body = new Uint8Array(size)
      let offset = 0
      for (const part of parts) {
        body.set(part, offset)
        offset += part.length
      }
    }
    const headers = new Headers({ 'Content-Type': 'application/json' })
    const authorization = request.headers.get('authorization')
    if (authorization) headers.set('Authorization', authorization)
    const response = await transport(`http://${host}:${port}/mymind-sync/v1/${endpoint}`, {
      method: request.method,
      headers,
      body,
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(45_000)])
    })
    return new Response(response.body, {
      status: response.status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    })
  } catch {
    return json(
      {
        error:
          'Компьютер недоступен. Проверьте LAN-сервис, адрес и включённую синхронизацию MyMind.'
      },
      502
    )
  }
}
