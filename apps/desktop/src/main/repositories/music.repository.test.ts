import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { closeDatabase, getSqlite, initializeDatabaseForTesting } from '../database/client'
import { runDatabaseMigrationsFrom } from '../database/migrate'
import {
  createMusicItem,
  createMusicItems,
  createMusicPlaylist,
  deleteMusicItem,
  deleteMusicPlaylist,
  getMusicItem,
  listMusicOverview,
  setMusicItemPlaylists,
  upsertMusicLibrary,
  updateMusicItem,
  updateMusicPlaylist
} from './music.repository'

let root = ''

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'mymind-music-'))
  initializeDatabaseForTesting(join(root, 'music.sqlite'))
  runDatabaseMigrationsFrom(resolve(process.cwd(), 'drizzle'))
})

beforeEach(() => {
  getSqlite().exec(`
    DELETE FROM music_playlist_items;
    DELETE FROM music_playlists;
    DELETE FROM music_items;
  `)
})

afterAll(async () => {
  closeDatabase()
  await rm(root, { recursive: true, force: true })
})

describe('music repository', () => {
  it('exposes only real track fields while keeping legacy columns internal', () => {
    const item = createMusicItem({
      title: 'Blinding Lights',
      artist: 'The Weeknd',
      year: 2019,
      durationSeconds: 200,
      favorite: true
    })

    expect(getMusicItem({ id: item.id })).toEqual(item)
    expect(item).toMatchObject({
      title: 'Blinding Lights',
      artist: 'The Weeknd',
      year: 2019,
      durationSeconds: 200,
      favorite: true
    })
    expect(item).not.toHaveProperty('coverUrl')
    expect(item).not.toHaveProperty('album')
    expect(item).not.toHaveProperty('status')
    expect(item).not.toHaveProperty('rating')

    const row = getSqlite()
      .prepare(
        `SELECT type, cover_url, artists_json, album, track_count, genres_json,
                description, status, rating, comments
         FROM music_items
         WHERE id = ?`
      )
      .get(item.id) as Record<string, unknown>

    expect(row).toEqual({
      type: 'track',
      cover_url: null,
      artists_json: '["The Weeknd"]',
      album: '',
      track_count: null,
      genres_json: '[]',
      description: '',
      status: 'listened',
      rating: null,
      comments: ''
    })
  })

  it('creates multiple tracks in one transaction and rolls back on failure', () => {
    const created = createMusicItems({
      items: [
        {
          title: 'Track A',
          artist: 'Artist A',
          year: null,
          durationSeconds: null,
          favorite: false
        },
        {
          title: 'Track B',
          artist: 'Artist B',
          year: 2020,
          durationSeconds: 180,
          favorite: true
        }
      ]
    })

    expect(created.map((item) => [item.title, item.artist])).toEqual([
      ['Track A', 'Artist A'],
      ['Track B', 'Artist B']
    ])
    expect(listMusicOverview().items).toHaveLength(2)

    getSqlite().exec('DELETE FROM music_items;')
    expect(() =>
      createMusicItems({
        items: [
          {
            title: 'Will roll back',
            artist: 'Artist',
            year: null,
            durationSeconds: null,
            favorite: false
          },
          {
            title: null as unknown as string,
            artist: 'Artist',
            year: null,
            durationSeconds: null,
            favorite: false
          }
        ]
      })
    ).toThrow()
    expect(listMusicOverview().items).toHaveLength(0)
  })

  it('updates only the real track fields', () => {
    const item = createMusicItem({
      title: 'Midnight City',
      artist: 'M83',
      year: 2011,
      durationSeconds: 244,
      favorite: false
    })

    const updated = updateMusicItem({
      id: item.id,
      title: 'Midnight City (Edit)',
      artist: 'M83',
      year: 2011,
      durationSeconds: 245,
      favorite: true
    })

    expect(updated).toMatchObject({
      id: item.id,
      title: 'Midnight City (Edit)',
      artist: 'M83',
      durationSeconds: 245,
      favorite: true
    })
    expect(updated).not.toHaveProperty('coverUrl')
  })

  it('stores playlist covers and track membership independently from tracks', () => {
    const trackA = createMusicItem({
      title: 'Track A',
      artist: 'Artist A',
      year: 2026,
      durationSeconds: 180,
      favorite: false
    })
    const trackB = createMusicItem({
      title: 'Track B',
      artist: 'Artist B',
      year: null,
      durationSeconds: null,
      favorite: true
    })

    const road = createMusicPlaylist({
      name: 'Дорога',
      coverUrl: 'https://example.com/road.jpg'
    })
    const focus = createMusicPlaylist({ name: 'Фокус', coverUrl: null })

    expect(road.coverUrl).toBe('https://example.com/road.jpg')

    setMusicItemPlaylists({ itemId: trackA.id, playlistIds: [road.id, focus.id] })
    setMusicItemPlaylists({ itemId: trackB.id, playlistIds: [focus.id] })

    let overview = listMusicOverview()
    expect(overview.playlists).toHaveLength(2)
    expect(overview.playlists.find((playlist) => playlist.id === road.id)?.trackIds).toEqual([
      trackA.id
    ])
    expect(
      overview.playlists.find((playlist) => playlist.id === focus.id)?.trackIds.sort()
    ).toEqual([trackA.id, trackB.id].sort())

    const renamed = updateMusicPlaylist({
      id: road.id,
      name: 'В дорогу',
      coverUrl: 'https://example.com/road-updated.jpg'
    })
    expect(renamed.name).toBe('В дорогу')
    expect(renamed.coverUrl).toBe('https://example.com/road-updated.jpg')

    expect(deleteMusicPlaylist({ id: focus.id })).toBe(true)
    overview = listMusicOverview()
    expect(overview.playlists.map((playlist) => playlist.name)).toEqual(['В дорогу'])
    expect(overview.items).toHaveLength(2)

    expect(deleteMusicItem({ id: trackA.id })).toBe(true)
    expect(listMusicOverview().playlists[0]?.trackIds).toEqual([])
  })

  it('upserts a full exported library and restores playlist membership', () => {
    const existingTrack = createMusicItem({
      title: 'Old title',
      artist: 'Artist',
      year: 2020,
      durationSeconds: 180,
      favorite: false
    })
    const existingPlaylist = createMusicPlaylist({ name: 'Old playlist', coverUrl: null })
    setMusicItemPlaylists({ itemId: existingTrack.id, playlistIds: [existingPlaylist.id] })

    const result = upsertMusicLibrary({
      items: [
        {
          id: existingTrack.id,
          title: 'Updated title',
          artist: 'Artist',
          year: 2021,
          durationSeconds: 181,
          favorite: true
        },
        {
          id: 'track-json-new',
          title: 'New track',
          artist: 'New Artist',
          year: null,
          durationSeconds: null,
          favorite: false
        }
      ],
      playlists: [
        {
          id: existingPlaylist.id,
          name: 'Updated playlist',
          coverUrl: 'https://example.com/cover.jpg',
          trackIds: [existingTrack.id, 'track-json-new']
        }
      ]
    })

    expect(result.itemsCreated).toBe(1)
    expect(result.itemsUpdated).toBe(1)
    expect(result.playlistsCreated).toBe(0)
    expect(result.playlistsUpdated).toBe(1)
    expect(result.overview.items).toHaveLength(2)
    expect(getMusicItem({ id: existingTrack.id })).toMatchObject({
      title: 'Updated title',
      year: 2021,
      favorite: true
    })
    expect(result.overview.playlists).toEqual([
      expect.objectContaining({
        id: existingPlaylist.id,
        name: 'Updated playlist',
        coverUrl: 'https://example.com/cover.jpg',
        trackIds: [existingTrack.id, 'track-json-new']
      })
    ])
  })

  it('deletes tracks permanently', () => {
    const item = createMusicItem({
      title: 'Discovery',
      artist: 'Daft Punk',
      year: 2001,
      durationSeconds: null,
      favorite: false
    })

    expect(deleteMusicItem({ id: item.id })).toBe(true)
    expect(getMusicItem({ id: item.id })).toBeNull()
  })
})
