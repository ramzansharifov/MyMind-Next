import { describe, expect, it } from 'vitest'

import { createMusicItemInputSchema, updateMusicItemInputSchema } from './music'

const validItem = {
  title: 'Blinding Lights',
  artist: 'The Weeknd',
  year: 2019,
  durationSeconds: 200,
  favorite: true
}

describe('music validation', () => {
  it('accepts and trims the real track fields', () => {
    const parsed = createMusicItemInputSchema.parse({
      ...validItem,
      title: '  Blinding Lights  ',
      artist: '  The Weeknd  '
    })

    expect(parsed).toEqual(validItem)
  })

  it('requires an artist and rejects obsolete track metadata', () => {
    expect(() => createMusicItemInputSchema.parse({ ...validItem, artist: '' })).toThrow()
    expect(() =>
      createMusicItemInputSchema.parse({
        ...validItem,
        coverUrl: 'https://example.com/track.jpg'
      })
    ).toThrow()
  })

  it('validates optional year and duration ranges', () => {
    expect(() => createMusicItemInputSchema.parse({ ...validItem, year: 1700 })).toThrow()
    expect(() => createMusicItemInputSchema.parse({ ...validItem, durationSeconds: 0 })).toThrow()
    expect(
      createMusicItemInputSchema.parse({ ...validItem, year: null, durationSeconds: null })
    ).toMatchObject({ year: null, durationSeconds: null })
  })

  it('validates update identifiers together with the full payload', () => {
    const parsed = updateMusicItemInputSchema.parse({ id: 'music-1', ...validItem })
    expect(parsed.id).toBe('music-1')
  })
})
