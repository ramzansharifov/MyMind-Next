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

  it('accepts music objects and applies desktop-compatible defaults', () => {
    const result = parseMusicJson('{"title":"Blinding Lights","artists":["The Weeknd"]}')
    expect(result.error).toBeNull()
    expect(result.items).toEqual([
      expect.objectContaining({
        title: 'Blinding Lights',
        type: 'track',
        artists: ['The Weeknd'],
        album: '',
        status: 'want_to_listen',
        favorite: false,
        rating: null
      })
    ])
  })

  it('reports syntax and indexed validation errors without partial output', () => {
    expect(parseMoviesJson('{').error).toBe('JSON содержит синтаксическую ошибку')
    const invalid = parseMusicJson(JSON.stringify([{ title: 'Valid' }, { title: '' }]))
    expect(invalid.items).toEqual([])
    expect(invalid.error).toMatch(/^Запись 2/)
  })

  it('rejects empty arrays and imports larger than the desktop limit', () => {
    expect(parseMoviesJson('[]').error).toBe('Массив фильмов пуст')
    expect(
      parseMusicJson(JSON.stringify(Array.from({ length: 101 }, () => ({ title: 'x' })))).error
    ).toBe('За один раз можно добавить до 100 записей')
  })

  it('treats blank input as an idle editor rather than an error', () => {
    expect(parseMoviesJson('   ')).toEqual({ items: [], error: null })
    expect(parseMusicJson('')).toEqual({ items: [], error: null })
  })
})
