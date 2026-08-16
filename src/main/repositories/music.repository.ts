import { randomUUID } from 'node:crypto'

import type {
  CreateMusicItemInput,
  CreateMusicItemsInput,
  DeleteMusicItemInput,
  GetMusicItemInput,
  MusicItemRecord,
  MusicOverview,
  MusicStatus,
  MusicType,
  UpdateMusicItemInput
} from '../../shared/contracts/music'
import { getSqlite } from '../database/client'

interface MusicItemRow {
  id: string
  title: string
  type: MusicType
  year: number | null
  cover_url: string | null
  artists_json: string
  album: string
  duration_seconds: number | null
  track_count: number | null
  genres_json: string
  description: string
  status: MusicStatus
  favorite: number
  rating: number | null
  comments: string
  created_at: number
  updated_at: number
}

const MUSIC_SELECT = `SELECT
  id,
  title,
  type,
  year,
  cover_url,
  artists_json,
  album,
  duration_seconds,
  track_count,
  genres_json,
  description,
  status,
  favorite,
  rating,
  comments,
  created_at,
  updated_at
FROM music_items`

function parseStringList(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : []
  } catch {
    return []
  }
}

function mapItem(row: MusicItemRow): MusicItemRecord {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    year: row.year,
    coverUrl: row.cover_url,
    artists: parseStringList(row.artists_json),
    album: row.album,
    durationSeconds: row.duration_seconds,
    trackCount: row.track_count,
    genres: parseStringList(row.genres_json),
    description: row.description,
    status: row.status,
    favorite: Boolean(row.favorite),
    rating: row.status === 'listened' ? row.rating : null,
    comments: row.comments,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function findItem(id: string): MusicItemRecord | null {
  const row = getSqlite().prepare(`${MUSIC_SELECT} WHERE id = ?`).get(id) as
    | MusicItemRow
    | undefined
  return row ? mapItem(row) : null
}

function requireItem(id: string): MusicItemRecord {
  const item = findItem(id)
  if (!item) throw new Error('Музыкальная запись не найдена')
  return item
}

function payload(input: CreateMusicItemInput | UpdateMusicItemInput): readonly unknown[] {
  return [
    input.title,
    input.type,
    input.year,
    input.coverUrl,
    JSON.stringify(input.artists),
    input.album,
    input.durationSeconds,
    input.trackCount,
    JSON.stringify(input.genres),
    input.description,
    input.status,
    input.favorite ? 1 : 0,
    input.status === 'listened' ? input.rating : null,
    input.comments
  ]
}

export function listMusicOverview(): MusicOverview {
  const rows = getSqlite()
    .prepare(`${MUSIC_SELECT} ORDER BY updated_at DESC, created_at DESC`)
    .all() as MusicItemRow[]
  return { items: rows.map(mapItem) }
}

export function getMusicItem(input: GetMusicItemInput): MusicItemRecord | null {
  return findItem(input.id)
}

function insertItem(input: CreateMusicItemInput): MusicItemRecord {
  const id = randomUUID()
  const now = Date.now()
  getSqlite()
    .prepare(
      `INSERT INTO music_items (
        id,
        title,
        type,
        year,
        cover_url,
        artists_json,
        album,
        duration_seconds,
        track_count,
        genres_json,
        description,
        status,
        favorite,
        rating,
        comments,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(id, ...payload(input), now, now)
  return requireItem(id)
}

export function createMusicItem(input: CreateMusicItemInput): MusicItemRecord {
  return insertItem(input)
}

export function createMusicItems(input: CreateMusicItemsInput): MusicItemRecord[] {
  const transaction = getSqlite().transaction((items: CreateMusicItemInput[]) =>
    items.map((item) => insertItem(item))
  )
  return transaction(input.items)
}

export function updateMusicItem(input: UpdateMusicItemInput): MusicItemRecord {
  requireItem(input.id)
  const now = Date.now()
  getSqlite()
    .prepare(
      `UPDATE music_items SET
        title = ?,
        type = ?,
        year = ?,
        cover_url = ?,
        artists_json = ?,
        album = ?,
        duration_seconds = ?,
        track_count = ?,
        genres_json = ?,
        description = ?,
        status = ?,
        favorite = ?,
        rating = ?,
        comments = ?,
        updated_at = ?
       WHERE id = ?`
    )
    .run(...payload(input), now, input.id)
  return requireItem(input.id)
}

export function deleteMusicItem(input: DeleteMusicItemInput): boolean {
  requireItem(input.id)
  const result = getSqlite().prepare('DELETE FROM music_items WHERE id = ?').run(input.id)
  return result.changes > 0
}
