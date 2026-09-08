import { describe, expect, it } from 'vitest'
import type { DiaryDaySummary } from '@mymind/contracts/diary'
import {
  buildDiaryCalendarMonth,
  diaryAppearancePalette,
  diaryMonthKey,
  diaryMonthLabel,
  diaryMoodMeta,
  shiftDiaryMonth
} from './diary-presentation'

function day(dayKey: string): DiaryDaySummary {
  return {
    id: `day-${dayKey}`,
    diaryId: 'diary-1',
    dayKey,
    mood: 'good',
    entryCount: 2,
    createdAt: 1,
    updatedAt: 1
  }
}

describe('mobile diary presentation', () => {
  it('builds a Monday-first six-week month grid and keeps summaries attached', () => {
    const cells = buildDiaryCalendarMonth('2026-09', [day('2026-09-08')], '2026-09-08')

    expect(cells).toHaveLength(42)
    expect(cells[0]?.dayKey).toBe('2026-08-31')
    expect(cells[7]?.dayKey).toBe('2026-09-07')
    expect(cells[8]).toMatchObject({
      dayKey: '2026-09-08',
      inMonth: true,
      isToday: true,
      summary: expect.objectContaining({ entryCount: 2, mood: 'good' })
    })
  })

  it('shifts months across year boundaries and derives month keys', () => {
    expect(diaryMonthKey('2026-09-08')).toBe('2026-09')
    expect(shiftDiaryMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftDiaryMonth('2026-12', 1)).toBe('2027-01')
    expect(diaryMonthLabel('2026-09').toLocaleLowerCase('ru-RU')).toContain('сентябрь')
  })

  it('maps moods and persisted appearance choices to native presentation values', () => {
    expect(diaryMoodMeta('excellent')).toEqual({ label: 'Отлично', emoji: '😄' })
    expect(diaryMoodMeta(null)).toBeNull()

    const palette = diaryAppearancePalette('cream', 'burgundy')
    expect(palette.paperBackground).toBeTruthy()
    expect(palette.coverBackground).toBeTruthy()
    expect(palette.paperText).not.toBe(palette.coverText)
  })
})
