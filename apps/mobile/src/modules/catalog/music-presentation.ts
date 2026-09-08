import type {
  CreateMusicItemInput,
  MusicItemRecord,
  UpdateMusicItemInput
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
  return {
    title: item?.title ?? '',
    artist: item?.artists[0] ?? '',
    year: item?.year?.toString() ?? '',
    duration: formatMusicDuration(item?.durationSeconds ?? null) ?? '',
    favorite: item?.favorite ?? false
  }
}

export function musicTrackInputFromDraft(
  draft: MobileMusicTrackDraft,
  previous?: MusicItemRecord
): CreateMusicItemInput {
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
    type: 'track',
    year,
    coverUrl: null,
    artists: [artist],
    album: '',
    durationSeconds,
    trackCount: null,
    genres: [],
    description: '',
    status: previous?.status ?? 'listened',
    favorite: draft.favorite,
    rating: null,
    comments: ''
  }
}

export function musicRecordToUpdateInput(item: MusicItemRecord): UpdateMusicItemInput {
  return {
    id: item.id,
    title: item.title,
    type: item.type,
    year: item.year,
    coverUrl: item.coverUrl,
    artists: item.artists,
    album: item.album,
    durationSeconds: item.durationSeconds,
    trackCount: item.trackCount,
    genres: item.genres,
    description: item.description,
    status: item.status,
    favorite: item.favorite,
    rating: item.rating,
    comments: item.comments
  }
}

export function musicFilterArtists(items: readonly MusicItemRecord[]): string[] {
  return Array.from(
    new Set(items.flatMap((item) => item.artists.map((artist) => artist.trim())).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, 'ru'))
}

export function musicFilterYears(items: readonly MusicItemRecord[]): number[] {
  return Array.from(new Set(items.flatMap((item) => (item.year === null ? [] : [item.year])))).sort(
    (a, b) => b - a
  )
}
