import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AppearancePreferences } from '../../../../shared/contracts/preferences'

import { AppearanceProvider } from './AppearanceProvider'
import { useAppearance } from './appearance-context'

let systemDark = false
let mediaListener: ((event: MediaQueryListEvent) => void) | null = null

function Harness(): React.JSX.Element {
  const { status, error, setAccent } = useAppearance()

  return (
    <div>
      <span>{status}</span>
      {error && <span>{error}</span>}
      <button type="button" onClick={() => setAccent('blue')}>
        Синий
      </button>
      <button type="button" onClick={() => setAccent('emerald')}>
        Изумрудный
      </button>
    </div>
  )
}

describe('AppearanceProvider', () => {
  beforeEach(() => {
    window.localStorage.clear()
    systemDark = false
    mediaListener = null
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: systemDark,
        media: query,
        onchange: null,
        addEventListener: (_event: string, listener: (event: MediaQueryListEvent) => void) => {
          mediaListener = listener
        },
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn()
      }))
    })
  })

  afterEach(() => {
    Reflect.deleteProperty(window, 'api')
  })

  it('reacts to system color-scheme changes while system theme is selected', async () => {
    Object.defineProperty(window, 'api', {
      configurable: true,
      value: {
        preferences: {
          getAppearance: vi
            .fn()
            .mockResolvedValue({ version: 1, theme: 'system', accent: 'violet' }),
          updateAppearance: vi.fn()
        }
      }
    })

    render(
      <AppearanceProvider>
        <Harness />
      </AppearanceProvider>
    )

    await waitFor(() => expect(document.documentElement).toHaveAttribute('data-theme', 'light'))

    act(() => {
      systemDark = true
      mediaListener?.({ matches: true } as MediaQueryListEvent)
    })

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  })

  it('rolls back an optimistic update and exposes persistence errors', async () => {
    const user = userEvent.setup()
    let rejectSave: ((reason?: unknown) => void) | undefined
    Object.defineProperty(window, 'api', {
      configurable: true,
      value: {
        preferences: {
          getAppearance: vi.fn().mockResolvedValue({ version: 1, theme: 'dark', accent: 'violet' }),
          updateAppearance: vi.fn().mockImplementation(
            () =>
              new Promise((_resolve, reject) => {
                rejectSave = reject
              })
          )
        }
      }
    })

    render(
      <AppearanceProvider>
        <Harness />
      </AppearanceProvider>
    )

    await screen.findByText('ready')
    await user.click(screen.getByRole('button', { name: 'Синий' }))
    expect(document.documentElement).toHaveAttribute('data-accent', 'blue')

    act(() => rejectSave?.(new Error('Диск недоступен')))

    await screen.findByText('Диск недоступен')
    expect(document.documentElement).toHaveAttribute('data-accent', 'violet')
  })

  it('does not restore stale state after rapid sequential updates', async () => {
    const user = userEvent.setup()
    const pending: Array<
      (value: { version: 1; theme: 'dark'; accent: 'blue' | 'emerald' }) => void
    > = []
    const updateAppearance = vi.fn().mockImplementation(
      (preferences: AppearancePreferences) =>
        new Promise((resolve) => {
          pending.push(resolve)
          expect(preferences.version).toBe(1)
        })
    )
    Object.defineProperty(window, 'api', {
      configurable: true,
      value: {
        preferences: {
          getAppearance: vi.fn().mockResolvedValue({ version: 1, theme: 'dark', accent: 'violet' }),
          updateAppearance
        }
      }
    })

    render(
      <AppearanceProvider>
        <Harness />
      </AppearanceProvider>
    )

    await screen.findByText('ready')
    await user.click(screen.getByRole('button', { name: 'Синий' }))
    await user.click(screen.getByRole('button', { name: 'Изумрудный' }))
    expect(document.documentElement).toHaveAttribute('data-accent', 'emerald')

    await waitFor(() => expect(pending).toHaveLength(1))
    act(() => pending[0]({ version: 1, theme: 'dark', accent: 'blue' }))
    await waitFor(() => expect(pending).toHaveLength(2))
    expect(document.documentElement).toHaveAttribute('data-accent', 'emerald')

    act(() => pending[1]({ version: 1, theme: 'dark', accent: 'emerald' }))
    await screen.findByText('ready')
    expect(document.documentElement).toHaveAttribute('data-accent', 'emerald')
  })

  it('does not overwrite an edit with a late initial load', async () => {
    const user = userEvent.setup()
    let resolveInitial: ((value: AppearancePreferences) => void) | undefined
    Object.defineProperty(window, 'api', {
      configurable: true,
      value: {
        preferences: {
          getAppearance: vi.fn().mockImplementation(
            () =>
              new Promise((resolve) => {
                resolveInitial = resolve
              })
          ),
          updateAppearance: vi.fn().mockResolvedValue({
            version: 1,
            theme: 'dark',
            accent: 'blue'
          })
        }
      }
    })

    render(
      <AppearanceProvider>
        <Harness />
      </AppearanceProvider>
    )

    await user.click(screen.getByRole('button', { name: 'Синий' }))
    expect(document.documentElement).toHaveAttribute('data-accent', 'blue')

    act(() => resolveInitial?.({ version: 1, theme: 'dark', accent: 'violet' }))
    await waitFor(() => expect(document.documentElement).toHaveAttribute('data-accent', 'blue'))
  })
})
