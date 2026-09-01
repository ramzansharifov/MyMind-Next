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
  it('persists metadata, arrays and personal rating', () => {
    const item = createMusicItem({
      title: 'Blinding Lights',
      type: 'track',
      year: 2019,
      coverUrl: 'https://example.com/blinding-lights.jpg',
      artists: ['The Weeknd'],
      album: 'After Hours',
      durationSeconds: 200,
      trackCount: null,
      genres: ['Synth-pop', 'R&B'],
      description: 'Трек из альбома After Hours.',
      status: 'listened',
      favorite: true,
      rating: 9,
      comments: 'Добавить в дорожный плейлист.'
    })

    expect(getMusicItem({ id: item.id })).toEqual(item)
    expect(listMusicOverview().items).toEqual([item])
  })

  it('creates multiple music types in one transaction and rolls back on failure', () => {
    const base = {
      year: null,
      coverUrl: null,
      artists: [] as string[],
      album: '',
      durationSeconds: null,
      trackCount: null,
      genres: [] as string[],
      description: '',
      status: 'want_to_listen' as const,
      favorite: false,
      rating: null,
      comments: ''
    }

    const created = createMusicItems({
      items: [
        { ...base, title: 'Track A', type: 'track' },
        { ...base, title: 'Album B', type: 'album', trackCount: 12 }
      ]
    })

    expect(created.map((item) => [item.title, item.type])).toEqual([
      ['Track A', 'track'],
      ['Album B', 'album']
    ])
    expect(created[1]?.trackCount).toBe(12)
    expect(listMusicOverview().items).toHaveLength(2)

    getSqlite().exec('DELETE FROM music_items;')
    expect(() =>
      createMusicItems({
        items: [
          { ...base, title: 'Will roll back', type: 'track' },
          { ...base, title: null as unknown as string, type: 'single' }
        ]
      })
    ).toThrow()
    expect(listMusicOverview().items).toHaveLength(0)
  })

  it('clears rating when an item returns to want-to-listen', () => {
    const item = createMusicItem({
      title: 'Midnight City',
      type: 'track',
      year: 2011,
      coverUrl: null,
      artists: ['M83'],
      album: 'Hurry Up, We’re Dreaming',
      durationSeconds: 244,
      trackCount: null,
      genres: ['Synth-pop'],
      description: '',
      status: 'listened',
      favorite: false,
      rating: 8,
      comments: ''
    })

    const updated = updateMusicItem({ ...item, status: 'want_to_listen', rating: 8 })
    expect(updated.status).toBe('want_to_listen')
    expect(updated.rating).toBeNull()
  })

  it('stores zero, one or many playlists independently from tracks', () => {
    const trackA = createMusicItem({
      title: 'Track A',
      type: 'track',
      year: 2026,
      coverUrl: null,
      artists: ['Artist A'],
      album: '',
      durationSeconds: 180,
      trackCount: null,
      genres: [],
      description: '',
      status: 'listened',
      favorite: false,
      rating: null,
      comments: ''
    })
    const trackB = createMusicItem({
      title: 'Track B',
      type: 'track',
      year: null,
      coverUrl: null,
      artists: ['Artist B'],
      album: '',
      durationSeconds: null,
      trackCount: null,
      genres: [],
      description: '',
      status: 'listened',
      favorite: true,
      rating: null,
      comments: ''
    })

    const road = createMusicPlaylist({ name: 'Дорога' })
    const focus = createMusicPlaylist({ name: 'Фокус' })

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

    const renamed = updateMusicPlaylist({ id: road.id, name: 'В дорогу' })
    expect(renamed.name).toBe('В дорогу')

    expect(deleteMusicPlaylist({ id: focus.id })).toBe(true)
    overview = listMusicOverview()
    expect(overview.playlists.map((playlist) => playlist.name)).toEqual(['В дорогу'])
    expect(overview.items).toHaveLength(2)

    expect(deleteMusicItem({ id: trackA.id })).toBe(true)
    expect(listMusicOverview().playlists[0]?.trackIds).toEqual([])
  })

  it('deletes music permanently', () => {
    const item = createMusicItem({
      title: 'Discovery',
      type: 'album',
      year: 2001,
      coverUrl: null,
      artists: ['Daft Punk'],
      album: '',
      durationSeconds: null,
      trackCount: 14,
      genres: ['House'],
      description: '',
      status: 'want_to_listen',
      favorite: false,
      rating: null,
      comments: ''
    })

    expect(deleteMusicItem({ id: item.id })).toBe(true)
    expect(getMusicItem({ id: item.id })).toBeNull()
  })
})
