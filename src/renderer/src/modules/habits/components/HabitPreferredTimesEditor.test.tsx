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

  it('shows the fixed reminder switch only when a preferred time exists', async () => {
    const user = userEvent.setup()
    const onRemindersChange = vi.fn()
    const { rerender } = render(
      <HabitPreferredTimesEditor
        trackingType="check"
        targetValue={1}
        values={{}}
        remindersEnabled={false}
        onChange={vi.fn()}
        onRemindersChange={onRemindersChange}
      />
    )

    expect(
      screen.queryByRole('switch', { name: 'Напоминать о привычке за 30 минут' })
    ).not.toBeInTheDocument()

    rerender(
      <HabitPreferredTimesEditor
        trackingType="check"
        targetValue={1}
        values={{ 1: '09:00' }}
        remindersEnabled={false}
        onChange={vi.fn()}
        onRemindersChange={onRemindersChange}
      />
    )

    const reminderSwitch = screen.getByRole('switch', {
      name: 'Напоминать о привычке за 30 минут'
    })
    expect(
      screen.getByText('За 30 минут до каждого указанного предпочтительного времени.')
    ).toBeInTheDocument()
    await user.click(reminderSwitch)
    expect(onRemindersChange).toHaveBeenCalledWith(true)
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
