// Standalone self-hostable companion for the browser PWA. No paid API keys.
// Deploy behind HTTPS. Require MUSIC_BRIDGE_TOKEN for all control endpoints.
// Content streaming is guarded by short-lived unguessable per-play sessions.
import { createServer } from 'node:http'
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto'
import { spawn } from 'node:child_process'
import { Readable } from 'node:stream'
import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir, rename, stat, rm } from 'node:fs/promises'
import { join } from 'node:path'

const port = Number(process.env.PORT || 8787)
const secret = process.env.MUSIC_BRIDGE_TOKEN ?? ''
const publicUrl = (process.env.MUSIC_BRIDGE_PUBLIC_URL ?? '').replace(/\/$/, '')
const cacheDirectory = process.env.MUSIC_CACHE_DIR || join(process.cwd(), '.music-cache')
const sessions = new Map()
const MAX_CACHE_BYTES = 45 * 1024 * 1024
if (secret.length < 32 || !/^https:\/\/[^/]+$/.test(publicUrl)) {
  console.error('Set a random MUSIC_BRIDGE_TOKEN (32+ chars) and HTTPS MUSIC_BRIDGE_PUBLIC_URL')
  process.exit(1)
}
function authorized(req) {
  const value = req.headers.authorization ?? ''
  const expected = 'Bearer ' + secret
  const a = Buffer.from(value),
    b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}
function send(res, status, json) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  })
  res.end(JSON.stringify(json))
}
function validId(provider, id) {
  return provider === 'youtube'
    ? /^[a-zA-Z0-9_-]{11}$/.test(id)
    : provider === 'soundcloud' && /^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+){1,3}$/.test(id)
}
function href(provider, id) {
  if (!validId(provider, id)) throw new Error('Invalid media identifier')
  return provider === 'youtube'
    ? 'https://www.youtube.com/watch?v=' + id
    : 'https://soundcloud.com/' + id
}
function ytDlp(args, timeoutMs = 65000) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.env.MUSIC_YTDLP_PATH || 'yt-dlp',
      ['--no-config', '--no-warnings', '--no-progress', '--js-runtimes', 'node', ...args],
      { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true }
    )
    let out = '',
      err = '',
      finished = false
    const finish = (error) => {
      if (finished) return
      finished = true
      clearTimeout(timer)
      if (error) reject(error)
      else resolve(out)
    }
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      finish(new Error('Timeout'))
    }, timeoutMs)
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (s) => {
      out += s
      if (out.length > 8_000_000) {
        child.kill()
        finish(new Error('Output too large'))
      }
    })
    child.stderr.on('data', (s) => {
      err = (err + s).slice(-1000)
    })
    child.on('error', finish)
    child.on('close', (code) => finish(code === 0 ? null : new Error(err || 'yt-dlp failed')))
  })
}
function track(v, provider) {
  if (!v || typeof v !== 'object') return null
  const raw =
    typeof v.webpage_url === 'string' ? v.webpage_url : typeof v.url === 'string' ? v.url : ''
  let id = typeof v.id === 'string' ? v.id : ''
  if (provider === 'soundcloud') {
    try {
      const u = new URL(raw)
      if (u.hostname !== 'soundcloud.com' || u.protocol !== 'https:') return null
      id = u.pathname.replace(/^\//, '')
    } catch {
      return null
    }
  }
  if (!validId(provider, id) || typeof v.title !== 'string') return null
  const url = href(provider, id)
  const art =
    typeof v.thumbnail === 'string' && v.thumbnail.startsWith('https://') ? v.thumbnail : null
  const artist =
    typeof v.uploader === 'string'
      ? v.uploader
      : typeof v.channel === 'string'
        ? v.channel
        : 'Unknown'
  return {
    key: provider + ':' + id,
    provider,
    id,
    title: v.title,
    artist,
    durationSeconds: typeof v.duration === 'number' ? Math.round(v.duration) : null,
    artworkUrl: art,
    streamUrl: url,
    permalink: url
  }
}
async function metadata(provider, query, seed) {
  if (provider === 'soundcloud') {
    const text = await ytDlp([
      '--dump-single-json',
      '--flat-playlist',
      'scsearch25:' + query.slice(0, 150)
    ])
    return (JSON.parse(text).entries || []).map((v) => track(v, provider)).filter(Boolean)
  }
  if (provider === 'youtube' && seed && validId(provider, seed)) {
    const text = await ytDlp([
      '--dump-single-json',
      '--flat-playlist',
      '--playlist-items',
      '1:30',
      href(provider, seed) + '&list=RD' + seed
    ])
    return (JSON.parse(text).entries || []).map((v) => track(v, provider)).filter(Boolean)
  }
  throw new Error('Unsupported search')
}
async function resolve(provider, id) {
  const out = await ytDlp([
    '--get-url',
    '--no-playlist',
    '-f',
    'bestaudio[ext=m4a]/bestaudio',
    href(provider, id)
  ])
  const url = out.split(/\r?\n/).find((v) => v.startsWith('https://'))
  if (!url) throw new Error('No audio URL available')
  const parsed = new URL(url)
  if (parsed.port || parsed.username || parsed.password || parsed.hostname === 'localhost')
    throw new Error('Untrusted media endpoint')
  const token = randomBytes(32).toString('hex')
  const cacheKey = createHash('sha256')
    .update(provider + ':' + id)
    .digest('hex')
  sessions.set(token, { url, cacheKey, time: Date.now() })
  return publicUrl + '/audio/' + token
}
function getRange(header, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header || '')
  if (!match) return null
  let start = match[1] === '' ? Math.max(0, size - Number(match[2])) : Number(match[1])
  let end = match[2] && match[1] !== '' ? Number(match[2]) : size - 1
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start >= size || end < start)
    return false
  return { start, end: Math.min(end, size - 1) }
}
async function audio(req, res, token) {
  const session = sessions.get(token)
  if (
    !session ||
    Date.now() - session.time > 60 * 60_000 ||
    !['GET', 'HEAD'].includes(req.method)
  ) {
    res.writeHead(404).end()
    return
  }
  const path = join(cacheDirectory, session.cacheKey + '.audio')
  const cached = await stat(path).catch(() => null)
  if (cached && cached.isFile() && cached.size > 0) {
    const range = getRange(req.headers.range, cached.size)
    if (range === false) {
      res.writeHead(416, { 'Content-Range': 'bytes */' + cached.size }).end()
      return
    }
    const start = range?.start ?? 0,
      end = range?.end ?? cached.size - 1
    res.writeHead(range ? 206 : 200, {
      'Content-Type': 'audio/mp4',
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
      ...(range ? { 'Content-Range': 'bytes ' + start + '-' + end + '/' + cached.size } : {}),
      'Cache-Control': 'private,max-age=300',
      'X-Content-Type-Options': 'nosniff'
    })
    if (req.method === 'HEAD') {
      res.end()
      return
    }
    createReadStream(path, { start, end }).pipe(res)
    return
  }
  if (/\.m3u8(?:\?|$)/.test(session.url)) {
    const ff = spawn(
      'ffmpeg',
      [
        '-nostdin',
        '-loglevel',
        'error',
        '-i',
        session.url,
        '-vn',
        '-acodec',
        'libmp3lame',
        '-b:a',
        '160k',
        '-f',
        'mp3',
        'pipe:1'
      ],
      { stdio: ['ignore', 'pipe', 'ignore'] }
    )
    ff.on('error', () => res.destroy())
    res.writeHead(200, { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' })
    if (req.method === 'HEAD') {
      ff.kill()
      res.end()
      return
    }
    ff.stdout.pipe(res)
    res.on('close', () => ff.kill())
    return
  }
  const abort = new AbortController()
  res.on('close', () => abort.abort())
  try {
    const upstream = await fetch(session.url, {
      headers: req.headers.range ? { Range: req.headers.range } : {},
      signal: abort.signal
    })
    if (
      ![200, 206].includes(upstream.status) ||
      !upstream.body ||
      new URL(upstream.url).protocol !== 'https:'
    ) {
      res.writeHead(502).end()
      return
    }
    const headers = {
      'Content-Type': upstream.headers.get('content-type') || 'audio/mp4',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private,max-age=120',
      'X-Content-Type-Options': 'nosniff'
    }
    for (const key of ['content-length', 'content-range']) {
      if (upstream.headers.has(key)) headers[key] = upstream.headers.get(key)
    }
    res.writeHead(upstream.status, headers)
    if (req.method === 'HEAD') {
      res.end()
      return
    }
    const stream = Readable.fromWeb(upstream.body)
    const length = Number(upstream.headers.get('content-length') || 0)
    if (upstream.status === 200 && length > 0 && length <= MAX_CACHE_BYTES) {
      await mkdir(cacheDirectory, { recursive: true })
      const temp = path + '.' + randomBytes(4).toString('hex') + '.part'
      const file = createWriteStream(temp, { flags: 'wx' })
      let count = 0
      stream.on('data', (chunk) => {
        count += chunk.length
      })
      stream.pipe(file)
      file.on('finish', () => {
        void (count === length ? rename(temp, path) : rm(temp, { force: true }))
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
    if (!res.headersSent) res.writeHead(502).end()
    else res.destroy()
  }
}
const server = createServer(async (req, res) => {
  try {
    const path = new URL(req.url || '/', 'http://localhost').pathname
    if (path === '/health') {
      send(res, 200, { ok: true, providers: ['youtube', 'soundcloud'] })
      return
    }
    const mediaToken = /^\/audio\/([a-f0-9]{64})$/.exec(path)?.[1]
    if (mediaToken) {
      await audio(req, res, mediaToken)
      return
    }
    if (!authorized(req)) {
      send(res, 401, { error: 'Unauthorized' })
      return
    }
    if (req.method !== 'POST' || !['/api/search', '/api/radio', '/api/resolve'].includes(path)) {
      send(res, 404, { error: 'Not found' })
      return
    }
    let text = ''
    for await (const chunk of req) {
      text += chunk.toString('utf8')
      if (text.length > 4096) {
        send(res, 413, { error: 'Too large' })
        return
      }
    }
    const data = JSON.parse(text)
    if (
      path === '/api/search' &&
      data.provider === 'soundcloud' &&
      typeof data.query === 'string'
    ) {
      send(res, 200, { tracks: await metadata('soundcloud', data.query) })
      return
    }
    if (path === '/api/radio' && typeof data.videoId === 'string') {
      send(res, 200, { tracks: await metadata('youtube', '', data.videoId) })
      return
    }
    if (path === '/api/resolve' && typeof data.id === 'string' && validId(data.provider, data.id)) {
      send(res, 200, { streamUrl: await resolve(data.provider, data.id) })
      return
    }
    send(res, 400, { error: 'Invalid provider or parameters' })
  } catch (e) {
    send(res, 502, { error: e instanceof Error ? e.message.slice(0, 400) : 'Bridge error' })
  }
})
server.listen(port, '0.0.0.0', () => console.log('Music bridge listening at :' + port))
