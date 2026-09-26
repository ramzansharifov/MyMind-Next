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
  SetMusicItemPlaylistsInput,
  UpdateMusicItemInput,
  UpdateMusicPlaylistInput,
  UpsertMusicItemInput,
  UpsertMusicLibraryInput,
  UpsertMusicLibraryResult,
  UpsertMusicPlaylistInput
} from '@mymind/contracts/music'

export function createMusicRepository(runtime: RepositoryRuntime): MusicRepository {
  const getSqlite = runtime.database
  const randomUUID = runtime.createId

  interface MusicItemRow {
    id: string
    title: string
    year: number | null
    artists_json: string
    duration_seconds: number | null
    favorite: number
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
  year,
  artists_json,
  duration_seconds,
  favorite,
  created_at,
  updated_at
FROM music_items`

  function legacyArtist(value: string): string {
    try {
      const parsed = JSON.parse(value) as unknown
      if (!Array.isArray(parsed)) return ''
      const artist = parsed.find(
        (item): item is string => typeof item === 'string' && item.trim() !== ''
      )
      return artist?.trim() ?? ''
    } catch {
      return ''
    }
  }

  function mapItem(row: MusicItemRow): MusicItemRecord {
    return {
      id: row.id,
      title: row.title,
      artist: legacyArtist(row.artists_json),
      year: row.year,
      durationSeconds: row.duration_seconds,
      favorite: Boolean(row.favorite),
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

  function legacyPayload(input: CreateMusicItemInput | UpdateMusicItemInput): readonly unknown[] {
    return [
      input.title,
      'track',
      input.year,
      null,
      JSON.stringify([input.artist]),
      '',
      input.durationSeconds,
      null,
      '[]',
      '',
      'listened',
      input.favorite ? 1 : 0,
      null,
      ''
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

  function insertItem(input: CreateMusicItemInput, preferredId?: string): MusicItemRecord {
    const id = preferredId ?? randomUUID()
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
      .run(id, ...legacyPayload(input), now, now)
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
      .run(...legacyPayload(input), now, input.id)
    return requireItem(input.id)
  }

  function deleteMusicItem(input: DeleteMusicItemInput): boolean {
    requireItem(input.id)
    const result = getSqlite().prepare('DELETE FROM music_items WHERE id = ?').run(input.id)
    return result.changes > 0
  }

  function identityText(value: string): string {
    return value.trim().toLocaleLowerCase('ru-RU')
  }

  function insertPlaylist(
    input: CreateMusicPlaylistInput,
    preferredId?: string
  ): MusicPlaylistRecord {
    const id = preferredId ?? randomUUID()
    const now = runtime.now()
    getSqlite()
      .prepare(
        `INSERT INTO music_playlists (id, name, cover_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`
      )
      .run(id, input.name, input.coverUrl ?? null, now, now)
    return requirePlaylist(id)
  }

  function upsertMusicLibrary(input: UpsertMusicLibraryInput): UpsertMusicLibraryResult {
    const db = getSqlite()
    const transaction = db.transaction(
      (payload: UpsertMusicLibraryInput): UpsertMusicLibraryResult => {
        const currentItems = new Map(listMusicOverview().items.map((item) => [item.id, item]))
        const currentPlaylists = new Map(listPlaylists().map((playlist) => [playlist.id, playlist]))
        const seenItemIds = new Set<string>()
        const seenPlaylistIds = new Set<string>()
        const savedItems: MusicItemRecord[] = []
        const savedPlaylists: MusicPlaylistRecord[] = []
        let createdItems = 0
        let updatedItems = 0
        let createdPlaylists = 0
        let updatedPlaylists = 0

        for (const item of payload.items) {
          const explicitId = item.id ?? null
          if (explicitId) {
            if (seenItemIds.has(explicitId)) {
              throw new Error(`JSON содержит повторяющийся id трека: ${explicitId}`)
            }
            seenItemIds.add(explicitId)
          }

          let existing = explicitId ? currentItems.get(explicitId) ?? null : null
          if (!existing && !explicitId) {
            const matches = [...currentItems.values()].filter(
              (candidate) =>
                identityText(candidate.title) === identityText(item.title) &&
                identityText(candidate.artist) === identityText(item.artist) &&
                candidate.year === item.year
            )
            if (matches.length === 1) existing = matches[0]!
            if (matches.length > 1) {
              throw new Error(
                `Найдено несколько треков «${item.title}» того же исполнителя и года. Используйте JSON с id.`
              )
            }
          }

          const itemPayload: CreateMusicItemInput = {
            title: item.title,
            artist: item.artist,
            year: item.year,
            durationSeconds: item.durationSeconds,
            favorite: item.favorite
          }
          const saved = existing
            ? updateMusicItem({ id: existing.id, ...itemPayload })
            : insertItem(itemPayload, explicitId ?? undefined)
          currentItems.set(saved.id, saved)
          savedItems.push(saved)
          if (existing) updatedItems += 1
          else createdItems += 1
        }

        for (const playlist of payload.playlists) {
          const explicitId = playlist.id ?? null
          if (explicitId) {
            if (seenPlaylistIds.has(explicitId)) {
              throw new Error(`JSON содержит повторяющийся id плейлиста: ${explicitId}`)
            }
            seenPlaylistIds.add(explicitId)
          }

          let existing = explicitId ? currentPlaylists.get(explicitId) ?? null : null
          if (!existing && !explicitId) {
            const matches = [...currentPlaylists.values()].filter(
              (candidate) => identityText(candidate.name) === identityText(playlist.name)
            )
            if (matches.length === 1) existing = matches[0]!
            if (matches.length > 1) {
              throw new Error(
                `Найдено несколько плейлистов «${playlist.name}». Используйте JSON с id.`
              )
            }
          }

          const playlistPayload: CreateMusicPlaylistInput = {
            name: playlist.name,
            coverUrl: playlist.coverUrl ?? null
          }
          const saved = existing
            ? updateMusicPlaylist({ id: existing.id, ...playlistPayload })
            : insertPlaylist(playlistPayload, explicitId ?? undefined)
          currentPlaylists.set(saved.id, saved)

          const missingTrackId = playlist.trackIds.find((trackId) => !findItem(trackId))
          if (missingTrackId) {
            throw new Error(
              `Плейлист «${playlist.name}» ссылается на неизвестный trackId: ${missingTrackId}`
            )
          }

          db.prepare('DELETE FROM music_playlist_items WHERE playlist_id = ?').run(saved.id)
          const insertMembership = db.prepare(
            `INSERT INTO music_playlist_items (playlist_id, music_item_id, created_at)
             VALUES (?, ?, ?)`
          )
          const now = runtime.now()
          for (const trackId of playlist.trackIds) {
            insertMembership.run(saved.id, trackId, now)
          }

          savedPlaylists.push(requirePlaylist(saved.id))
          if (existing) updatedPlaylists += 1
          else createdPlaylists += 1
        }

        return {
          items: savedItems,
          playlists: savedPlaylists,
          createdItems,
          updatedItems,
          createdPlaylists,
          updatedPlaylists
        }
      }
    )

    return transaction(input)
  }

  function createMusicPlaylist(input: CreateMusicPlaylistInput): MusicPlaylistRecord {
    return insertPlaylist(input)
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
    upsertMusicLibrary,
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
  upsertMusicLibrary(input: UpsertMusicLibraryInput): UpsertMusicLibraryResult
  updateMusicItem(input: UpdateMusicItemInput): MusicItemRecord
  deleteMusicItem(input: DeleteMusicItemInput): boolean
  createMusicPlaylist(input: CreateMusicPlaylistInput): MusicPlaylistRecord
  updateMusicPlaylist(input: UpdateMusicPlaylistInput): MusicPlaylistRecord
  deleteMusicPlaylist(input: DeleteMusicPlaylistInput): boolean
  setMusicItemPlaylists(input: SetMusicItemPlaylistsInput): MusicPlaylistRecord[]
}
