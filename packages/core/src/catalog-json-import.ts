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
const MAX_IMPORT_PLAYLISTS = 100

function stripCodeFence(value: string): string {
  const trimmed = value.trim()
  if (!trimmed.startsWith('```')) return trimmed
  return trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
}

function parseCandidates(value: string): { candidates: unknown[]; error: string | null } {
  const source = stripCodeFence(value)
  if (!source) return { candidates: [], error: null }

  let parsed: unknown
  try {
    parsed = JSON.parse(source) as unknown
  } catch {
    return { candidates: [], error: 'JSON содержит синтаксическую ошибку' }
  }

  return { candidates: Array.isArray(parsed) ? parsed : [parsed], error: null }
}

function movieCandidate(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value
  const source = value as Record<string, unknown>
  return {
    id: typeof source.id === 'string' ? source.id : undefined,
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
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value
  const source = value as Record<string, unknown>
  const legacyArtists = Array.isArray(source.artists)
    ? source.artists.filter((artist): artist is string => typeof artist === 'string')
    : []
  return {
    id: typeof source.id === 'string' ? source.id : undefined,
    title: source.title,
    artist: source.artist ?? legacyArtists[0] ?? '',
    year: source.year ?? null,
    durationSeconds: source.durationSeconds ?? null,
    favorite: source.favorite ?? false
  }
}

function musicPlaylistCandidate(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value
  const source = value as Record<string, unknown>
  return {
    id: typeof source.id === 'string' ? source.id : undefined,
    name: source.name,
    coverUrl: source.coverUrl ?? null,
    trackIds: source.trackIds ?? []
  }
}

function issuePath(path: PropertyKey[]): string {
  return path.length ? ` · ${path.map(String).join('.')}` : ''
}

export function parseMoviesJson(value: string): CatalogJsonImportResult<UpsertMovieInput> {
  const parsed = parseCandidates(value)
  if (parsed.error) return { items: [], error: parsed.error }
  if (parsed.candidates.length === 0) {
    return value.trim() ? { items: [], error: 'Массив фильмов пуст' } : { items: [], error: null }
  }
  if (parsed.candidates.length > MAX_IMPORT_ITEMS) {
    return { items: [], error: 'За один раз можно обработать до 100 фильмов' }
  }

  const items: UpsertMovieInput[] = []
  for (const [index, candidate] of parsed.candidates.entries()) {
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
  const source = stripCodeFence(value)
  if (!source) return { items: [], playlists: [], error: null }

  let root: unknown
  try {
    root = JSON.parse(source) as unknown
  } catch {
    return { items: [], playlists: [], error: 'JSON содержит синтаксическую ошибку' }
  }

  let itemCandidates: unknown[] = []
  let playlistCandidates: unknown[] = []

  if (Array.isArray(root)) {
    itemCandidates = root
  } else if (typeof root === 'object' && root !== null) {
    const object = root as Record<string, unknown>
    if (Array.isArray(object.items) || Array.isArray(object.playlists)) {
      itemCandidates = Array.isArray(object.items) ? object.items : []
      playlistCandidates = Array.isArray(object.playlists) ? object.playlists : []
    } else if ('name' in object && 'trackIds' in object && !('title' in object)) {
      playlistCandidates = [object]
    } else {
      itemCandidates = [object]
    }
  } else {
    itemCandidates = [root]
  }

  if (itemCandidates.length === 0 && playlistCandidates.length === 0) {
    return { items: [], playlists: [], error: 'JSON не содержит треков или плейлистов' }
  }
  if (itemCandidates.length > MAX_IMPORT_ITEMS) {
    return { items: [], playlists: [], error: 'За один раз можно обработать до 100 треков' }
  }
  if (playlistCandidates.length > MAX_IMPORT_PLAYLISTS) {
    return { items: [], playlists: [], error: 'За один раз можно обработать до 100 плейлистов' }
  }

  const items: UpsertMusicItemInput[] = []
  for (const [index, candidate] of itemCandidates.entries()) {
    const result = upsertMusicItemInputSchema.safeParse(musicCandidate(candidate))
    if (!result.success) {
      const issue = result.error.issues[0]
      return {
        items: [],
        playlists: [],
        error:
          'Трек ' +
          (index + 1) +
          issuePath(issue?.path ?? []) +
          ': ' +
          (issue?.message ?? 'Некорректные данные')
      }
    }
    items.push(result.data)
  }

  const playlists: UpsertMusicPlaylistInput[] = []
  for (const [index, candidate] of playlistCandidates.entries()) {
    const result = upsertMusicPlaylistInputSchema.safeParse(musicPlaylistCandidate(candidate))
    if (!result.success) {
      const issue = result.error.issues[0]
      return {
        items: [],
        playlists: [],
        error:
          'Плейлист ' +
          (index + 1) +
          issuePath(issue?.path ?? []) +
          ': ' +
          (issue?.message ?? 'Некорректные данные')
      }
    }
    playlists.push(result.data)
  }

  return { items, playlists, error: null }
}
