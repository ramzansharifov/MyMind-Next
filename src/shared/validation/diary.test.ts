import { describe, expect, it } from 'vitest'

import {
  createDiaryEntryInputSchema,
  createDiaryInputSchema,
  diaryDayKeySchema,
  listDiaryDaysInputSchema,
  setDiaryMoodInputSchema
} from './diary'

describe('diary validation', () => {
  it('accepts valid diary metadata and rejects unsupported fields', () => {
    expect(createDiaryInputSchema.parse({ title: 'Личный дневник', icon: 'book-heart' })).toEqual({
      title: 'Личный дневник',
      icon: 'book-heart'
    })
    expect(() =>
      createDiaryInputSchema.parse({ title: 'Личный дневник', icon: 'book-heart', color: '#ffffff' })
    ).toThrow()
  })

  it('validates real local calendar dates', () => {
    expect(diaryDayKeySchema.parse('2026-08-08')).toBe('2026-08-08')
    expect(() => diaryDayKeySchema.parse('2026-02-31')).toThrow()
    expect(() => diaryDayKeySchema.parse('08.08.2026')).toThrow()
  })

  it('rejects reversed day ranges', () => {
    expect(() =>
      listDiaryDaysInputSchema.parse({
        diaryId: 'diary-default',
        fromDay: '2026-08-10',
        toDay: '2026-08-01'
      })
    ).toThrow()
  })

  it('allows clearing mood and requires non-empty entry text', () => {
    expect(
      setDiaryMoodInputSchema.parse({ diaryId: 'diary-default', dayKey: '2026-08-08', mood: null })
    ).toMatchObject({ mood: null })
    expect(() =>
      createDiaryEntryInputSchema.parse({
        diaryId: 'diary-default',
        dayKey: '2026-08-08',
        text: '   '
      })
    ).toThrow()
  })
})
