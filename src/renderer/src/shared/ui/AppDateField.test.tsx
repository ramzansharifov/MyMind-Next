import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { AppDateField } from './AppDateField'

describe('AppDateField', () => {
  it('keeps the native date input semantics and opens the custom Radix calendar', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <AppDateField
        value="2026-08-25"
        ariaLabel="Дата тренировки"
        onChange={onChange}
      />
    )

    const input = screen.getByLabelText('Дата тренировки')
    expect(input).toHaveAttribute('type', 'date')
    expect(input).toHaveValue('2026-08-25')

    await user.click(
      screen.getByRole('button', { name: 'Открыть календарь для поля «Дата тренировки»' })
    )

    expect(await screen.findByTestId('app-date-field-popover')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Предыдущий месяц' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Следующий месяц' })).toBeInTheDocument()
  })

  it('returns an ISO date when a day is chosen from the calendar', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <AppDateField
        value="2026-08-25"
        ariaLabel="Дата тренировки"
        onChange={onChange}
      />
    )

    await user.click(
      screen.getByRole('button', { name: 'Открыть календарь для поля «Дата тренировки»' })
    )
    await user.click(screen.getByRole('button', { name: /Выбрать 24 августа 2026/ }))

    expect(onChange).toHaveBeenCalledWith('2026-08-24')
  })
})
