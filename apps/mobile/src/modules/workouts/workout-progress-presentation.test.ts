import { describe, expect, it } from 'vitest'
import type { WorkoutProgressEntryRecord } from '@mymind/contracts/workouts'
import { workoutPhotoComparison, workoutProgressSummary } from './workout-progress-presentation'

function entry(
  id: string,
  date: string,
  bodyWeightKg: number | null,
  photos: WorkoutProgressEntryRecord['photos'] = []
): WorkoutProgressEntryRecord {
  return {
    id,
    date,
    bodyWeightKg,
    wellbeing: '',
    notes: '',
    metrics: [],
    photos,
    createdAt: 1,
    updatedAt: 1
  }
}

function photo(
  id: string,
  entryId: string,
  view: 'front' | 'back'
): WorkoutProgressEntryRecord['photos'][number] {
  return {
    id,
    entryId,
    assetId: `asset-${id}`,
    fileName: `${id}.jpg`,
    mimeType: 'image/jpeg',
    size: 100,
    url: `file:///${id}.jpg`,
    view,
    createdAt: 1
  }
}

describe('workout progress presentation', () => {
  it('calculates weight summary chronologically rather than by input order', () => {
    const summary = workoutProgressSummary([
      entry('late', '2026-03-20', 78),
      entry('early', '2026-03-01', 80),
      entry('middle', '2026-03-10', 79)
    ])

    expect(summary.latestWeightKg).toBe(78)
    expect(summary.weightDeltaKg).toBe(-2)
    expect(summary.weightPoints.map((point) => point.date)).toEqual([
      '2026-03-01',
      '2026-03-10',
      '2026-03-20'
    ])
    expect(summary.weightPoints.map((point) => point.normalized)).toEqual([1, 0.5, 0])
  })

  it('keeps missing weights out of the chart and counts all entries/photos', () => {
    const summary = workoutProgressSummary([
      entry('a', '2026-03-01', null, [photo('front-a', 'a', 'front')]),
      entry('b', '2026-03-02', 70, [photo('back-b', 'b', 'back')])
    ])

    expect(summary.entries).toBe(2)
    expect(summary.photos).toBe(2)
    expect(summary.latestWeightKg).toBe(70)
    expect(summary.weightDeltaKg).toBe(0)
    expect(summary.weightPoints).toHaveLength(1)
  })

  it('compares the earliest and latest photo of the same fixed view', () => {
    const comparison = workoutPhotoComparison(
      [
        entry('late', '2026-03-20', null, [photo('front-late', 'late', 'front')]),
        entry('early', '2026-03-01', null, [photo('front-early', 'early', 'front')]),
        entry('middle', '2026-03-10', null, [photo('back-middle', 'middle', 'back')])
      ],
      'front'
    )

    expect(comparison.first?.photo.id).toBe('front-early')
    expect(comparison.last?.photo.id).toBe('front-late')
    expect(comparison.comparable).toBe(true)
  })

  it('does not claim comparison when there is only one photo for the view', () => {
    const comparison = workoutPhotoComparison(
      [entry('only', '2026-03-01', null, [photo('front-only', 'only', 'front')])],
      'front'
    )

    expect(comparison.first?.photo.id).toBe('front-only')
    expect(comparison.last?.photo.id).toBe('front-only')
    expect(comparison.comparable).toBe(false)
  })
})
