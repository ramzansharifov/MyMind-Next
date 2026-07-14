import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AppErrorBoundary, isLazyImportError } from './AppErrorBoundary'

function ThrowError({ error }: { error: Error }): React.JSX.Element {
  throw error
}

describe('AppErrorBoundary', () => {
  it('reloads after a lazy import failure', () => {
    const reload = vi.fn()
    const error = new Error('Failed to fetch dynamically imported module')

    render(
      <AppErrorBoundary scope="test" reload={reload}>
        <ThrowError error={error} />
      </AppErrorBoundary>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Перезагрузить приложение' }))
    expect(reload).toHaveBeenCalledOnce()
  })

  it('classifies ordinary render errors separately', () => {
    expect(isLazyImportError(new Error('render failed'))).toBe(false)
    expect(
      isLazyImportError(Object.assign(new Error('load failed'), { name: 'ChunkLoadError' }))
    ).toBe(true)
  })

  it('retries an ordinary render error without reloading', () => {
    const reload = vi.fn()
    let shouldThrow = true
    function FlakyChild(): React.JSX.Element {
      if (shouldThrow) throw new Error('render failed')
      return <p>Recovered</p>
    }

    render(
      <AppErrorBoundary scope="test" reload={reload}>
        <FlakyChild />
      </AppErrorBoundary>
    )
    shouldThrow = false
    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }))

    expect(screen.getByText('Recovered')).toBeInTheDocument()
    expect(reload).not.toHaveBeenCalled()
  })
})
