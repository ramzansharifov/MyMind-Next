import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { TooltipProvider } from '../shared/ui/tooltip'
import { AiChatOverlay } from './AiChatOverlay'

const aiChat = {
  setOpen: vi.fn().mockResolvedValue(undefined),
  setBounds: vi.fn().mockResolvedValue(undefined),
  reload: vi.fn().mockResolvedValue(undefined)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('AiChatOverlay', () => {
  it('opens, resizes and closes the native ChatGPT viewport', async () => {
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
    const panel = screen.getByTestId('ai-chat-panel')
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

    expect(panel).toHaveStyle({ width: '480px' })
    await user.click(screen.getByRole('button', { name: 'Расширить ИИ-чат' }))
    expect(panel).toHaveStyle({ width: '800px' })
    await user.click(screen.getByRole('button', { name: 'Сузить ИИ-чат' }))
    expect(panel).toHaveStyle({ width: '480px' })

    const resizeHandle = screen.getByRole('separator', { name: 'Изменить ширину ИИ-чата' })
    fireEvent.pointerDown(resizeHandle, { button: 0, clientX: 700 })
    fireEvent.pointerMove(window, { clientX: 620 })
    expect(panel).toHaveStyle({ width: '560px' })
    fireEvent.pointerUp(window)

    fireEvent.keyDown(resizeHandle, { key: 'ArrowLeft' })
    expect(panel).toHaveStyle({ width: '592px' })

    await user.click(screen.getByRole('button', { name: 'Перезагрузить ChatGPT' }))
    expect(aiChat.reload).toHaveBeenCalledOnce()

    await user.click(screen.getByRole('button', { name: 'Закрыть ИИ-чат' }))
    await waitFor(() => expect(aiChat.setOpen).toHaveBeenCalledWith({ open: false }))
  })

  it('toggles the hidden chat with Ctrl+Alt+Z in English and Russian layouts', async () => {
    Object.defineProperty(window, 'api', {
      configurable: true,
      value: { aiChat }
    })

    render(
      <TooltipProvider>
        <AiChatOverlay showLauncher={false} />
      </TooltipProvider>
    )

    expect(screen.queryByRole('button', { name: 'Открыть ИИ-чат' })).not.toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'm', ctrlKey: true })
    expect(screen.queryByTestId('ai-chat-panel')).not.toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'я', code: 'KeyZ', ctrlKey: true, altKey: true })

    expect(await screen.findByTestId('ai-chat-panel')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Открыть ИИ-чат' })).not.toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'z', code: 'KeyZ', ctrlKey: true, altKey: true })

    await waitFor(() => expect(screen.queryByTestId('ai-chat-panel')).not.toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'Открыть ИИ-чат' })).not.toBeInTheDocument()
  })
})
