import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { OperationFeedback } from '../../../../shared/contracts/system'

const toastMocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn()
}))

vi.mock('react-toastify', () => ({
  ToastContainer: () => <div data-testid="toast-container" />,
  toast: {
    success: toastMocks.success,
    error: toastMocks.error
  }
}))

import { AppToastNotifications } from './AppToastNotifications'

describe('AppToastNotifications', () => {
  let listener: ((feedback: OperationFeedback) => void) | null

  beforeEach(() => {
    listener = null
    toastMocks.success.mockReset()
    toastMocks.error.mockReset()

    Object.defineProperty(window, 'api', {
      configurable: true,
      value: {
        system: {
          onOperationFeedback: (nextListener: (feedback: OperationFeedback) => void) => {
            listener = nextListener
            return () => {
              listener = null
            }
          }
        }
      }
    })
  })

  it('shows success and error feedback through Toastify', () => {
    render(<AppToastNotifications />)
    expect(screen.getByTestId('toast-container')).toBeInTheDocument()

    act(() => {
      listener?.({ kind: 'success', message: 'Задача создана', key: 'tasks:create-task' })
      listener?.({ kind: 'error', message: 'Не удалось сохранить', key: 'tasks:update-task' })
    })

    expect(toastMocks.success).toHaveBeenCalledWith(
      'Задача создана',
      expect.objectContaining({ toastId: 'success:tasks:create-task:Задача создана' })
    )
    expect(toastMocks.error).toHaveBeenCalledWith(
      'Не удалось сохранить',
      expect.objectContaining({ toastId: 'error:tasks:update-task:Не удалось сохранить' })
    )
  })

  it('does not duplicate an active error toast', () => {
    render(<AppToastNotifications />)

    act(() => {
      listener?.({ kind: 'error', message: 'Ошибка', key: 'music:update-item' })
      listener?.({ kind: 'error', message: 'Ошибка', key: 'music:update-item' })
    })

    expect(toastMocks.error).toHaveBeenCalledTimes(1)
  })
})
