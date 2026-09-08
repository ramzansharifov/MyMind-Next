import type { RepositoryRuntime } from '@mymind/contracts/storage'
import type {
  CreateMusicItemInput,
  CreateMusicItemsInput,
  CreateMusicPlaylistInput,
  DeleteMusicItemInput,
  DeleteMusicPlaylistInput,
  GetMusicItemInput,
  MusicItemRecord,
  MusicOverview,
  MusicPlaylistRecord,
  MusicStatus,
  MusicType,
  SetMusicItemPlaylistsInput,
  UpdateMusicItemInput,
  UpdateMusicPlaylistInput
} from '@mymind/contracts/music'

export function createMusicRepository(runtime: RepositoryRuntime): MusicRepository {
  const getSqlite = runtime.database
  const randomUUID = runtime.createId
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

  interface MusicPlaylistRow {
    id: string
    name: string
    cover_url: string | null
    created_at: number
    updated_at: number
  }

  interface MusicPlaylistItemRow {
    playlist_id: string
    music_item_id: string
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

  function listPlaylists(): MusicPlaylistRecord[] {
    const db = getSqlite()
    const rows = db
      .prepare(
        `SELECT id, name, cover_url, created_at, updated_at
       FROM music_playlists
       ORDER BY updated_at DESC, created_at DESC`
      )
      .all() as MusicPlaylistRow[]
    const membershipRows = db
      .prepare(
        `SELECT playlist_id, music_item_id
       FROM music_playlist_items
       ORDER BY created_at ASC`
      )
      .all() as MusicPlaylistItemRow[]
    const tracksByPlaylist = new Map<string, string[]>()

    membershipRows.forEach((membership) => {
      const trackIds = tracksByPlaylist.get(membership.playlist_id) ?? []
      trackIds.push(membership.music_item_id)
      tracksByPlaylist.set(membership.playlist_id, trackIds)
    })

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      coverUrl: row.cover_url,
      trackIds: tracksByPlaylist.get(row.id) ?? [],
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  }

  function findPlaylist(id: string): MusicPlaylistRecord | null {
    return listPlaylists().find((playlist) => playlist.id === id) ?? null
  }

  function requirePlaylist(id: string): MusicPlaylistRecord {
    const playlist = findPlaylist(id)
    if (!playlist) throw new Error('Плейлист не найден')
    return playlist
  }

  function findItem(id: string): MusicItemRecord | null {
    const row = getSqlite().prepare(`${MUSIC_SELECT} WHERE id = ?`).get(id) as
      MusicItemRow | undefined
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

  function listMusicOverview(): MusicOverview {
    const rows = getSqlite()
      .prepare(`${MUSIC_SELECT} ORDER BY updated_at DESC, created_at DESC`)
      .all() as MusicItemRow[]
    return { items: rows.map(mapItem), playlists: listPlaylists() }
  }

  function getMusicItem(input: GetMusicItemInput): MusicItemRecord | null {
    return findItem(input.id)
  }

  function insertItem(input: CreateMusicItemInput): MusicItemRecord {
    const id = randomUUID()
    const now = runtime.now()
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

  function createMusicItem(input: CreateMusicItemInput): MusicItemRecord {
    return insertItem(input)
  }

  function createMusicItems(input: CreateMusicItemsInput): MusicItemRecord[] {
    const transaction = getSqlite().transaction((items: CreateMusicItemInput[]) =>
      items.map((item) => insertItem(item))
    )
    return transaction(input.items)
  }

  function updateMusicItem(input: UpdateMusicItemInput): MusicItemRecord {
    requireItem(input.id)
    const now = runtime.now()
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

  function deleteMusicItem(input: DeleteMusicItemInput): boolean {
    requireItem(input.id)
    const result = getSqlite().prepare('DELETE FROM music_items WHERE id = ?').run(input.id)
    return result.changes > 0
  }

  function createMusicPlaylist(input: CreateMusicPlaylistInput): MusicPlaylistRecord {
    const id = randomUUID()
    const now = runtime.now()
    getSqlite()
      .prepare(
        `INSERT INTO music_playlists (id, name, cover_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`
      )
      .run(id, input.name, input.coverUrl ?? null, now, now)
    return requirePlaylist(id)
  }

  function updateMusicPlaylist(input: UpdateMusicPlaylistInput): MusicPlaylistRecord {
    requirePlaylist(input.id)
    getSqlite()
      .prepare('UPDATE music_playlists SET name = ?, cover_url = ?, updated_at = ? WHERE id = ?')
      .run(input.name, input.coverUrl ?? null, runtime.now(), input.id)
    return requirePlaylist(input.id)
  }

  function deleteMusicPlaylist(input: DeleteMusicPlaylistInput): boolean {
    requirePlaylist(input.id)
    const result = getSqlite().prepare('DELETE FROM music_playlists WHERE id = ?').run(input.id)
    return result.changes > 0
  }

  function setMusicItemPlaylists(input: SetMusicItemPlaylistsInput): MusicPlaylistRecord[] {
    requireItem(input.itemId)
    const db = getSqlite()
    const uniquePlaylistIds = Array.from(new Set(input.playlistIds))
    uniquePlaylistIds.forEach((playlistId) => requirePlaylist(playlistId))

    const transaction = db.transaction(() => {
      db.prepare('DELETE FROM music_playlist_items WHERE music_item_id = ?').run(input.itemId)
      const insert = db.prepare(
        `INSERT INTO music_playlist_items (playlist_id, music_item_id, created_at)
       VALUES (?, ?, ?)`
      )
      const now = runtime.now()
      uniquePlaylistIds.forEach((playlistId) => insert.run(playlistId, input.itemId, now))
    })
    transaction()

    return listPlaylists()
  }
  return {
    listMusicOverview,
    getMusicItem,
    createMusicItem,
    createMusicItems,
    updateMusicItem,
    deleteMusicItem,
    createMusicPlaylist,
    updateMusicPlaylist,
    deleteMusicPlaylist,
    setMusicItemPlaylists
  }
}

export interface MusicRepository {
  listMusicOverview(): MusicOverview
  getMusicItem(input: GetMusicItemInput): MusicItemRecord | null
  createMusicItem(input: CreateMusicItemInput): MusicItemRecord
  createMusicItems(input: CreateMusicItemsInput): MusicItemRecord[]
  updateMusicItem(input: UpdateMusicItemInput): MusicItemRecord
  deleteMusicItem(input: DeleteMusicItemInput): boolean
  createMusicPlaylist(input: CreateMusicPlaylistInput): MusicPlaylistRecord
  updateMusicPlaylist(input: UpdateMusicPlaylistInput): MusicPlaylistRecord
  deleteMusicPlaylist(input: DeleteMusicPlaylistInput): boolean
  setMusicItemPlaylists(input: SetMusicItemPlaylistsInput): MusicPlaylistRecord[]
}
