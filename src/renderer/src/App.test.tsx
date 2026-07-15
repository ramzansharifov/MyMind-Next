import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'

const LAZY_MODULE_TIMEOUT_MS = 10_000

describe('App shell', () => {
  beforeEach(() => {
    window.localStorage.clear()

    Object.defineProperty(window, 'api', {
      configurable: true,
      value: {
        preferences: {
          getAppearance: vi.fn().mockResolvedValue({
            version: 1,
            theme: 'dark',
            accent: 'violet'
          }),

          updateAppearance: vi.fn().mockImplementation(async (input) => ({
            version: 1,
            theme: input.theme ?? 'dark',
            accent: input.accent ?? 'violet'
          }))
        },

        system: {
          getHealth: vi.fn().mockResolvedValue({
            database: 'ready',
            sqliteVersion: '3.0.0'
          }),

          onShutdownRequested: vi.fn().mockReturnValue(() => undefined),

          respondToShutdown: vi.fn().mockResolvedValue(undefined)
        },

        study: {
          listNodes: vi.fn().mockResolvedValue([]),

          createNode: vi.fn(),
          renameNode: vi.fn(),

          duplicateNode: vi.fn().mockImplementation(async ({ id }: { id: string }) => ({
            rootId: id,
            nodes: []
          })),

          updateFolderIcon: vi.fn(),
          deleteNode: vi.fn(),
          updateExpansion: vi.fn(),
          moveNode: vi.fn(),
          getMaterial: vi.fn(),
          saveMaterial: vi.fn(),
          searchInternalLinkTargets: vi.fn(),
          resolveInternalLinkTarget: vi.fn(),
          importAsset: vi.fn(),
          openAsset: vi.fn()
        }
      }
    })
  })

  afterEach(() => {
    Reflect.deleteProperty(window, 'api')
  })

  it('shows the study module by default', async () => {
    render(<App />)

    expect(
      await screen.findByRole(
        'heading',
        {
          name: 'Обучение'
        },
        {
          timeout: LAZY_MODULE_TIMEOUT_MS
        }
      )
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
      await screen.findByRole(
        'heading',
        {
          name: 'Настройки'
        },
        {
          timeout: LAZY_MODULE_TIMEOUT_MS
        }
      )
    ).toBeInTheDocument()

    expect(await screen.findByText('SQLite 3.0.0')).toBeInTheDocument()
  })

  it('applies theme and accent changes from settings immediately', async () => {
    const user = userEvent.setup()

    render(<App />)

    await user.click(
      screen.getByRole('button', {
        name: 'Настройки'
      })
    )

    await user.click(
      screen.getByRole('button', {
        name: /Внешний вид/
      })
    )

    await user.click(
      await screen.findByRole(
        'radio',
        {
          name: /Светлая/
        },
        {
          timeout: LAZY_MODULE_TIMEOUT_MS
        }
      )
    )

    expect(document.documentElement).toHaveAttribute('data-theme', 'light')

    await user.click(
      screen.getByRole('radio', {
        name: 'Изумрудный'
      })
    )

    expect(document.documentElement).toHaveAttribute('data-accent', 'emerald')

    expect(window.api.preferences.updateAppearance).toHaveBeenCalled()
  })

  it('opens appearance as a separate settings category and returns to the overview', async () => {
    const user = userEvent.setup()

    render(<App />)

    await user.click(
      screen.getByRole('button', {
        name: 'Настройки'
      })
    )

    await user.click(
      screen.getByRole('button', {
        name: /Внешний вид/
      })
    )

    expect(
      screen.getByRole('heading', {
        name: 'Внешний вид'
      })
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', {
        name: 'Все настройки'
      })
    )

    expect(
      screen.getByRole('heading', {
        name: 'Настройки'
      })
    ).toBeInTheDocument()
  })

  it('starts with a collapsed sidebar in study and allows expansion', async () => {
    const user = userEvent.setup()

    render(<App />)

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

  it('collapses the sidebar when returning to study', async () => {
    const user = userEvent.setup()

    render(<App />)

    await user.click(
      screen.getByRole('button', {
        name: 'Развернуть боковую панель'
      })
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Настройки'
      })
    )

    expect(
      await screen.findByRole(
        'heading',
        {
          name: 'Настройки'
        },
        {
          timeout: LAZY_MODULE_TIMEOUT_MS
        }
      )
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', {
        name: 'Обучение'
      })
    )

    expect(
      screen.getByRole('button', {
        name: 'Развернуть боковую панель'
      })
    ).toBeInTheDocument()
  })
})
