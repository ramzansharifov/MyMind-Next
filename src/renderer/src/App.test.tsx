import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'

describe('App', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'api', {
      configurable: true,
      value: {
        system: {
          getHealth: vi.fn().mockResolvedValue({
            database: 'ready',
            sqliteVersion: '3.0.0'
          })
        }
      }
    })
  })

  it('shows the SQLite health result', async () => {
    render(<App />)

    expect(await screen.findByText('Database ready')).toBeInTheDocument()
    expect(screen.getByText('SQLite 3.0.0')).toBeInTheDocument()
  })
})
