import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { WorkoutExerciseRecord, WorkoutProgramRecord } from '../../../../shared/contracts/workouts'

const mocks = vi.hoisted(() => ({
  listOverview: vi.fn(),
  createExercise: vi.fn(),
  updateExercise: vi.fn(),
  deleteExercise: vi.fn(),
  createProgram: vi.fn(),
  updateProgram: vi.fn(),
  deleteProgram: vi.fn(),
  createSession: vi.fn(),
  updateSession: vi.fn(),
  deleteSession: vi.fn(),
  getSession: vi.fn(),
  createProgressEntry: vi.fn(),
  updateProgressEntry: vi.fn(),
  deleteProgressEntry: vi.fn(),
  importProgressPhoto: vi.fn(),
  deleteProgressPhoto: vi.fn(),
  getReport: vi.fn()
}))

vi.mock('./api/workouts-client', () => ({ workoutsClient: mocks }))

import { WorkoutsPage } from './WorkoutsPage'

const curl: WorkoutExerciseRecord = {
  id: 'exercise-curl',
  title: 'Сгибания на бицепс с гантелями',
  muscleGroup: 'arms',
  description: 'Без раскачивания.',
  status: 'active',
  createdAt: 1,
  updatedAt: 1
}

const program: WorkoutProgramRecord = {
  id: 'program-pull',
  name: 'Pull',
  description: 'Спина и руки',
  status: 'active',
  exercises: [
    {
      id: 'program-exercise-curl',
      exerciseId: curl.id,
      position: 0,
      plannedSets: 3,
      targetReps: 10,
      notes: ''
    }
  ],
  createdAt: 2,
  updatedAt: 2
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.listOverview.mockResolvedValue({
    exercises: [curl],
    programs: [program],
    sessions: [
      {
        id: 'session-1',
        programId: program.id,
        programName: program.name,
        title: '',
        date: '2026-08-17',
        durationMinutes: 60,
        comment: '',
        exercises: [
          {
            id: 'session-exercise-1',
            exerciseId: curl.id,
            exerciseTitle: curl.title,
            muscleGroup: curl.muscleGroup,
            position: 0,
            comment: '',
            sets: [
              { id: 'set-1', position: 0, reps: 12, weightKg: 14 },
              { id: 'set-2', position: 1, reps: 10, weightKg: 16 }
            ]
          }
        ],
        totalSets: 2,
        totalReps: 22,
        totalVolumeKg: 328,
        createdAt: 3,
        updatedAt: 3
      }
    ],
    progressEntries: []
  })
  mocks.getReport.mockResolvedValue({
    dateFrom: '2026-07-19',
    dateTo: '2026-08-17',
    summary: {
      sessions: 1,
      activeDays: 1,
      exercises: 1,
      sets: 2,
      reps: 22,
      volumeKg: 328,
      durationMinutes: 60,
      averageDurationMinutes: 60,
      averageSetsPerSession: 2,
      averageRepsPerSession: 22,
      averageVolumeKgPerSession: 328,
      averageWeightKg: 15,
      maxWeightKg: 16
    },
    muscleGroups: [
      { muscleGroup: 'arms', exercises: 1, sets: 2, reps: 22, volumeKg: 328, loadPercent: 100 },
      { muscleGroup: 'back', exercises: 0, sets: 0, reps: 0, volumeKg: 0, loadPercent: 0 },
      { muscleGroup: 'chest', exercises: 0, sets: 0, reps: 0, volumeKg: 0, loadPercent: 0 },
      { muscleGroup: 'abs', exercises: 0, sets: 0, reps: 0, volumeKg: 0, loadPercent: 0 },
      { muscleGroup: 'legs', exercises: 0, sets: 0, reps: 0, volumeKg: 0, loadPercent: 0 },
      { muscleGroup: 'shoulders', exercises: 0, sets: 0, reps: 0, volumeKg: 0, loadPercent: 0 }
    ],
    exercises: [
      {
        exerciseId: curl.id,
        title: curl.title,
        muscleGroup: 'arms',
        sessions: 1,
        sets: 2,
        reps: 22,
        volumeKg: 328,
        averageWeightKg: 15,
        maxWeightKg: 16,
        estimatedOneRepMax: 21.33,
        firstBestWeightKg: 16,
        lastBestWeightKg: 16,
        weightChangeKg: 0
      }
    ],
    programs: [
      {
        programId: program.id,
        name: program.name,
        sessions: 1,
        sets: 2,
        reps: 22,
        volumeKg: 328,
        durationMinutes: 60
      }
    ],
    timeline: [
      { date: '2026-08-17', sessions: 1, sets: 2, reps: 22, volumeKg: 328, durationMinutes: 60 }
    ],
    personalRecords: [
      {
        exerciseId: curl.id,
        title: curl.title,
        muscleGroup: 'arms',
        date: '2026-08-17',
        weightKg: 16,
        reps: 10,
        estimatedOneRepMax: 21.33
      }
    ]
  })
})

describe('WorkoutsPage', () => {
  it('shows the workout journal with program and set totals', async () => {
    render(<WorkoutsPage />)

    expect(await screen.findByRole('heading', { name: 'Тренировки' })).toBeInTheDocument()
    expect(screen.getByText('Pull')).toBeInTheDocument()
    expect(screen.getByText(/2 подх/)).toBeInTheDocument()
    expect(screen.getByText(/22 повт/)).toBeInTheDocument()
  })

  it('shows the fixed muscle tag in the exercise library', async () => {
    const user = userEvent.setup()
    render(<WorkoutsPage />)

    await user.click(await screen.findByRole('button', { name: /Упражнения/ }))

    expect(screen.getByText('Сгибания на бицепс с гантелями')).toBeInTheDocument()
    expect(screen.getByText('Руки')).toBeInTheDocument()
  })

  it('opens extensive reports with muscle distribution and exercise analytics', async () => {
    const user = userEvent.setup()
    render(<WorkoutsPage />)

    await user.click(await screen.findByRole('button', { name: /Отчёты/ }))

    await waitFor(() => expect(mocks.getReport).toHaveBeenCalled())
    expect(screen.getByText('Распределение нагрузки')).toBeInTheDocument()
    expect(screen.getByText('По упражнениям')).toBeInTheDocument()
    expect(screen.getByText('Лучшие показатели')).toBeInTheDocument()
    expect(screen.getByText('100% · 2 подх. · 22 повт.')).toBeInTheDocument()
  })
})
