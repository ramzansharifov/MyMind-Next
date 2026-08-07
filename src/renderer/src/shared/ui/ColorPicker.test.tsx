import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ColorPicker } from './ColorPicker'

describe('ColorPicker', () => {
  it('offers the shared preset palette and returns the selected preset', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ColorPicker value="#a78bfa" ariaLabel="Цвет счёта" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Цвет счёта' }))
    expect(screen.getByText('Выбор цвета')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Цвет #60a5fa' }))

    expect(onChange).toHaveBeenCalledWith('#60a5fa')
  })

  it('keeps an arbitrary native color input available', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ColorPicker value="#a78bfa" ariaLabel="Цвет счёта" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: 'Цвет счёта' }))
    const customColor = screen.getByLabelText('Цвет счёта', { selector: 'input[type="color"]' })
    await user.clear(customColor)
    await user.type(customColor, '#123456')

    expect(onChange).toHaveBeenCalled()
  })
})
