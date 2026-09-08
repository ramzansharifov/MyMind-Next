import type {
  WorkoutProgressEntryRecord,
  WorkoutProgressPhotoRecord,
  WorkoutProgressPhotoView
} from '@mymind/contracts/workouts'

export interface WorkoutWeightPoint {
  id: string
  date: string
  weightKg: number
  normalized: number
}

export interface DatedWorkoutPhoto {
  photo: WorkoutProgressPhotoRecord
  date: string
}

export interface WorkoutProgressSummary {
  entries: number
  photos: number
  latestWeightKg: number | null
  weightDeltaKg: number | null
  weightPoints: WorkoutWeightPoint[]
}

export function workoutProgressSummary(
  entries: WorkoutProgressEntryRecord[]
): WorkoutProgressSummary {
  const chronological = [...entries].sort((left, right) => left.date.localeCompare(right.date))
  const weighted = chronological.filter(
    (entry): entry is WorkoutProgressEntryRecord & { bodyWeightKg: number } =>
      Number.isFinite(entry.bodyWeightKg)
  )
  const values = weighted.map((entry) => entry.bodyWeightKg)
  const min = values.length ? Math.min(...values) : 0
  const max = values.length ? Math.max(...values) : 0
  const span = Math.max(max - min, 1)
  const weightPoints = weighted.map((entry) => ({
    id: entry.id,
    date: entry.date,
    weightKg: entry.bodyWeightKg,
    normalized: (entry.bodyWeightKg - min) / span
  }))
  const firstWeight = weighted[0]?.bodyWeightKg ?? null
  const latestWeightKg = weighted.at(-1)?.bodyWeightKg ?? null

  return {
    entries: entries.length,
    photos: entries.reduce((sum, entry) => sum + entry.photos.length, 0),
    latestWeightKg,
    weightDeltaKg:
      firstWeight === null || latestWeightKg === null ? null : latestWeightKg - firstWeight,
    weightPoints
  }
}

export function workoutPhotoComparison(
  entries: WorkoutProgressEntryRecord[],
  view: Exclude<WorkoutProgressPhotoView, 'custom'>
): { first: DatedWorkoutPhoto | null; last: DatedWorkoutPhoto | null; comparable: boolean } {
  const photos = [...entries]
    .sort((left, right) => left.date.localeCompare(right.date))
    .flatMap((entry) =>
      entry.photos.filter((photo) => photo.view === view).map((photo) => ({ photo, date: entry.date }))
    )
  const first = photos[0] ?? null
  const last = photos.at(-1) ?? null

  return {
    first,
    last,
    comparable: first !== null && last !== null && first.photo.id !== last.photo.id
  }
}
