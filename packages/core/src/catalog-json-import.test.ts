import { describe, expect, it } from 'vitest'
import { parseMoviesJson, parseMusicJson } from './catalog-json-import'

describe('catalog JSON import parsing', () => {
  it('preserves movie ids while applying defaults', () => {
    const result = parseMoviesJson('```json\n{"id":"movie-1","title":"Arrival"}\n```')
    expect(result.error).toBeNull()
    expect(result.items).toEqual([
      expect.objectContaining({
        id: 'movie-1',
        title: 'Arrival',
        type: 'movie',
        originalTitle: null,
        status: 'watchlist',
        genres: [],
        actors: [],
        favorite: false,
        rating: null
      })
    ])
  })

  it('keeps episodic metadata and ignores timestamps', () => {
    const result = parseMoviesJson(
      JSON.stringify({
        id: 'arcane-1',
        title: 'Arcane',
        type: 'animated_series',
        seasonCount: 2,
        episodesPerSeason: 9,
        episodeRuntimeMinutes: 42,
        createdAt: 1,
        updatedAt: 2
      })
    )
    expect(result.error).toBeNull()
    expect(result.items[0]).toMatchObject({
      id: 'arcane-1',
      type: 'animated_series',
      seasonCount: 2,
      episodesPerSeason: 9,
      episodeRuntimeMinutes: 42
    })
    expect(result.items[0]).not.toHaveProperty('createdAt')
    expect(result.items[0]).not.toHaveProperty('updatedAt')
  })

  it('accepts one simplified music track and preserves its id', () => {
    const result = parseMusicJson(
      '{"id":"track-1","title":"Blinding Lights","artist":"The Weeknd"}'
    )
    expect(result.error).toBeNull()
    expect(result.items).toEqual([
      {
        id: 'track-1',
        title: 'Blinding Lights',
        artist: 'The Weeknd',
        year: null,
        durationSeconds: null,
        favorite: false
      }
    ])
    expect(result.playlists).toEqual([])
  })

  it('accepts a complete MusicOverview with playlists and trackIds', () => {
    const result = parseMusicJson(
      JSON.stringify({
        items: [
          {
            id: 'track-1',
            title: 'Blinding Lights',
            artist: 'The Weeknd',
            year: 2019,
            durationSeconds: 200,
            favorite: true,
            createdAt: 1,
            updatedAt: 2
          }
        ],
        playlists: [
          {
            id: 'playlist-1',
            name: 'Избранное',
            coverUrl: null,
            trackIds: ['track-1'],
            createdAt: 3,
            updatedAt: 4
          }
        ]
      })
    )
    expect(result.error).toBeNull()
    expect(result.items).toEqual([
      {
        id: 'track-1',
        title: 'Blinding Lights',
        artist: 'The Weeknd',
        year: 2019,
        durationSeconds: 200,
        favorite: true
      }
    ])
    expect(result.playlists).toEqual([
      { id: 'playlist-1', name: 'Избранное', coverUrl: null, trackIds: ['track-1'] }
    ])
  })

  it('accepts an individual playlist JSON', () => {
    const result = parseMusicJson(
      '{"id":"playlist-1","name":"Дорога","coverUrl":null,"trackIds":["track-1"]}'
    )
    expect(result.error).toBeNull()
    expect(result.items).toEqual([])
    expect(result.playlists).toEqual([
      { id: 'playlist-1', name: 'Дорога', coverUrl: null, trackIds: ['track-1'] }
    ])
  })

  it('accepts legacy artists arrays but drops obsolete metadata', () => {
    const result = parseMusicJson(
      JSON.stringify({
        title: 'Blinding Lights',
        artists: ['The Weeknd'],
        coverUrl: 'https://example.com/old.jpg',
        album: 'After Hours',
        genres: ['Synth-pop'],
        status: 'listened',
        rating: 9
      })
    )
    expect(result.error).toBeNull()
    expect(result.items).toEqual([
      {
        id: null,
        title: 'Blinding Lights',
        artist: 'The Weeknd',
        year: null,
        durationSeconds: null,
        favorite: false
      }
    ])
  })

  it('reports syntax and indexed validation errors without partial output', () => {
    expect(parseMoviesJson('{').error).toBe('JSON содержит синтаксическую ошибку')
    const invalid = parseMusicJson(
      JSON.stringify([
        { title: 'Valid', artist: 'Artist' },
        { title: '', artist: 'Artist' }
      ])
    )
    expect(invalid.items).toEqual([])
    expect(invalid.playlists).toEqual([])
    expect(invalid.error).toMatch(/^Трек 2/)
  })

  it('rejects empty arrays and imports larger than the limit', () => {
    expect(parseMoviesJson('[]').error).toBe('Массив фильмов пуст')
    expect(
      parseMusicJson(
        JSON.stringify(Array.from({ length: 101 }, () => ({ title: 'x', artist: 'Artist' })))
      ).error
    ).toBe('За один раз можно применить до 100 треков и до 100 плейлистов')
  })

  it('treats blank input as an idle editor rather than an error', () => {
    expect(parseMoviesJson('   ')).toEqual({ items: [], error: null })
    expect(parseMusicJson('')).toEqual({ items: [], playlists: [], error: null })
  })
})
