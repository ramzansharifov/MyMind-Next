import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { WorkoutMuscleMapPicker } from './WorkoutMuscleMapPicker'

const muscleLabels = [
  'Плечи',
  'Бицепс',
  'Трицепс',
  'Предплечья',
  'Трапеции',
  'Широчайшие',
  'Поясница',
  'Грудные мышцы',
  'Пресс',
  'Ягодицы',
  'Квадрицепсы',
  'Задняя поверхность бедра',
  'Икры'
]

describe('WorkoutMuscleMapPicker', () => {
  it('renders a dedicated selectable icon card for every concrete muscle zone', () => {
    render(<WorkoutMuscleMapPicker value={[]} onChange={vi.fn()} />)

    muscleLabels.forEach((label) => {
      expect(screen.getByRole('button', { name: `Выбрать: ${label}` })).toBeInTheDocument()
    })
  })

  it('adds and removes a muscle by clicking the whole icon card', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const view = render(<WorkoutMuscleMapPicker value={[]} onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Выбрать: Бицепс' }))
    expect(onChange).toHaveBeenLastCalledWith(['biceps'])

    view.rerender(<WorkoutMuscleMapPicker value={['biceps']} onChange={onChange} />)
    const selected = screen.getByRole('button', { name: 'Убрать: Бицепс' })
    expect(selected).toHaveAttribute('aria-pressed', 'true')

    await user.click(selected)
    expect(onChange).toHaveBeenLastCalledWith([])
  })

  it('keeps multiple selected muscle zones visible at the same time', () => {
    render(
      <WorkoutMuscleMapPicker value={['biceps', 'lats', 'quadriceps']} onChange={vi.fn()} />
    )

    expect(screen.getByText('3 выбрано')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Убрать: Бицепс' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(screen.getByRole('button', { name: 'Убрать: Широчайшие' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(screen.getByRole('button', { name: 'Убрать: Квадрицепсы' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
  })
})
