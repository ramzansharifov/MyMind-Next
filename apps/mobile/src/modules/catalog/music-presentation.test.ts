import { describe, expect, it } from 'vitest'
import type { MusicItemRecord } from '@mymind/contracts/music'
import { updateMusicItemInputSchema } from '@mymind/core/validation/music'
import {
  formatMusicDuration,
  musicFilterArtists,
  musicFilterYears,
  musicRecordToUpdateInput,
  musicTrackDraftFromItem,
  musicTrackInputFromDraft,
  parseMusicDuration
} from './music-presentation'

function track(overrides: Partial<MusicItemRecord> = {}): MusicItemRecord {
  return {
    id: 'track-1',
    title: 'Blinding Lights',
    type: 'track',
    year: 2020,
    coverUrl: null,
    artists: ['The Weeknd'],
    album: '',
    durationSeconds: 200,
    trackCount: null,
    genres: [],
    description: '',
    status: 'listened',
    favorite: false,
    rating: null,
    comments: '',
    createdAt: 1,
    updatedAt: 2,
    ...overrides
  }
}

describe('mobile music presentation helpers', () => {
  it('formats and parses track durations without losing seconds', () => {
    expect(formatMusicDuration(null)).toBeNull()
    expect(formatMusicDuration(200)).toBe('3:20')
    expect(formatMusicDuration(3800)).toBe('1:03:20')
    expect(parseMusicDuration('3:20')).toBe(200)
    expect(parseMusicDuration('1:03:20')).toBe(3800)
    expect(parseMusicDuration('200')).toBe(200)
    expect(Number.isNaN(parseMusicDuration('3:99'))).toBe(true)
  })

  it('builds the same simplified track payload as the current desktop dialog', () => {
    const input = musicTrackInputFromDraft(
      {
        title: '  Blinding Lights  ',
        artist: ' The Weeknd ',
        year: '2020',
        duration: '3:20',
        favorite: true
      },
      track({ status: 'want_to_listen', rating: 8, coverUrl: 'https://example.com/old.jpg' })
    )

    expect(input).toEqual({
      title: 'Blinding Lights',
      type: 'track',
      year: 2020,
      coverUrl: null,
      artists: ['The Weeknd'],
      album: '',
      durationSeconds: 200,
      trackCount: null,
      genres: [],
      description: '',
      status: 'want_to_listen',
      favorite: true,
      rating: null,
      comments: ''
    })
  })

  it('requires both title and artist for the simplified track editor', () => {
    expect(() =>
      musicTrackInputFromDraft({
        title: '',
        artist: 'Artist',
        year: '',
        duration: '',
        favorite: false
      })
    ).toThrow('Введите название трека')
    expect(() =>
      musicTrackInputFromDraft({
        title: 'Track',
        artist: '',
        year: '',
        duration: '',
        favorite: false
      })
    ).toThrow('Введите исполнителя')
  })

  it('maps records into strict update payloads without persistence timestamps', () => {
    const record = track({ favorite: true, rating: 9 })
    const input = musicRecordToUpdateInput(record)

    expect(input).not.toHaveProperty('createdAt')
    expect(input).not.toHaveProperty('updatedAt')
    expect(updateMusicItemInputSchema.parse(input)).toEqual(input)
  })

  it('derives stable artist and year filter choices from existing records', () => {
    const items = [
      track({ id: '1', artists: ['Zed', 'Alpha'], year: 2024 }),
      track({ id: '2', artists: ['Alpha'], year: 2020 }),
      track({ id: '3', artists: ['Beta'], year: 2024 })
    ]

    expect(musicFilterArtists(items)).toEqual(['Alpha', 'Beta', 'Zed'])
    expect(musicFilterYears(items)).toEqual([2024, 2020])
    expect(musicTrackDraftFromItem(items[0])).toEqual({
      title: 'Blinding Lights',
      artist: 'Zed',
      year: '2024',
      duration: '3:20',
      favorite: false
    })
  })
})
