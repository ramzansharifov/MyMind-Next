import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('./AppTitleBar', () => ({
  AppTitleBar: () => <div data-testid="app-titlebar" />
}))

import { AppShell } from './AppShell'

describe('AppShell focus mode', () => {
  it('removes application chrome and gives the workspace the full window', () => {
    render(
      <AppShell activeView="study" focusMode onViewChange={vi.fn()}>
        <div>Учебный материал</div>
      </AppShell>
    )

    expect(screen.queryByTestId('app-titlebar')).not.toBeInTheDocument()
    expect(screen.queryByRole('complementary', { name: 'Боковая панель' })).not.toBeInTheDocument()
    expect(screen.getByText('Учебный материал')).toBeInTheDocument()
    expect(document.querySelector('#workspace')).toHaveAttribute('data-focus-mode', 'true')
    expect(document.documentElement).toHaveAttribute('data-app-focus-mode', 'true')
  })

  it('keeps the titlebar outside focus mode', () => {
    render(
      <AppShell activeView="study" onViewChange={vi.fn()}>
        <div>Учебный материал</div>
      </AppShell>
    )

    expect(screen.getByTestId('app-titlebar')).toBeInTheDocument()
  })
})
