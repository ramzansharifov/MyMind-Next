import { describe, expect, it } from 'vitest'

import { createMusicItemInputSchema, updateMusicItemInputSchema } from './music'

const validItem = {
  title: 'Blinding Lights',
  type: 'track' as const,
  year: 2019,
  coverUrl: 'https://example.com/cover.jpg',
  artists: ['The Weeknd'],
  album: 'After Hours',
  durationSeconds: 200,
  trackCount: null,
  genres: ['Synth-pop'],
  description: '',
  status: 'listened' as const,
  favorite: true,
  rating: 9,
  comments: ''
}

describe('music validation', () => {
  it('accepts supported types and normalizes duplicate lists', () => {
    const parsed = createMusicItemInputSchema.parse({
      ...validItem,
      type: 'album',
      artists: ['The Weeknd', 'The Weeknd'],
      genres: ['R&B', 'R&B']
    })

    expect(parsed.type).toBe('album')
    expect(parsed.artists).toEqual(['The Weeknd'])
    expect(parsed.genres).toEqual(['R&B'])
  })

  it('rejects unsupported music types', () => {
    expect(() =>
      createMusicItemInputSchema.parse({ ...validItem, type: 'podcast' })
    ).toThrow()
  })

  it('does not allow a rating before listening', () => {
    const parsed = createMusicItemInputSchema.safeParse({
      ...validItem,
      status: 'want_to_listen',
      rating: 9
    })

    expect(parsed.success).toBe(false)
  })

  it('validates update identifiers together with the full payload', () => {
    const parsed = updateMusicItemInputSchema.parse({ id: 'music-1', ...validItem })
    expect(parsed.id).toBe('music-1')
  })
})
