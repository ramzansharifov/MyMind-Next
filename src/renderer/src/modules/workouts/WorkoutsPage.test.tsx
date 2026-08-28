import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  WorkoutExerciseRecord,
  WorkoutProgramRecord
} from '../../../../shared/contracts/workouts'

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
  muscleGroup: 'biceps',
  muscleGroups: ['biceps'],
  usesExternalWeight: true,
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
      position: 0
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
        date: '2026-08-17',
        durationMinutes: 60,
        comment: '',
        exercises: [
          {
            id: 'session-exercise-1',
            exerciseId: curl.id,
            exerciseTitle: curl.title,
            muscleGroup: curl.muscleGroup,
            muscleGroups: curl.muscleGroups,
            usesExternalWeight: curl.usesExternalWeight,
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
      externalWeightSets: 2,
      externalWeightReps: 22,
      bodyweightSets: 0,
      bodyweightReps: 0,
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
      {
        muscleGroup: 'arms',
        exercises: 1,
        sets: 2,
        reps: 22,
        volumeKg: 328,
        loadPercent: 100
      },
      {
        muscleGroup: 'back',
        exercises: 0,
        sets: 0,
        reps: 0,
        volumeKg: 0,
        loadPercent: 0
      },
      {
        muscleGroup: 'chest',
        exercises: 0,
        sets: 0,
        reps: 0,
        volumeKg: 0,
        loadPercent: 0
      },
      {
        muscleGroup: 'abs',
        exercises: 0,
        sets: 0,
        reps: 0,
        volumeKg: 0,
        loadPercent: 0
      },
      {
        muscleGroup: 'legs',
        exercises: 0,
        sets: 0,
        reps: 0,
        volumeKg: 0,
        loadPercent: 0
      },
      {
        muscleGroup: 'shoulders',
        exercises: 0,
        sets: 0,
        reps: 0,
        volumeKg: 0,
        loadPercent: 0
      }
    ],
    exercises: [
      {
        exerciseId: curl.id,
        title: curl.title,
        muscleGroup: 'biceps',
        muscleGroups: ['biceps'],
        usesExternalWeight: true,
        sessions: 1,
        sets: 2,
        reps: 22,
        volumeKg: 328,
        averageWeightKg: 15,
        maxWeightKg: 16,
        estimatedOneRepMax: 21.33,
        firstBestWeightKg: 16,
        lastBestWeightKg: 16,
        weightChangeKg: 0,
        bestSetReps: 12,
        firstBestReps: 12,
        lastBestReps: 12,
        repsChange: 0
      }
    ],
    programs: [
      {
        programId: program.id,
        name: program.name,
        sessions: 1,
        sets: 2,
        reps: 22,
        externalWeightSets: 2,
        bodyweightSets: 0,
        volumeKg: 328,
        durationMinutes: 60
      }
    ],
    timeline: [
      {
        date: '2026-08-17',
        sessions: 1,
        sets: 2,
        reps: 22,
        externalWeightSets: 2,
        bodyweightSets: 0,
        volumeKg: 328,
        durationMinutes: 60
      }
    ],
    personalRecords: [
      {
        exerciseId: curl.id,
        title: curl.title,
        muscleGroup: 'biceps',
        muscleGroups: ['biceps'],
        date: '2026-08-17',
        weightKg: 16,
        reps: 10,
        estimatedOneRepMax: 21.33
      }
    ],
    bodyweightRecords: []
  })
})

describe('WorkoutsPage', () => {
  it('keeps workout cards compact and reveals full details on click', async () => {
    const user = userEvent.setup()
    render(<WorkoutsPage />)

    expect(await screen.findByRole('heading', { name: 'Тренировки' })).toBeInTheDocument()
    const toggle = await screen.findByRole('button', { name: 'Раскрыть тренировку «Pull»' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('button', { name: 'Изменить тренировку' })).not.toBeInTheDocument()

    await user.click(toggle)

    expect(screen.getByRole('button', { name: 'Свернуть тренировку «Pull»' })).toHaveAttribute(
      'aria-expanded',
      'true'
    )
    expect(screen.getByText(/10 повт\. × 16 кг/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Изменить тренировку' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Удалить тренировку' })).toBeInTheDocument()
  })

  it('keeps searchable workout controls in the module header and analytics out of the journal', async () => {
    const user = userEvent.setup()
    render(<WorkoutsPage />)

    const title = await screen.findByRole('heading', { name: 'Тренировки' })
    const moduleHeader = title.closest('[data-module-header]')
    expect(moduleHeader).not.toBeNull()

    const journalSearch = screen.getByPlaceholderText('Поиск по тренировкам и упражнениям…')
    expect(moduleHeader).toContainElement(journalSearch)
    expect(moduleHeader).toContainElement(
      screen.getByRole('combobox', { name: 'Фильтр по программе' })
    )
    expect(moduleHeader).toContainElement(
      screen.getByRole('combobox', { name: 'Фильтр по группе мышц' })
    )
    expect(screen.queryByText('Тренировок за 30 дней')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Упражнения/ }))
    expect(moduleHeader).toContainElement(screen.getByPlaceholderText('Найти упражнение…'))
    expect(moduleHeader).toContainElement(screen.getByRole('combobox', { name: 'Группа мышц' }))

    await user.click(screen.getByRole('button', { name: /Программы/ }))
    expect(moduleHeader).toContainElement(screen.getByPlaceholderText('Найти программу…'))
  })

  it('opens the full muscle model from the workout journal', async () => {
    const user = userEvent.setup()
    render(<WorkoutsPage />)

    await user.click(await screen.findByRole('button', { name: 'Раскрыть тренировку «Pull»' }))
    await user.click(
      screen.getByRole('button', { name: 'Посмотреть модель мышц тренировки «Pull»' })
    )

    expect(await screen.findByText('Модель мышц · Pull')).toBeInTheDocument()
    expect(screen.getAllByText('Бицепс').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Повернуть модель' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Закрыть модель мышц' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Мужская модель' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(screen.getByRole('button', { name: 'Женская модель' })).toHaveAttribute(
      'aria-pressed',
      'false'
    )

    const viewer = screen.getByRole('region', { name: 'Интерактивная карта мышц' })
    vi.spyOn(viewer, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 1000,
      bottom: 700,
      width: 1000,
      height: 700,
      toJSON: () => ({})
    } as DOMRect)

    expect(viewer).toHaveAttribute('data-zoom', '1.00')
    expect(viewer).toHaveAttribute('data-view', 'FRONT')
    expect(viewer).toHaveAttribute('data-sex', 'MALE')
    expect(viewer).toHaveAttribute('data-pan-x', '0')
    expect(viewer).toHaveAttribute('data-pan-y', '0')

    await user.click(screen.getByRole('button', { name: 'Женская модель' }))
    expect(viewer).toHaveAttribute('data-sex', 'FEMALE')
    expect(screen.getByRole('button', { name: 'Женская модель' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )

    fireEvent.wheel(viewer, { deltaY: -100 })
    expect(viewer).toHaveAttribute('data-zoom', '1.10')

    fireEvent.pointerDown(viewer, { button: 0, pointerId: 1, clientX: 500, clientY: 350 })
    fireEvent.pointerMove(viewer, { pointerId: 1, clientX: 540, clientY: 380 })
    fireEvent.pointerUp(viewer, { button: 0, pointerId: 1, clientX: 540, clientY: 380 })
    expect(viewer).toHaveAttribute('data-pan-x', '40')
    expect(viewer).toHaveAttribute('data-pan-y', '30')

    fireEvent.contextMenu(viewer)
    expect(viewer).toHaveAttribute('data-view', 'BACK')
    expect(viewer).toHaveAttribute('data-sex', 'FEMALE')

    fireEvent.wheel(viewer, { deltaY: 100 })
    expect(viewer).toHaveAttribute('data-zoom', '1.00')
    expect(viewer).toHaveAttribute('data-pan-x', '0')
    expect(viewer).toHaveAttribute('data-pan-y', '0')
  })

  it('shows the fixed muscle tag in the exercise library', async () => {
    const user = userEvent.setup()
    render(<WorkoutsPage />)

    await user.click(await screen.findByRole('button', { name: /Упражнения/ }))

    expect(screen.getByText('Сгибания на бицепс с гантелями')).toBeInTheDocument()
    expect(screen.getByText('Бицепс')).toBeInTheDocument()
  })

  it('opens the muscle map for a workout program', async () => {
    const user = userEvent.setup()
    render(<WorkoutsPage />)

    await user.click(await screen.findByRole('button', { name: /Программы/ }))
    await user.click(screen.getByRole('button', { name: 'Открыть карту мышц «Pull»' }))

    expect(await screen.findByText('Карта мышц · Pull')).toBeInTheDocument()
    expect(screen.getByText('Задействованные мышцы')).toBeInTheDocument()
    expect(screen.getByText('Бицепс')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Повернуть модель' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Закрыть модель мышц' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Мужская модель' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Женская модель' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Повернуть модель' }))
    expect(screen.getByRole('button', { name: 'Повернуть модель' })).toBeInTheDocument()
  })

  it('opens extensive reports with muscle distribution and exercise analytics', async () => {
    const user = userEvent.setup()
    render(<WorkoutsPage />)

    await user.click(await screen.findByRole('button', { name: /Отчёты/ }))

    await waitFor(() => expect(mocks.getReport).toHaveBeenCalled())
    expect(screen.getByText('Распределение нагрузки')).toBeInTheDocument()
    expect(screen.getByText('По упражнениям')).toBeInTheDocument()
    expect(screen.getByText('Лучшие показатели')).toBeInTheDocument()
    expect(screen.getByText('2 с весом · 0 без веса')).toBeInTheDocument()
    expect(screen.getByText('Тоннаж с весом')).toBeInTheDocument()
    expect(screen.getAllByText('С дополнительным весом').length).toBeGreaterThan(0)
    expect(screen.getByLabelText('Начало периода')).toHaveAttribute('type', 'date')
    expect(screen.getByLabelText('Конец периода')).toHaveAttribute('type', 'date')

    await user.click(
      screen.getByRole('button', { name: 'Открыть календарь для поля «Начало периода»' })
    )
    expect(await screen.findByTestId('app-date-field-popover')).toBeInTheDocument()
  })
})
