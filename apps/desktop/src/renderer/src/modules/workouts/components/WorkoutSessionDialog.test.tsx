import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { WorkoutExerciseRecord, WorkoutSessionRecord } from '../../../../../shared/contracts/workouts'
import { WorkoutSessionDialog } from './WorkoutSessionDialog'

const pullUp: WorkoutExerciseRecord = {
  id: 'exercise-pull-up',
  title: 'Подтягивания',
  muscleGroup: 'lats',
  muscleGroups: ['lats', 'biceps'],
  usesExternalWeight: false,
  status: 'active',
  createdAt: 1,
  updatedAt: 1
}

const session: WorkoutSessionRecord = {
  id: 'session-bodyweight',
  programId: null,
  programName: null,
  date: '2026-08-25',
  durationMinutes: 45,
  comment: 'Собственный вес',
  exercises: [
    {
      id: 'session-exercise-pull-up',
      exerciseId: pullUp.id,
      exerciseTitle: pullUp.title,
      muscleGroup: pullUp.muscleGroup,
      muscleGroups: pullUp.muscleGroups,
      usesExternalWeight: false,
      position: 0,
      comment: '',
      sets: [{ id: 'set-1', position: 0, reps: 10, weightKg: 0 }]
    }
  ],
  totalSets: 1,
  totalReps: 10,
  totalVolumeKg: 0,
  createdAt: 1,
  updatedAt: 1
}

describe('WorkoutSessionDialog', () => {
  it('does not ask for a workout title or weight for a bodyweight exercise', async () => {
    render(
      <WorkoutSessionDialog
        open
        session={session}
        exercises={[pullUp]}
        programs={[]}
        busy={false}
        onOpenChange={vi.fn()}
        onSave={vi.fn().mockResolvedValue(undefined)}
      />
    )

    expect(screen.queryByText('Название записи')).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /Название записи/i })).not.toBeInTheDocument()
    expect(
      await screen.findByRole('spinbutton', { name: 'Повторения, подход 1' })
    ).toBeInTheDocument()
    expect(screen.queryByRole('spinbutton', { name: 'Вес, подход 1' })).not.toBeInTheDocument()
  })
})
