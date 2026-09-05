import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { SettingsBreadcrumbs } from './SettingsBreadcrumbs'

describe('settings breadcrumbs', () => {
  it('marks the current page and opens previous levels', async () => {
    const user = userEvent.setup()
    const openSettings = vi.fn()
    const openInstructions = vi.fn()

    render(
      <SettingsBreadcrumbs
        items={[
          { label: 'Настройки', onClick: openSettings },
          { label: 'Инструкции', onClick: openInstructions },
          { label: 'Обучение' }
        ]}
      />
    )

    expect(screen.getByRole('navigation', { name: 'Навигация по настройкам' })).toBeInTheDocument()
    expect(screen.getByText('Обучение')).toHaveAttribute('aria-current', 'page')

    await user.click(screen.getByRole('button', { name: 'Настройки' }))
    await user.click(screen.getByRole('button', { name: 'Инструкции' }))

    expect(openSettings).toHaveBeenCalledTimes(1)
    expect(openInstructions).toHaveBeenCalledTimes(1)
  })
})
