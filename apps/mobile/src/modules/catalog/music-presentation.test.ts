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
  musicYoutubeSearchUrl,
  parseMusicDuration
} from './music-presentation'

function track(overrides: Partial<MusicItemRecord> = {}): MusicItemRecord {
  return {
    id: 'track-1',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    year: 2020,
    durationSeconds: 200,
    favorite: false,
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

  it('builds exactly the simplified track payload used by the editor', () => {
    const input = musicTrackInputFromDraft({
      title: '  Blinding Lights  ',
      artist: ' The Weeknd ',
      year: '2020',
      duration: '3:20',
      favorite: true
    })

    expect(input).toEqual({
      title: 'Blinding Lights',
      artist: 'The Weeknd',
      year: 2020,
      durationSeconds: 200,
      favorite: true
    })
    expect(input).not.toHaveProperty('coverUrl')
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
    const record = track({ favorite: true })
    const input = musicRecordToUpdateInput(record)

    expect(input).not.toHaveProperty('createdAt')
    expect(input).not.toHaveProperty('updatedAt')
    expect(updateMusicItemInputSchema.parse(input)).toEqual(input)
  })

  it('builds the same YouTube search URL as desktop track playback', () => {
    expect(musicYoutubeSearchUrl(track())).toBe(
      'https://www.youtube.com/results?search_query=Blinding%20Lights%20The%20Weeknd'
    )
    expect(musicYoutubeSearchUrl(track({ title: 'Молитва', artist: 'БИ-2' }))).toBe(
      'https://www.youtube.com/results?search_query=%D0%9C%D0%BE%D0%BB%D0%B8%D1%82%D0%B2%D0%B0%20%D0%91%D0%98-2'
    )
  })

  it('supports old runtime records that still contain artists arrays', () => {
    const legacy = {
      ...track(),
      artist: undefined,
      artists: ['The Weeknd']
    } as unknown as MusicItemRecord

    expect(musicTrackDraftFromItem(legacy).artist).toBe('The Weeknd')
    expect(musicFilterArtists([legacy])).toEqual(['The Weeknd'])
    expect(musicRecordToUpdateInput(legacy).artist).toBe('The Weeknd')
    expect(musicYoutubeSearchUrl(legacy)).toContain('The%20Weeknd')
  })

  it('derives stable artist and year filter choices from existing records', () => {
    const items = [
      track({ id: '1', artist: 'Zed', year: 2024 }),
      track({ id: '2', artist: 'Alpha', year: 2020 }),
      track({ id: '3', artist: 'Beta', year: 2024 }),
      track({ id: '4', artist: 'Alpha', year: null })
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
