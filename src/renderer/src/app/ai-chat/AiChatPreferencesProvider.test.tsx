import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { AiChatPreferencesProvider } from './AiChatPreferencesProvider'
import { useAiChatPreferences } from './ai-chat-preferences-context'

const STORAGE_KEY = 'mymind.ai-chat.launcher-visible'

function PreferenceProbe(): React.JSX.Element {
  const { showLauncher, setShowLauncher } = useAiChatPreferences()

  return (
    <button
      type="button"
      aria-pressed={showLauncher}
      onClick={() => setShowLauncher(!showLauncher)}
    >
      {showLauncher ? 'Кнопка видна' : 'Кнопка скрыта'}
    </button>
  )
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('AiChatPreferencesProvider', () => {
  it('shows the launcher by default and persists hiding it', async () => {
    const user = userEvent.setup()

    render(
      <AiChatPreferencesProvider>
        <PreferenceProbe />
      </AiChatPreferencesProvider>
    )

    const toggle = screen.getByRole('button', { name: 'Кнопка видна' })
    expect(toggle).toHaveAttribute('aria-pressed', 'true')

    await user.click(toggle)

    expect(screen.getByRole('button', { name: 'Кнопка скрыта' })).toHaveAttribute(
      'aria-pressed',
      'false'
    )
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('false')
  })

  it('restores a hidden launcher from local storage', () => {
    window.localStorage.setItem(STORAGE_KEY, 'false')

    render(
      <AiChatPreferencesProvider>
        <PreferenceProbe />
      </AiChatPreferencesProvider>
    )

    expect(screen.getByRole('button', { name: 'Кнопка скрыта' })).toHaveAttribute(
      'aria-pressed',
      'false'
    )
  })
})
