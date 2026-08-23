import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { HabitPreferredTimesEditor } from './HabitPreferredTimesEditor'

describe('HabitPreferredTimesEditor', () => {
  it('shows one time for a check habit', () => {
    render(
      <HabitPreferredTimesEditor
        trackingType="check"
        targetValue={1}
        values={{ 1: '09:00' }}
        onChange={vi.fn()}
      />
    )

    expect(screen.getByLabelText('Предпочтительное время привычки')).toHaveValue('09:00')
    expect(screen.queryByLabelText('Предпочтительное время для единицы 2')).not.toBeInTheDocument()
  })

  it('shows a separate preferred time input for every count unit', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <HabitPreferredTimesEditor
        trackingType="count"
        targetValue={3}
        values={{ 1: '09:00', 2: '15:00' }}
        onChange={onChange}
      />
    )

    expect(screen.getByLabelText('Предпочтительное время для единицы 1')).toHaveValue('09:00')
    expect(screen.getByLabelText('Предпочтительное время для единицы 2')).toHaveValue('15:00')
    const third = screen.getByLabelText('Предпочтительное время для единицы 3')
    expect(third).toHaveValue('')

    await user.type(third, '21:00')
    expect(onChange).toHaveBeenCalled()
  })

  it('paginates large count targets without rendering every unit at once', async () => {
    const user = userEvent.setup()
    render(
      <HabitPreferredTimesEditor
        trackingType="count"
        targetValue={14}
        values={{}}
        onChange={vi.fn()}
      />
    )

    expect(screen.getByLabelText('Предпочтительное время для единицы 12')).toBeInTheDocument()
    expect(screen.queryByLabelText('Предпочтительное время для единицы 13')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Следующие единицы времени' }))

    expect(screen.getByLabelText('Предпочтительное время для единицы 13')).toBeInTheDocument()
    expect(screen.getByLabelText('Предпочтительное время для единицы 14')).toBeInTheDocument()
  })
})
