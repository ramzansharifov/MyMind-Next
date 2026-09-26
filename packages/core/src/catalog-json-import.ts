import type { UpsertMovieInput } from '@mymind/contracts/movies'
import type { UpsertMusicItemInput, UpsertMusicPlaylistInput } from '@mymind/contracts/music'
import { upsertMovieInputSchema } from './validation/movies'
import { upsertMusicItemInputSchema, upsertMusicPlaylistInputSchema } from './validation/music'

export interface CatalogJsonImportResult<T> {
  items: T[]
  error: string | null
}

export interface MusicJsonImportResult {
  items: UpsertMusicItemInput[]
  playlists: UpsertMusicPlaylistInput[]
  error: string | null
}

const MAX_IMPORT_ITEMS = 100

function stripCodeFence(value: string): string {
  const trimmed = value.trim()
  if (!trimmed.startsWith('```')) return trimmed
  return trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
}

function parseJson(value: string): { value: unknown; error: string | null } {
  const source = stripCodeFence(value)
  if (!source) return { value: null, error: null }

  try {
    return { value: JSON.parse(source) as unknown, error: null }
  } catch {
    return { value: null, error: 'JSON содержит синтаксическую ошибку' }
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function movieCandidate(value: unknown): unknown {
  const source = asRecord(value)
  if (!source) return value
  return {
    id: source.id ?? null,
    title: source.title,
    originalTitle: source.originalTitle ?? null,
    type: source.type ?? 'movie',
    year: source.year ?? null,
    posterUrl: source.posterUrl ?? null,
    director: source.director ?? '',
    runtimeMinutes: source.runtimeMinutes ?? null,
    seasonCount: source.seasonCount ?? null,
    episodesPerSeason: source.episodesPerSeason ?? null,
    episodeRuntimeMinutes: source.episodeRuntimeMinutes ?? null,
    genres: source.genres ?? [],
    actors: source.actors ?? [],
    description: source.description ?? '',
    status: source.status ?? 'watchlist',
    favorite: source.favorite ?? false,
    rating: source.rating ?? null,
    comments: source.comments ?? ''
  }
}

function musicCandidate(value: unknown): unknown {
  const source = asRecord(value)
  if (!source) return value
  const legacyArtists = Array.isArray(source.artists)
    ? source.artists.filter((artist): artist is string => typeof artist === 'string')
    : []
  return {
    id: source.id ?? null,
    title: source.title,
    artist: source.artist ?? legacyArtists[0] ?? '',
    year: source.year ?? null,
    durationSeconds: source.durationSeconds ?? null,
    favorite: source.favorite ?? false
  }
}

function playlistCandidate(value: unknown): unknown {
  const source = asRecord(value)
  if (!source) return value
  return {
    id: source.id ?? null,
    name: source.name,
    coverUrl: source.coverUrl ?? null,
    trackIds: source.trackIds ?? []
  }
}

function issuePath(path: PropertyKey[]): string {
  return path.length ? ` · ${path.map(String).join('.')}` : ''
}

export function parseMoviesJson(value: string): CatalogJsonImportResult<UpsertMovieInput> {
  const parsed = parseJson(value)
  if (parsed.error) return { items: [], error: parsed.error }
  if (parsed.value === null) return { items: [], error: null }

  const candidates = Array.isArray(parsed.value) ? parsed.value : [parsed.value]
  if (candidates.length === 0) return { items: [], error: 'Массив фильмов пуст' }
  if (candidates.length > MAX_IMPORT_ITEMS) {
    return { items: [], error: 'За один раз можно применить до 100 фильмов' }
  }

  const items: UpsertMovieInput[] = []
  for (const [index, candidate] of candidates.entries()) {
    const result = upsertMovieInputSchema.safeParse(movieCandidate(candidate))
    if (!result.success) {
      const issue = result.error.issues[0]
      return {
        items: [],
        error: `Фильм ${index + 1}${issuePath(issue?.path ?? [])}: ${issue?.message ?? 'Некорректные данные'}`
      }
    }
    items.push(result.data)
  }
  return { items, error: null }
}

export function parseMusicJson(value: string): MusicJsonImportResult {
  const parsed = parseJson(value)
  if (parsed.error) return { items: [], playlists: [], error: parsed.error }
  if (parsed.value === null) return { items: [], playlists: [], error: null }

  let itemCandidates: unknown[] = []
  let playlistCandidates: unknown[] = []

  if (Array.isArray(parsed.value)) {
    itemCandidates = parsed.value
  } else {
    const root = asRecord(parsed.value)
    if (!root) {
      return { items: [], playlists: [], error: 'JSON музыки должен содержать объект или массив' }
    }

    if (Array.isArray(root.items) || Array.isArray(root.playlists)) {
      itemCandidates = Array.isArray(root.items) ? root.items : []
      playlistCandidates = Array.isArray(root.playlists) ? root.playlists : []
    } else if ('name' in root && 'trackIds' in root && !('title' in root)) {
      playlistCandidates = [root]
    } else {
      itemCandidates = [root]
    }
  }

  if (itemCandidates.length === 0 && playlistCandidates.length === 0) {
    return { items: [], playlists: [], error: 'JSON музыкальной библиотеки пуст' }
  }
  if (itemCandidates.length > MAX_IMPORT_ITEMS || playlistCandidates.length > MAX_IMPORT_ITEMS) {
    return {
      items: [],
      playlists: [],
      error: 'За один раз можно применить до 100 треков и до 100 плейлистов'
    }
  }

  const items: UpsertMusicItemInput[] = []
  for (const [index, candidate] of itemCandidates.entries()) {
    const result = upsertMusicItemInputSchema.safeParse(musicCandidate(candidate))
    if (!result.success) {
      const issue = result.error.issues[0]
      return {
        items: [],
        playlists: [],
        error: `Трек ${index + 1}${issuePath(issue?.path ?? [])}: ${issue?.message ?? 'Некорректные данные'}`
      }
    }
    items.push(result.data)
  }

  const playlists: UpsertMusicPlaylistInput[] = []
  for (const [index, candidate] of playlistCandidates.entries()) {
    const result = upsertMusicPlaylistInputSchema.safeParse(playlistCandidate(candidate))
    if (!result.success) {
      const issue = result.error.issues[0]
      return {
        items: [],
        playlists: [],
        error: `Плейлист ${index + 1}${issuePath(issue?.path ?? [])}: ${issue?.message ?? 'Некорректные данные'}`
      }
    }
    playlists.push(result.data)
  }

  return { items, playlists, error: null }
}
