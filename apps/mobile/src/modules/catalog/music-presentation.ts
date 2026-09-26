import {
  normalizeMusicItemRecord,
  type CreateMusicItemInput,
  type MusicItemRecord,
  type UpdateMusicItemInput
} from '@mymind/contracts/music'

export interface MobileMusicTrackDraft {
  title: string
  artist: string
  year: string
  duration: string
  favorite: boolean
}

export function formatMusicDuration(seconds: number | null): string | null {
  if (seconds === null || seconds <= 0) return null
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const rest = seconds % 60
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${rest.toString().padStart(2, '0')}`
  }
  return `${minutes}:${rest.toString().padStart(2, '0')}`
}

export function parseMusicDuration(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^\d+$/.test(trimmed)) {
    const seconds = Number.parseInt(trimmed, 10)
    return seconds > 0 ? seconds : Number.NaN
  }

  const short = /^(\d+):([0-5]\d)$/.exec(trimmed)
  if (short) {
    const seconds = Number.parseInt(short[1]!, 10) * 60 + Number.parseInt(short[2]!, 10)
    return seconds > 0 ? seconds : Number.NaN
  }

  const long = /^(\d+):([0-5]\d):([0-5]\d)$/.exec(trimmed)
  if (long) {
    const seconds =
      Number.parseInt(long[1]!, 10) * 3600 +
      Number.parseInt(long[2]!, 10) * 60 +
      Number.parseInt(long[3]!, 10)
    return seconds > 0 ? seconds : Number.NaN
  }

  return Number.NaN
}

export function musicTrackDraftFromItem(item?: MusicItemRecord): MobileMusicTrackDraft {
  const normalized = item ? normalizeMusicItemRecord(item) : null
  return {
    title: normalized?.title ?? '',
    artist: normalized?.artist ?? '',
    year: normalized?.year?.toString() ?? '',
    duration: formatMusicDuration(normalized?.durationSeconds ?? null) ?? '',
    favorite: normalized?.favorite ?? false
  }
}

export function musicTrackInputFromDraft(draft: MobileMusicTrackDraft): CreateMusicItemInput {
  const title = draft.title.trim()
  const artist = draft.artist.trim()
  if (!title) throw new Error('Введите название трека')
  if (!artist) throw new Error('Введите исполнителя')

  const durationSeconds = parseMusicDuration(draft.duration)
  if (Number.isNaN(durationSeconds)) {
    throw new Error('Длительность укажите в формате 3:45, 1:03:20 или числом секунд')
  }

  const year = draft.year.trim() ? Number.parseInt(draft.year, 10) : null
  if (draft.year.trim() && !Number.isFinite(year)) throw new Error('Введите корректный год')

  return {
    title,
    artist,
    year,
    durationSeconds,
    favorite: draft.favorite
  }
}

export function musicRecordToUpdateInput(item: MusicItemRecord): UpdateMusicItemInput {
  const normalized = normalizeMusicItemRecord(item)
  return {
    id: normalized.id,
    title: normalized.title,
    artist: normalized.artist,
    year: normalized.year,
    durationSeconds: normalized.durationSeconds,
    favorite: normalized.favorite
  }
}

export function musicYoutubeSearchUrl(item: Pick<MusicItemRecord, 'title' | 'artist'>): string {
  const normalized = normalizeMusicItemRecord({
    ...item,
    id: '',
    year: null,
    durationSeconds: null,
    favorite: false,
    createdAt: 0,
    updatedAt: 0
  })
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(
    `${normalized.title} ${normalized.artist}`
  )}`
}

export function musicFilterArtists(items: readonly MusicItemRecord[]): string[] {
  return Array.from(
    new Set(items.map((item) => normalizeMusicItemRecord(item).artist).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, 'ru'))
}

export function musicFilterYears(items: readonly MusicItemRecord[]): number[] {
  return Array.from(new Set(items.flatMap((item) => (item.year === null ? [] : [item.year])))).sort(
    (a, b) => b - a
  )
}
