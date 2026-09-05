import { describe, expect, it } from 'vitest'

import { expandDiaryTimeline, localDayKey, reportRange } from './diary-ui'

describe('diary UI date helpers', () => {
  it('uses local calendar components instead of UTC conversion', () => {
    expect(localDayKey(new Date(2026, 7, 8, 0, 15))).toBe('2026-08-08')
  })

  it('clamps three-month and yearly report boundaries to valid local dates', () => {
    expect(reportRange('three-months', new Date(2026, 4, 31))).toEqual({
      fromDay: '2026-02-28',
      toDay: '2026-05-31'
    })
    expect(reportRange('year', new Date(2028, 1, 29))).toEqual({
      fromDay: '2027-02-28',
      toDay: '2028-02-29'
    })
  })

  it('fills inactive calendar days so report gaps stay visible', () => {
    expect(
      expandDiaryTimeline(
        [
          {
            dayKey: '2026-08-01',
            mood: 'good',
            moodScore: 4,
            entryCount: 2
          },
          {
            dayKey: '2026-08-03',
            mood: null,
            moodScore: null,
            entryCount: 1
          }
        ],
        '2026-08-01',
        '2026-08-03'
      )
    ).toEqual([
      {
        dayKey: '2026-08-01',
        mood: 'good',
        moodScore: 4,
        entryCount: 2
      },
      {
        dayKey: '2026-08-02',
        mood: null,
        moodScore: null,
        entryCount: 0
      },
      {
        dayKey: '2026-08-03',
        mood: null,
        moodScore: null,
        entryCount: 1
      }
    ])
  })
})
