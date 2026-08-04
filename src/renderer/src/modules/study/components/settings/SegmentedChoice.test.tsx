import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { SegmentedChoice } from './SegmentedChoice'

const options = [
  { value: 'small', label: '12' },
  { value: 'large', label: '32' }
]

describe('SegmentedChoice', () => {
  it('uses the shared settings surface for inactive and active options', () => {
    render(
      <SegmentedChoice
        value="large"
        options={options}
        ariaLabel="Размер текста"
        columns={2}
        onValueChange={vi.fn()}
      />
    )

    const inactiveOption = screen.getByRole('radio', { name: '12' })
    const activeOption = screen.getByRole('radio', { name: '32' })

    expect(inactiveOption).toHaveAttribute('data-state', 'off')
    expect(inactiveOption.className).toContain('bg-(--app-workspace)')
    expect(inactiveOption.className).toContain('border-(--app-border)')
    expect(inactiveOption.className).not.toContain('violet')

    expect(activeOption).toHaveAttribute('data-state', 'on')
    expect(activeOption.className).toContain('var(--app-accent-500)')
    expect(activeOption.className).toContain('var(--app-accent-400)')
    expect(activeOption.className).not.toContain('violet')
  })

  it('keeps Radix single-choice behavior', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()

    render(
      <SegmentedChoice
        value="small"
        options={options}
        ariaLabel="Размер текста"
        columns={2}
        onValueChange={onValueChange}
      />
    )

    await user.click(screen.getByRole('radio', { name: '32' }))

    expect(onValueChange).toHaveBeenCalledWith('large')
  })
})
