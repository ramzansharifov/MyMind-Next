import { describe, expect, it } from 'vitest'
import { parseMoviesJson, parseMusicJson } from './catalog-json-import'

describe('catalog JSON import parsing', () => {
  it('accepts a fenced single movie and applies desktop-compatible defaults', () => {
    const result = parseMoviesJson('```json\n{"title":"Arrival"}\n```')
    expect(result.error).toBeNull()
    expect(result.items).toEqual([
      expect.objectContaining({
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

  it('preserves movie ids so exported JSON can update the same record', () => {
    const result = parseMoviesJson(
      JSON.stringify({
        id: 'movie-existing',
        title: 'Arrival',
        createdAt: 10,
        updatedAt: 20
      })
    )
    expect(result.error).toBeNull()
    expect(result.items[0]).toMatchObject({ id: 'movie-existing', title: 'Arrival' })
    expect(result.items[0]).not.toHaveProperty('createdAt')
    expect(result.items[0]).not.toHaveProperty('updatedAt')
  })

  it('keeps episodic movie metadata', () => {
    const result = parseMoviesJson(
      JSON.stringify({
        title: 'Arcane',
        type: 'animated_series',
        seasonCount: 2,
        episodesPerSeason: 9,
        episodeRuntimeMinutes: 42
      })
    )
    expect(result.error).toBeNull()
    expect(result.items[0]).toMatchObject({
      type: 'animated_series',
      seasonCount: 2,
      episodesPerSeason: 9,
      episodeRuntimeMinutes: 42
    })
  })

  it('accepts the simplified music JSON shape', () => {
    const result = parseMusicJson('{"title":"Blinding Lights","artist":"The Weeknd"}')
    expect(result.error).toBeNull()
    expect(result.items).toEqual([
      {
        title: 'Blinding Lights',
        artist: 'The Weeknd',
        year: null,
        durationSeconds: null,
        favorite: false
      }
    ])
  })

  it('accepts a full exported music overview and preserves ids and playlist links', () => {
    const result = parseMusicJson(
      JSON.stringify({
        items: [
          {
            id: 'track-existing',
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
            id: 'playlist-existing',
            name: 'Favorites',
            coverUrl: null,
            trackIds: ['track-existing'],
            createdAt: 3,
            updatedAt: 4
          }
        ]
      })
    )

    expect(result.error).toBeNull()
    expect(result.items).toEqual([
      {
        id: 'track-existing',
        title: 'Blinding Lights',
        artist: 'The Weeknd',
        year: 2019,
        durationSeconds: 200,
        favorite: true
      }
    ])
    expect(result.playlists).toEqual([
      {
        id: 'playlist-existing',
        name: 'Favorites',
        coverUrl: null,
        trackIds: ['track-existing']
      }
    ])
  })

  it('accepts legacy artists arrays but drops obsolete track metadata', () => {
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
    expect(invalid.error).toMatch(/^Трек 2/)
  })

  it('rejects empty arrays and imports larger than the desktop limit', () => {
    expect(parseMoviesJson('[]').error).toBe('Массив фильмов пуст')
    expect(
      parseMusicJson(
        JSON.stringify(Array.from({ length: 101 }, () => ({ title: 'x', artist: 'Artist' })))
      ).error
    ).toBe('За один раз можно обработать до 100 треков')
  })

  it('treats blank input as an idle editor rather than an error', () => {
    expect(parseMoviesJson('   ')).toEqual({ items: [], error: null })
    expect(parseMusicJson('')).toEqual({ items: [], playlists: [], error: null })
  })
})
