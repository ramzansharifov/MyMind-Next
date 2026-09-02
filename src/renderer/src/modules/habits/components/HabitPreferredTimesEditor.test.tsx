import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, describe, expect, it, vi } from 'vitest'

import { HabitPreferredTimesEditor } from './HabitPreferredTimesEditor'

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', {
    configurable: true,
    value: () => false
  })
  Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
    configurable: true,
    value: () => undefined
  })
  Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', {
    configurable: true,
    value: () => undefined
  })
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: () => undefined
  })
})

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

    expect(
      screen.getByRole('combobox', { name: 'Предпочтительное время привычки: часы' })
    ).toHaveTextContent('09')
    expect(
      screen.getByRole('combobox', { name: 'Предпочтительное время привычки: минуты' })
    ).toHaveTextContent('00')
    expect(
      screen.queryByRole('combobox', {
        name: 'Предпочтительное время для единицы 2: часы'
      })
    ).not.toBeInTheDocument()
  })

  it('shows a separate preferred time control for every count unit', async () => {
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

    expect(
      screen.getByRole('combobox', { name: 'Предпочтительное время для единицы 1: часы' })
    ).toHaveTextContent('09')
    expect(
      screen.getByRole('combobox', { name: 'Предпочтительное время для единицы 1: минуты' })
    ).toHaveTextContent('00')
    expect(
      screen.getByRole('combobox', { name: 'Предпочтительное время для единицы 2: часы' })
    ).toHaveTextContent('15')
    expect(
      screen.getByRole('combobox', { name: 'Предпочтительное время для единицы 2: минуты' })
    ).toHaveTextContent('00')

    const thirdHour = screen.getByRole('combobox', {
      name: 'Предпочтительное время для единицы 3: часы'
    })
    const thirdMinute = screen.getByRole('combobox', {
      name: 'Предпочтительное время для единицы 3: минуты'
    })
    expect(thirdHour).toHaveTextContent('—')
    expect(thirdMinute).toHaveTextContent('—')

    await user.click(thirdHour)
    await user.click(await screen.findByRole('option', { name: '21' }))
    expect(onChange).toHaveBeenCalledWith(3, '21:00')
  })

  it('shows automatic reminder information without a toggle', () => {
    const { rerender } = render(
      <HabitPreferredTimesEditor
        trackingType="check"
        targetValue={1}
        values={{}}
        onChange={vi.fn()}
      />
    )

    expect(screen.queryByText('Напоминание включено автоматически')).not.toBeInTheDocument()
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()

    rerender(
      <HabitPreferredTimesEditor
        trackingType="check"
        targetValue={1}
        values={{ 1: '09:00' }}
        onChange={vi.fn()}
      />
    )

    expect(screen.getByText('Напоминание включено автоматически')).toBeInTheDocument()
    expect(
      screen.getByText('Оно придёт за 30 минут до каждого указанного предпочтительного времени.')
    ).toBeInTheDocument()
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
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

    expect(
      screen.getByRole('combobox', { name: 'Предпочтительное время для единицы 12: часы' })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('combobox', {
        name: 'Предпочтительное время для единицы 13: часы'
      })
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Следующие единицы времени' }))

    expect(
      screen.getByRole('combobox', { name: 'Предпочтительное время для единицы 13: часы' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('combobox', { name: 'Предпочтительное время для единицы 14: часы' })
    ).toBeInTheDocument()
  })
})
