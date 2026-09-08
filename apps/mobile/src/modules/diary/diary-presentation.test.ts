import { describe, expect, it } from 'vitest'
import type { DiaryDaySummary, DiaryReportPoint } from '@mymind/contracts/diary'
import {
  buildDiaryCalendarMonth,
  diaryAppearancePalette,
  diaryMonthKey,
  diaryMonthLabel,
  diaryMoodMeta,
  diaryReportRange,
  expandDiaryReportTimeline,
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

function point(dayKey: string, entryCount: number): DiaryReportPoint {
  return {
    dayKey,
    mood: entryCount > 0 ? 'good' : null,
    moodScore: entryCount > 0 ? 4 : null,
    entryCount
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

  it('matches desktop diary report presets', () => {
    const today = '2026-09-08'
    expect(diaryReportRange('week', '', '', today)).toEqual({
      fromDay: '2026-09-02',
      toDay: today
    })
    expect(diaryReportRange('month', '', '', today)).toEqual({
      fromDay: '2026-08-10',
      toDay: today
    })
    expect(diaryReportRange('three-months', '', '', today)).toEqual({
      fromDay: '2026-06-08',
      toDay: today
    })
    expect(diaryReportRange('year', '', '', today)).toEqual({
      fromDay: '2025-09-08',
      toDay: today
    })
    expect(diaryReportRange('all', '', '', today)).toEqual({})
  })

  it('clamps month and year report presets at calendar boundaries', () => {
    expect(diaryReportRange('three-months', '', '', '2024-05-31')).toEqual({
      fromDay: '2024-02-29',
      toDay: '2024-05-31'
    })
    expect(diaryReportRange('year', '', '', '2024-02-29')).toEqual({
      fromDay: '2023-02-28',
      toDay: '2024-02-29'
    })
  })

  it('validates custom report ranges', () => {
    expect(diaryReportRange('custom', '2026-08-01', '2026-09-08', '2026-09-08')).toEqual({
      fromDay: '2026-08-01',
      toDay: '2026-09-08'
    })
    expect(() => diaryReportRange('custom', '2026-09-09', '2026-09-08', '2026-09-08')).toThrow(
      'Конечная дата'
    )
    expect(() => diaryReportRange('custom', '2026-02-31', '2026-09-08', '2026-09-08')).toThrow(
      'Некорректная календарная дата'
    )
  })

  it('expands sparse report points into a continuous activity timeline', () => {
    expect(
      expandDiaryReportTimeline(
        [point('2026-09-01', 2), point('2026-09-03', 1)],
        '2026-09-01',
        '2026-09-03'
      )
    ).toEqual([point('2026-09-01', 2), point('2026-09-02', 0), point('2026-09-03', 1)])
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
