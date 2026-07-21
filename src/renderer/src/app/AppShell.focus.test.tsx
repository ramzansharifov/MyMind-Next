import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AppShell } from './AppShell'

describe('AppShell focus mode', () => {
  it('removes the application navigation and gives the workspace the full window', () => {
    render(
      <AppShell activeView="study" focusMode onViewChange={vi.fn()}>
        <div>Учебный материал</div>
      </AppShell>
    )

    expect(screen.queryByRole('complementary', { name: 'Боковая панель' })).not.toBeInTheDocument()
    expect(screen.getByText('Учебный материал')).toBeInTheDocument()
    expect(document.querySelector('#workspace')).toHaveAttribute('data-focus-mode', 'true')
  })
})
