import { app } from 'electron'
import { createServer, type IncomingMessage, type ServerResponse, type Server } from 'node:http'
import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createHash, randomBytes } from 'node:crypto'
import { spawn } from 'node:child_process'
import { Readable } from 'node:stream'
import { resolveAudioUrl } from './music-yt-dlp'
import { findOfflineMusic, type OfflineAudio } from './music-offline'
import type { MusicEngineOfflineInput } from '../../shared/contracts/music'

interface Session {
  original?: string
  cacheKey?: string
  provider?: 'youtube' | 'soundcloud'
  local?: OfflineAudio
  createdAt: number
}
const sessions = new Map<string, Session>()
const TTL = 75 * 60_000
const CACHE_LIMIT = 45 * 1024 * 1024
let server: Server | null = null
let port = 0
let starting: Promise<void> | null = null

function allowedMediaUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') return false
    if (parsed.username || parsed.password || parsed.port) return false
    const host = parsed.hostname.toLowerCase()
    if (
      host === 'localhost' ||
      host.endsWith('.localhost') ||
      host.endsWith('.local') ||
      host === '127.0.0.1' ||
      host === '::1'
    )
      return false
    return true
  } catch {
    return false
  }
}

function audioCachePath(key: string): string {
  return join(app.getPath('userData'), 'music-cache', key + '.audio')
}
async function cached(
  req: IncomingMessage,
  res: ServerResponse,
  path: string,
  fallbackMime: string
): Promise<boolean> {
  const info = await stat(path).catch(() => null)
  if (!info?.isFile() || info.size <= 0) return false
  const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '')
  let start = 0,
    end = info.size - 1
  if (match) {
    if (match[1] === '' && match[2] !== '') start = Math.max(0, info.size - Number(match[2]))
    else start = Number(match[1])
    if (match[1] !== '' && match[2] !== '') end = Number(match[2])
    if (
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      start < 0 ||
      start >= info.size ||
      end < start
    ) {
      res.writeHead(416, { 'Content-Range': 'bytes */' + info.size }).end()
      return true
    }
    end = Math.min(end, info.size - 1)
  }
  const savedMime = await readFile(path + '.mime', 'utf8').catch(() => fallbackMime)
  res.writeHead(match ? 206 : 200, {
    'Content-Type': savedMime,
    'Accept-Ranges': 'bytes',
    'Content-Length': end - start + 1,
    ...(match ? { 'Content-Range': 'bytes ' + start + '-' + end + '/' + info.size } : {}),
    'Cache-Control': 'private, max-age=600',
    'X-Content-Type-Options': 'nosniff'
  })
  if (req.method === 'HEAD') {
    res.end()
    return true
  }
  createReadStream(path, { start, end })
    .on('error', () => res.destroy())
    .pipe(res)
  return true
}

async function handleAudio(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const token = /^\/audio\/([a-f0-9]{64})$/.exec(req.url ?? '')?.[1]
  const session = token ? sessions.get(token) : null
  if (
    !session ||
    Date.now() - session.createdAt > TTL ||
    (req.method !== 'GET' && req.method !== 'HEAD')
  ) {
    res.writeHead(404).end()
    return
  }
  if (session.local) {
    if (!(await cached(req, res, session.local.path, session.local.mime))) res.writeHead(404).end()
    return
  }
  if (!session.original || !session.cacheKey || !session.provider) {
    res.writeHead(404).end()
    return
  }
  const path = audioCachePath(session.cacheKey)
  if (await cached(req, res, path, session.provider === 'youtube' ? 'audio/mp4' : 'audio/mpeg'))
    return
  // yt-dlp may resolve SoundCloud to HLS. Let ffmpeg turn it into a stream
  // that the browser's audio element can play when FFmpeg is installed.
  if (/\.m3u8(?:\?|$)/i.test(session.original)) {
    const ffmpeg = spawn(
      process.env.MYMIND_FFMPEG_PATH || 'ffmpeg',
      [
        '-nostdin',
        '-hide_banner',
        '-loglevel',
        'error',
        '-i',
        session.original,
        '-vn',
        '-acodec',
        'libmp3lame',
        '-b:a',
        '160k',
        '-f',
        'mp3',
        'pipe:1'
      ],
      { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] }
    )
    ffmpeg.on('error', () => {
      if (!res.headersSent) res.writeHead(502).end('ffmpeg unavailable')
      else res.destroy()
    })
    res.writeHead(200, { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' })
    if (req.method === 'HEAD') {
      ffmpeg.kill()
      res.end()
      return
    }
    ffmpeg.stdout.pipe(res)
    res.on('close', () => ffmpeg.kill())
    return
  }
  if (!allowedMediaUrl(session.original)) {
    res.writeHead(502).end()
    return
  }
  const controller = new AbortController()
  res.on('close', () => controller.abort())
  try {
    const upstream = await fetch(session.original, {
      signal: controller.signal,
      headers: req.headers.range ? { Range: req.headers.range } : {},
      redirect: 'follow'
    })
    if (!upstream.ok && upstream.status !== 206) {
      res.writeHead(502).end()
      return
    }
    if (!allowedMediaUrl(upstream.url)) {
      res.writeHead(502).end()
      return
    }
    const length = Number(upstream.headers.get('content-length') ?? 0)
    const headers: Record<string, string | number> = {
      'Content-Type': upstream.headers.get('content-type') ?? 'audio/mp4',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=300',
      'X-Content-Type-Options': 'nosniff'
    }
    for (const key of ['content-range', 'content-length']) {
      const value = upstream.headers.get(key)
      if (value) headers[key === 'content-range' ? 'Content-Range' : 'Content-Length'] = value
    }
    res.writeHead(upstream.status, headers)
    if (req.method === 'HEAD' || !upstream.body) {
      res.end()
      return
    }
    const stream = Readable.fromWeb(upstream.body as never)
    // Cache complete bounded responses only. Range requests are proxied without
    // storing partial files so seek behavior remains correct.
    const range = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(upstream.headers.get('content-range') || '')
    const complete =
      upstream.status === 200 ||
      (upstream.status === 206 &&
        range &&
        Number(range[1]) === 0 &&
        Number(range[2]) + 1 === Number(range[3]) &&
        length === Number(range[3]))
    if (complete && length > 0 && length <= CACHE_LIMIT) {
      await mkdir(join(app.getPath('userData'), 'music-cache'), { recursive: true })
      const temp = path + '.' + randomBytes(5).toString('hex') + '.part'
      const file = createWriteStream(temp, { flags: 'wx' })
      let received = 0
      stream.on('data', (part: Buffer) => {
        received += part.length
      })
      stream.pipe(file)
      file.on('finish', () => {
        void (async () => {
          if (received === length) {
            await rename(temp, path)
            await writeFile(
              path + '.mime',
              upstream.headers.get('content-type') ??
                (session.provider === 'youtube' ? 'audio/mp4' : 'audio/mpeg')
            )
          } else await rm(temp, { force: true })
        })().catch(() => undefined)
      })
      file.on('error', () => {
        void rm(temp, { force: true })
      })
      res.on('close', () => {
        if (!res.writableFinished) file.destroy()
      })
    }
    stream.on('error', () => res.destroy())
    stream.pipe(res)
  } catch {
    if (!res.headersSent) res.writeHead(502).end('Audio source unavailable')
    else res.destroy()
  }
}
async function startMusicServer(): Promise<void> {
  if (server?.listening) return
  if (!starting) {
    starting = (async () => {
      const instance = createServer((req, res) => {
        void handleAudio(req, res)
      })
      try {
        await new Promise<void>((resolve, reject) => {
          instance.once('error', reject)
          instance.listen(0, '127.0.0.1', resolve)
        })
        const address = instance.address()
        if (!address || typeof address === 'string') throw new Error('Music server unavailable')
        server = instance
        port = address.port
      } catch (reason) {
        instance.close()
        throw reason
      }
    })().finally(() => {
      starting = null
    })
  }
  await starting
}
async function createSession(session: Omit<Session, 'createdAt'>): Promise<string> {
  await startMusicServer()
  for (const [token, entry] of sessions) {
    if (Date.now() - entry.createdAt > TTL) sessions.delete(token)
  }
  const token = randomBytes(32).toString('hex')
  sessions.set(token, { ...session, createdAt: Date.now() })
  return 'http://127.0.0.1:' + port + '/audio/' + token
}
/** Serves downloaded files with range support; no raw OS path reaches the renderer. */
export async function localOfflineMusicStream(input: MusicEngineOfflineInput): Promise<string> {
  const local = await findOfflineMusic(input)
  if (!local) throw new Error('Этот трек ещё не скачан в MyMind')
  return createSession({ local })
}
export async function localMusicStream(
  provider: 'youtube' | 'soundcloud',
  id: string
): Promise<string> {
  const local = await findOfflineMusic({ provider, id })
  if (local) return createSession({ local })
  const source = await resolveAudioUrl(provider, id)
  if (!allowedMediaUrl(source)) throw new Error('Неподдерживаемый адрес аудиопотока')
  const cacheKey = createHash('sha256')
    .update(provider + ':' + id)
    .digest('hex')
  return createSession({ original: source, cacheKey, provider })
}
export function stopLocalMusicStream(): void {
  server?.close()
  server = null
  sessions.clear()
}
