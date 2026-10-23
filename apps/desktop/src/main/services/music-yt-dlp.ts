import { app } from 'electron'
import { createHash } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { chmod, mkdir, rename, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import type { DiscoveredTrack } from '@mymind/core/music-discovery'

const RELEASE = 'https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest'
const UPDATED_AFTER_MS = 7 * 86_400_000
const MAX_DOWNLOAD = 64 * 1024 * 1024
let toolPathPromise: Promise<string> | null = null

function platformAsset(): string {
  if (process.platform === 'win32') return 'yt-dlp.exe'
  if (process.platform === 'darwin') return 'yt-dlp_macos'
  return 'yt-dlp_linux'
}

async function downloadBinary(url: string, dest: string, expected: string): Promise<void> {
  const response = await fetch(url, { headers: { 'User-Agent': 'MyMind-Music/1' }, signal: AbortSignal.timeout(90_000) })
  if (!response.ok || !response.body) throw new Error('Не удалось скачать yt-dlp с GitHub.')
  const tmp = dest + '.' + randomUUID() + '.tmp'
  const file = createWriteStream(tmp, { flags: 'wx' })
  const hash = createHash('sha256')
  let size = 0
  try {
    for await (const piece of response.body) {
      const bytes = Buffer.from(piece)
      size += bytes.length
      if (size > MAX_DOWNLOAD) throw new Error('Размер yt-dlp превышает ограничение')
      hash.update(bytes)
      if (!file.write(bytes)) await new Promise<void>((resolve) => file.once('drain', resolve))
    }
    await new Promise<void>((resolve, reject) => file.end((error?: Error | null) => error ? reject(error) : resolve()))
    if (hash.digest('hex').toLowerCase() !== expected.toLowerCase()) throw new Error('Контрольная сумма yt-dlp не совпадает!')
    await chmod(tmp, 0o755)
    await rm(dest, { force: true })
    await rename(tmp, dest)
  } catch (error) {
    file.destroy()
    await rm(tmp, { force: true }).catch(() => undefined)
    throw error
  }
}

/** Auto-install verified official standalone binary on first use, refresh weekly. */
async function findYtDlp(): Promise<string> {
  if (process.env.MYMIND_YTDLP_PATH) return process.env.MYMIND_YTDLP_PATH
  const directory = join(app.getPath('userData'), 'music-tools')
  const dest = join(directory, platformAsset())
  await mkdir(directory, { recursive: true })
  const existing = await stat(dest).catch(() => null)
  if (existing && Date.now() - existing.mtimeMs < UPDATED_AFTER_MS) return dest
  try {
    const response = await fetch(RELEASE, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'MyMind-Music/1' }, signal: AbortSignal.timeout(12_000) })
    if (!response.ok) throw new Error('GitHub недоступен')
    const release = await response.json() as { assets?: Array<{ name: string; browser_download_url: string }> }
    const asset = release.assets?.find(v => v.name === platformAsset())
    const sums = release.assets?.find(v => v.name === 'SHA2-256SUMS')
    if (!asset || !sums) throw new Error('Нет официального бинарника или checksum')
    const checksumResponse = await fetch(sums.browser_download_url, { signal: AbortSignal.timeout(20_000) })
    if (!checksumResponse.ok) throw new Error('Не удалось проверить checksum')
    const checksumText = await checksumResponse.text()
    const line = checksumText.split(/\r?\n/).find(v => v.trim().endsWith(platformAsset()))
    const digest = line?.trim().split(/\s+/)[0]
    if (!digest || !/^[0-9a-f]{64}$/i.test(digest)) throw new Error('Неверная checksum yt-dlp')
    await downloadBinary(asset.browser_download_url, dest, digest)
    return dest
  } catch (error) {
    if (existing) return dest // use verified previous version when offline
    throw new Error('Установка yt-dlp не удалась: ' + (error instanceof Error ? error.message : String(error)))
  }
}

export async function getMusicTool(): Promise<string> {
  toolPathPromise ??= findYtDlp().catch(error => { toolPathPromise = null; throw error })
  return toolPathPromise
}

export async function runMusicTool(args: readonly string[], timeoutMs = 45_000): Promise<string> {
  const bin = await getMusicTool()
  return new Promise((resolve, reject) => {
    const child = spawn(bin, ['--no-config', '--no-warnings', '--no-progress', '--js-runtimes', 'node', ...args], {
      windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], env: process.env
    })
    let stdout = ''
    let stderr = ''
    let done = false
    const finish = (error?: Error) => {
      if (done) return
      done = true
      clearTimeout(timer)
      if (error) reject(error)
      else resolve(stdout)
    }
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      finish(new Error('yt-dlp превысил время ожидания'))
    }, timeoutMs)
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (data: string) => {
      stdout += data
      if (stdout.length > 8_000_000) { child.kill('SIGKILL'); finish(new Error('Слишком большой ответ yt-dlp')) }
    })
    child.stderr.on('data', (data: string) => { stderr = (stderr + data).slice(-2500) })
    child.on('error', error => finish(error))
    child.on('close', code => finish(code === 0 ? undefined : new Error('yt-dlp: ' + (stderr.trim() || 'код ' + code))))
  })
}
const record = (v: unknown): Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {}
const string = (v: unknown): string => typeof v === 'string' ? v : ''
const num = (v: unknown): number | null => typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.round(v) : null

function metaTrack(raw: unknown, provider: 'youtube' | 'soundcloud'): DiscoveredTrack | null {
  const data = record(raw)
  const rawUrl = string(data.webpage_url || data.url)
  let id = string(data.id)
  let link = ''
  if (provider === 'youtube') {
    if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return null
    link = 'https://www.youtube.com/watch?v=' + id
  } else {
    try {
      const url = new URL(rawUrl)
      if (url.hostname !== 'soundcloud.com' || url.protocol !== 'https:') return null
      link = url.origin + url.pathname
      id = url.pathname.replace(/^\//, '')
    } catch { return null }
  }
  const title = string(data.title)
  if (!title) return null
  const artist = string(data.uploader || data.channel || data.artist) || (provider === 'youtube' ? 'YouTube' : 'SoundCloud')
  const art = string(data.thumbnail)
  return {
    key: provider + ':' + id, provider, id, title, artist,
    durationSeconds: num(data.duration), artworkUrl: art.startsWith('https://') ? art : null,
    streamUrl: link, permalink: link
  }
}
/**
 * Fallback for the YouTube WEB InnerTube endpoint, using yt-dlp's maintained
 * ytsearch extractor rather than duplicating its changing client configuration.
 * Fetch metadata only; --flat-playlist avoids resolving each audio stream.
 */
export async function searchYouTubeViaYtDlp(query: string): Promise<DiscoveredTrack[]> {
  const safe = query.trim().slice(0, 150) || 'music'
  const raw = JSON.parse(await runMusicTool([
    '--dump-single-json', '--flat-playlist', 'ytsearch20:' + safe
  ], 45_000)) as unknown
  const entries = Array.isArray(record(raw).entries) ? record(raw).entries as unknown[] : []
  return entries.map((row) => metaTrack(row, 'youtube'))
    .filter((track): track is DiscoveredTrack => track !== null)
}

export async function searchSoundCloud(query: string): Promise<DiscoveredTrack[]> {
  const safe = query.trim().slice(0, 150)
  if (!safe) return []
  const raw = JSON.parse(await runMusicTool(['--dump-single-json', '--flat-playlist', 'scsearch25:' + safe]))
  const entries = Array.isArray(record(raw).entries) ? record(raw).entries as unknown[] : []
  return entries.map(row => metaTrack(row, 'soundcloud')).filter((track): track is DiscoveredTrack => track !== null)
}

export async function youtubeRadio(videoId: string): Promise<DiscoveredTrack[]> {
  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) throw new Error('Неверный video ID')
  const url = 'https://www.youtube.com/watch?v=' + videoId + '&list=RD' + videoId
  const raw = JSON.parse(await runMusicTool(['--dump-single-json', '--flat-playlist', '--playlist-items', '1:30', url], 65_000))
  const entries = Array.isArray(record(raw).entries) ? record(raw).entries as unknown[] : []
  return entries.map(row => metaTrack(row, 'youtube')).filter((track): track is DiscoveredTrack => track !== null)
}

export async function resolveAudioUrl(provider: 'youtube' | 'soundcloud', id: string): Promise<string> {
  let link: string
  if (provider === 'youtube') {
    if (!/^[A-Za-z0-9_-]{11}$/.test(id)) throw new Error('Неверный YouTube ID')
    link = 'https://www.youtube.com/watch?v=' + id
  } else {
    if (!/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+){1,3}$/.test(id)) throw new Error('Неверный SoundCloud ID')
    link = 'https://soundcloud.com/' + id
  }
  const output = await runMusicTool(['--get-url', '--no-playlist', '-f', 'bestaudio[ext=m4a]/bestaudio', link], 70_000)
  const url = output.split(/\r?\n/).find(line => line.startsWith('https://'))
  if (!url) throw new Error('yt-dlp не смог получить аудиопоток.')
  return url
}

/** Save an authorized track as its original audio format in the selected folder. */
export async function downloadMusicTrack(
  provider: 'youtube' | 'soundcloud', id: string, suggestedName: string, folder: string
): Promise<string> {
  let link: string
  if (provider === 'youtube') {
    if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) throw new Error('Неверный идентификатор YouTube')
    link = 'https://www.youtube.com/watch?v=' + id
  } else {
    if (!/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+){1,3}$/.test(id))
      throw new Error('Неверный идентификатор SoundCloud')
    link = 'https://soundcloud.com/' + id
  }
  const base = suggestedName
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/[.\s]+$/g, '')
    .trim()
    .slice(0, 110) || 'MyMind Audio'
  const output = await runMusicTool([
    '--no-playlist', '--no-overwrites', '--max-filesize', '160M', '--paths', folder,
    '--output', base + '.%(ext)s', '--format', 'bestaudio[ext=m4a]/bestaudio',
    '--print', 'after_move:filepath', link
  ], 240_000)
  const final = output.split(/\r?\n/).map(line => line.trim())
    .find(line => line && (line.includes('/') || line.includes('\\')))
  if (!final) throw new Error('Аудиофайл не был сохранён. Проверь разрешения и наличие файла.')
  return final
}
