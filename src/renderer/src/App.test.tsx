import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'

describe('App shell', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'api', {
      configurable: true,
      value: {
        system: {
          getHealth: vi.fn().mockResolvedValue({
            database: 'ready',
            sqliteVersion: '3.0.0'
          })
        },

        study: {
          listNodes: vi.fn().mockResolvedValue([]),
          createNode: vi.fn(),
          renameNode: vi.fn(),
          deleteNode: vi.fn(),
          updateExpansion: vi.fn(),
          moveNode: vi.fn(),
          getMaterial: vi.fn(),
          saveMaterial: vi.fn()
        }
      }
    })
  })

  it('shows the study module by default', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', {
        name: 'Обучение'
      })
    ).toBeInTheDocument()

    expect(
      screen.getByRole('button', {
        name: 'Настройки'
      })
    ).toBeInTheDocument()
  })

  it('opens settings from the bottom navigation', async () => {
    const user = userEvent.setup()

    render(<App />)

    await user.click(
      screen.getByRole('button', {
        name: 'Настройки'
      })
    )

    expect(
      screen.getByRole('heading', {
        name: 'Настройки'
      })
    ).toBeInTheDocument()

    expect(await screen.findByText('SQLite 3.0.0')).toBeInTheDocument()
  })

  it('collapses and expands the sidebar', async () => {
    const user = userEvent.setup()

    render(<App />)

    await user.click(
      screen.getByRole('button', {
        name: 'Свернуть боковую панель'
      })
    )

    expect(
      screen.getByRole('button', {
        name: 'Развернуть боковую панель'
      })
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', {
        name: 'Развернуть боковую панель'
      })
    )

    expect(
      screen.getByRole('button', {
        name: 'Свернуть боковую панель'
      })
    ).toBeInTheDocument()
  })
})
