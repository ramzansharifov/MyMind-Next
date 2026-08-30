import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { TooltipProvider } from '../shared/ui/tooltip'
import { AiChatOverlay } from './AiChatOverlay'

const aiChat = {
  setOpen: vi.fn().mockResolvedValue(undefined),
  setBounds: vi.fn().mockResolvedValue(undefined),
  reload: vi.fn().mockResolvedValue(undefined)
}

describe('AiChatOverlay', () => {
  it('opens the native ChatGPT viewport and closes it explicitly', async () => {
    Object.defineProperty(window, 'api', {
      configurable: true,
      value: { aiChat }
    })

    const user = userEvent.setup()
    render(
      <TooltipProvider>
        <AiChatOverlay />
      </TooltipProvider>
    )

    await user.click(screen.getByRole('button', { name: 'Открыть ИИ-чат' }))
    const viewport = screen.getByTestId('ai-chat-viewport')
    vi.spyOn(viewport, 'getBoundingClientRect').mockReturnValue({
      x: 700,
      y: 84,
      top: 84,
      right: 1180,
      bottom: 820,
      left: 700,
      width: 480,
      height: 736,
      toJSON: () => ({})
    })
    window.dispatchEvent(new Event('resize'))

    await waitFor(() => {
      expect(aiChat.setOpen).toHaveBeenCalledWith({
        open: true,
        bounds: { x: 700, y: 84, width: 480, height: 736 }
      })
    })

    await user.click(screen.getByRole('button', { name: 'Перезагрузить ChatGPT' }))
    expect(aiChat.reload).toHaveBeenCalledOnce()

    await user.click(screen.getByRole('button', { name: 'Закрыть ИИ-чат' }))
    await waitFor(() => expect(aiChat.setOpen).toHaveBeenCalledWith({ open: false }))
  })
})
