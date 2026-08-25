import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type {
  WorkoutProgressEntryRecord,
  WorkoutProgressPhotoRecord
} from '../../../../../shared/contracts/workouts'
import { WorkoutProgressSection } from './WorkoutProgressSection'

function photo(
  id: string,
  entryId: string,
  view: 'front' | 'left' | 'right' | 'back' | 'custom'
): WorkoutProgressPhotoRecord {
  return {
    id,
    entryId,
    assetId: `asset-${id}`,
    fileName: `${id}.jpg`,
    mimeType: 'image/jpeg',
    size: 1024,
    url: `mymind-asset://workout-progress-${entryId}/asset-${id}/${id}.jpg`,
    view,
    createdAt: 1
  }
}

const entries: WorkoutProgressEntryRecord[] = [
  {
    id: 'entry-new',
    date: '2026-08-20',
    bodyWeightKg: 78,
    wellbeing: 'Энергии больше.',
    notes: 'Форма стала суше.',
    metrics: [
      {
        id: 'metric-bodyweight',
        exerciseId: 'pull-up',
        exerciseTitle: 'Подтягивания',
        muscleGroup: 'lats',
        muscleGroups: ['lats', 'biceps'],
        usesExternalWeight: false,
        weightKg: 0,
        reps: 12,
        comment: ''
      },
      {
        id: 'metric-weighted',
        exerciseId: 'bench',
        exerciseTitle: 'Жим лёжа',
        muscleGroup: 'chest',
        muscleGroups: ['chest'],
        usesExternalWeight: true,
        weightKg: 80,
        reps: 8,
        comment: 'Уверенно'
      }
    ],
    photos: [
      photo('front-new', 'entry-new', 'front'),
      photo('custom-new', 'entry-new', 'custom')
    ],
    createdAt: 2,
    updatedAt: 2
  },
  {
    id: 'entry-old',
    date: '2026-08-01',
    bodyWeightKg: 80,
    wellbeing: '',
    notes: '',
    metrics: [],
    photos: [photo('front-old', 'entry-old', 'front')],
    createdAt: 1,
    updatedAt: 1
  }
]

describe('WorkoutProgressSection', () => {
  it('shows weight trend, mode-aware metrics and visual comparison', () => {
    render(
      <WorkoutProgressSection
        entries={entries}
        busy={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onImportPhoto={vi.fn()}
        onRemovePhoto={vi.fn()}
      />
    )

    expect(screen.getAllByText('78 кг').length).toBeGreaterThan(0)
    expect(screen.getByText('−2 кг')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Динамика веса тела' })).toBeInTheDocument()
    expect(screen.getByText('Визуальный прогресс')).toBeInTheDocument()
    expect(screen.getByAltText(/Было · 1 августа 2026/)).toBeInTheDocument()
    expect(screen.getByAltText(/Стало · 20 августа 2026/)).toBeInTheDocument()
    expect(screen.getByText('12 повторений')).toBeInTheDocument()
    expect(screen.getByText('80 кг × 8')).toBeInTheDocument()
  })

  it('imports a photo into a selected standard slot and custom gallery', async () => {
    const user = userEvent.setup()
    const onImportPhoto = vi.fn().mockResolvedValue(undefined)

    render(
      <WorkoutProgressSection
        entries={entries}
        busy={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onImportPhoto={onImportPhoto}
        onRemovePhoto={vi.fn()}
      />
    )

    await user.click(
      screen.getByRole('button', {
        name: /Добавить фото сзади за 20 августа 2026/i
      })
    )
    expect(onImportPhoto).toHaveBeenCalledWith('entry-new', 'back')

    await user.click(
      screen.getByRole('button', {
        name: /Добавить другой ракурс за 20 августа 2026/i
      })
    )
    expect(onImportPhoto).toHaveBeenCalledWith('entry-new', 'custom')
  })

  it('opens a large photo preview and confirms photo deletion', async () => {
    const user = userEvent.setup()
    const onRemovePhoto = vi.fn().mockResolvedValue(undefined)

    render(
      <WorkoutProgressSection
        entries={entries}
        busy={false}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onImportPhoto={vi.fn()}
        onRemovePhoto={onRemovePhoto}
      />
    )

    await user.click(
      screen.getByRole('button', {
        name: /Открыть фото спереди за 20 августа 2026/i
      })
    )
    const previewDialog = screen.getByRole('dialog')
    expect(previewDialog).toBeInTheDocument()
    expect(within(previewDialog).getByAltText(/Спереди · 20 августа 2026/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Закрыть диалог' }))
    await user.click(
      screen.getByRole('button', {
        name: /Удалить другой ракурс за 20 августа 2026/i
      })
    )
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Удалить' }))
    expect(onRemovePhoto).toHaveBeenCalledWith('custom-new')
  })
})
