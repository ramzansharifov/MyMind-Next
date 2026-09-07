import type { CreateMovieInput } from '@mymind/contracts/movies'
import type { CreateMusicItemInput } from '@mymind/contracts/music'
import { createMovieInputSchema } from './validation/movies'
import { createMusicItemInputSchema } from './validation/music'

export interface CatalogJsonImportResult<T> {
  items: T[]
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
  return {
    title: source.title,
    type: source.type ?? 'track',
    year: source.year ?? null,
    coverUrl: source.coverUrl ?? null,
    artists: source.artists ?? [],
    album: source.album ?? '',
    durationSeconds: source.durationSeconds ?? null,
    trackCount: source.trackCount ?? null,
    genres: source.genres ?? [],
    description: source.description ?? '',
    status: source.status ?? 'want_to_listen',
    favorite: source.favorite ?? false,
    rating: source.rating ?? null,
    comments: source.comments ?? ''
  }
}

function issuePath(path: PropertyKey[]): string {
  return path.length ? ` · ${path.map(String).join('.')}` : ''
}

export function parseMoviesJson(value: string): CatalogJsonImportResult<CreateMovieInput> {
  const parsed = parseCandidates(value)
  if (parsed.error) return { items: [], error: parsed.error }
  if (parsed.candidates.length === 0) {
    return value.trim()
      ? { items: [], error: 'Массив фильмов пуст' }
      : { items: [], error: null }
  }
  if (parsed.candidates.length > MAX_IMPORT_ITEMS) {
    return { items: [], error: 'За один раз можно добавить до 100 фильмов' }
  }

  const items: CreateMovieInput[] = []
  for (const [index, candidate] of parsed.candidates.entries()) {
    const result = createMovieInputSchema.safeParse(movieCandidate(candidate))
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

export function parseMusicJson(value: string): CatalogJsonImportResult<CreateMusicItemInput> {
  const parsed = parseCandidates(value)
  if (parsed.error) return { items: [], error: parsed.error }
  if (parsed.candidates.length === 0) {
    return value.trim()
      ? { items: [], error: 'Массив музыкальных записей пуст' }
      : { items: [], error: null }
  }
  if (parsed.candidates.length > MAX_IMPORT_ITEMS) {
    return { items: [], error: 'За один раз можно добавить до 100 записей' }
  }

  const items: CreateMusicItemInput[] = []
  for (const [index, candidate] of parsed.candidates.entries()) {
    const result = createMusicItemInputSchema.safeParse(musicCandidate(candidate))
    if (!result.success) {
      const issue = result.error.issues[0]
      return {
        items: [],
        error: `Запись ${index + 1}${issuePath(issue?.path ?? [])}: ${issue?.message ?? 'Некорректные данные'}`
      }
    }
    items.push(result.data)
  }
  return { items, error: null }
}
