import { app } from 'electron'
import { createHash, randomUUID } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { Readable, Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type { MusicEngineDownloadInput, MusicEngineOfflineInput } from '../../shared/contracts/music'
import { validStreamingTrack } from '@mymind/core/music-collection'
import { downloadMusicTrack } from './music-yt-dlp'

const MAX_AUDIO_BYTES = 160 * 1024 * 1024
const EXTENSIONS = new Set(['.mp3', '.m4a', '.mp4', '.webm', '.ogg', '.opus', '.aac', '.flac', '.wav'])
type Provider = MusicEngineOfflineInput['provider']

interface OfflineEntry {
  key: string
  filename: string
  mime: string
}
export interface OfflineAudio {
  path: string
  mime: string
}

function directory(): string {
  return join(app.getPath('userData'), 'music-downloads')
}
function digest(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}
function keyFor(input: MusicEngineOfflineInput): string {
  const { provider, id } = input
  if (!['youtube', 'soundcloud', 'audius', 'jamendo'].includes(provider) ||
      typeof id !== 'string' || id.length > 250 || !/^[a-zA-Z0-9_/-]+$/.test(id) ||
      id.includes('//') || id.startsWith('/') || id.endsWith('/'))
    throw new Error('Недопустимый идентификатор музыки')
  return provider + ':' + id
}
function mimeFor(extension: string): string {
  const known: Record<string, string> = {
    '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.mp4': 'audio/mp4',
    '.webm': 'audio/webm', '.ogg': 'audio/ogg', '.opus': 'audio/ogg',
    '.aac': 'audio/aac', '.flac': 'audio/flac', '.wav': 'audio/wav'
  }
  return known[extension] ?? 'application/octet-stream'
}
async function stored(key: string): Promise<{ entry: OfflineEntry; path: string } | null> {
  const hash = digest(key)
  try {
    const entry = JSON.parse(await readFile(join(directory(), hash + '.json'), 'utf8')) as OfflineEntry
    const extension = extname(entry.filename).toLowerCase()
    if (entry.key !== key || !EXTENSIONS.has(extension) ||
        entry.filename !== hash + extension ||
        entry.mime !== mimeFor(extension)) return null
    const path = join(directory(), entry.filename)
    const file = await stat(path)
    return file.isFile() && file.size > 0 && file.size <= MAX_AUDIO_BYTES ? { entry, path } : null
  } catch {
    return null
  }
}
export async function listOfflineMusic(): Promise<string[]> {
  const names = await readdir(directory()).catch(() => [] as string[])
  const keys: string[] = []
  for (const name of names) {
    if (!/^[a-f0-9]{64}\.json$/.test(name)) continue
    try {
      const entry = JSON.parse(await readFile(join(directory(), name), 'utf8')) as OfflineEntry
      if (typeof entry.key === 'string' && name === digest(entry.key) + '.json' &&
          await stored(entry.key)) keys.push(entry.key)
    } catch { /* ignore incomplete/older metadata */ }
  }
  return keys
}
export async function findOfflineMusic(input: MusicEngineOfflineInput): Promise<OfflineAudio | null> {
  const result = await stored(keyFor(input))
  return result ? { path: result.path, mime: result.entry.mime } : null
}
export async function removeOfflineMusic(input: MusicEngineOfflineInput): Promise<boolean> {
  const key = keyFor(input)
  const result = await stored(key)
  if (!result) return false
  await rm(join(directory(), digest(key) + '.json'), { force: true })
  await rm(result.path, { force: true })
  return true
}
function downloadableUrl(track: NonNullable<ReturnType<typeof validStreamingTrack>>): string {
  if (!track.downloadUrl) throw new Error('Источник не разрешил скачивание этого трека')
  const url = new URL(track.downloadUrl)
  if (track.provider === 'audius') {
    if (url.hostname !== 'api.audius.co' ||
        url.pathname !== '/v1/tracks/' + encodeURIComponent(track.id) + '/download')
      throw new Error('Некорректная ссылка Audius')
  } else if (track.provider === 'jamendo') {
    if (url.hostname !== 'jamendo.com' && !url.hostname.endsWith('.jamendo.com'))
      throw new Error('Некорректная ссылка Jamendo')
  } else throw new Error('Неподдерживаемый источник загрузки')
  return url.href
}
function publicAudioUrl(value: string): boolean {
  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase()
    // Reject localhost/private literal hosts and non-web schemes on redirects.
    return url.protocol === 'https:' && !url.username && !url.password && !url.port &&
      !host.endsWith('.local') && !host.endsWith('.internal') &&
      host !== 'localhost' && host !== '::1' &&
      !/^\[/.test(host) && !/^\d+\.\d+\.\d+\.\d+$/.test(host)
  } catch { return false }
}
async function fetchAudio(url: string, dest: string): Promise<string> {
  let location = url
  for (let hop = 0; hop <= 5; hop++) {
    if (!publicAudioUrl(location)) throw new Error('Небезопасная ссылка аудиофайла')
    const response = await fetch(location, { redirect: 'manual', signal: AbortSignal.timeout(90_000) })
    if (response.status >= 300 && response.status < 400) {
      const next = response.headers.get('location')
      await response.body?.cancel()
      if (!next) throw new Error('Источник не предоставил ссылку на аудио')
      location = new URL(next, location).href
      continue
    }
    if (!response.ok || !response.body) throw new Error('Не удалось получить аудио (HTTP ' + response.status + ')')
    const contentType = (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
    if (!contentType.startsWith('audio/') && contentType !== 'application/octet-stream')
      throw new Error('Источник вернул не аудиофайл')
    const declared = Number(response.headers.get('content-length') ?? 0)
    if (declared > MAX_AUDIO_BYTES) throw new Error('Файл больше допустимого размера')
    let size = 0
    const limit = new Transform({
      transform(chunk: Buffer, _encoding, done) {
        size += chunk.length
        done(size > MAX_AUDIO_BYTES ? new Error('Аудиофайл превышает 160 МБ') : null, chunk)
      }
    })
    await pipeline(Readable.fromWeb(response.body as never), limit, createWriteStream(dest, { flags: 'wx' }))
    if (!size) throw new Error('Источник вернул пустой аудиофайл')
    if (declared > 0 && size !== declared) throw new Error('Загрузка аудиофайла прервана')
    return contentType
  }
  throw new Error('Слишком много перенаправлений при скачивании')
}
const active = new Map<string, Promise<string>>()

/** Save a private copy under Electron userData; never expose a file path to the renderer. */
export async function downloadOfflineMusic(input: MusicEngineDownloadInput): Promise<string> {
  const track = validStreamingTrack(input)
  if (!track) throw new Error('Некорректная запись музыкального источника')
  const key = keyFor(track)
  const pending = active.get(key)
  if (pending) return pending
  const task = (async (): Promise<string> => {
    if (await stored(key)) return key
    const dir = directory()
    await mkdir(dir, { recursive: true })
    const temporary = join(dir, '.download-' + randomUUID())
    await mkdir(temporary)
    try {
      const hash = digest(key)
      let source: string
      let extension: string
      if (track.provider === 'youtube' || track.provider === 'soundcloud') {
        // The existing downloader is used only for an explicitly requested copy.
        source = await downloadMusicTrack(track.provider, track.id, hash, temporary)
        extension = extname(source).toLowerCase()
      } else {
        const url = downloadableUrl(track)
        source = join(temporary, hash + '.audio')
        const contentType = await fetchAudio(url, source)
        extension = contentType.includes('mp4') || contentType.includes('aac') ? '.m4a' :
          contentType.includes('ogg') ? '.ogg' :
          contentType.includes('flac') ? '.flac' :
          contentType.includes('wav') ? '.wav' :
          contentType.includes('webm') ? '.webm' : '.mp3'
      }
      if (!EXTENSIONS.has(extension)) throw new Error('Неподдерживаемый аудиоформат')
      const file = await stat(source)
      if (!file.isFile() || !file.size || file.size > MAX_AUDIO_BYTES)
        throw new Error('Аудиофайл пустой или слишком большой')
      const filename = hash + extension
      await rename(source, join(dir, filename))
      const meta: OfflineEntry = { key, filename, mime: mimeFor(extension) }
      const pendingMeta = join(temporary, hash + '.json')
      await writeFile(pendingMeta, JSON.stringify(meta), { flag: 'wx' })
      await rename(pendingMeta, join(dir, hash + '.json'))
      return key
    } finally {
      await rm(temporary, { recursive: true, force: true }).catch(() => undefined)
    }
  })()
  active.set(key, task)
  try { return await task } finally { active.delete(key) }
}
