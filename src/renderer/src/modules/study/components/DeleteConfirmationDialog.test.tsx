import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DeleteConfirmationDialog } from './DeleteConfirmationDialog'

afterEach(() => {
  cleanup()
})

describe('DeleteConfirmationDialog', () => {
  it('requests confirmation without closing the controlled dialog itself', () => {
    const onConfirm = vi.fn()
    const onOpenChange = vi.fn()

    render(
      <DeleteConfirmationDialog
        open
        title="Удалить материал?"
        subject="Материал"
        description="Материал будет удалён."
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
      />
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Удалить'
      })
    )

    expect(onConfirm).toHaveBeenCalledOnce()

    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('supports the Shift+Enter confirmation shortcut while idle', () => {
    const onConfirm = vi.fn()

    render(
      <DeleteConfirmationDialog
        open
        title="Удалить материал?"
        description="Материал будет удалён."
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
      />
    )

    fireEvent.keyDown(screen.getByRole('alertdialog'), {
      key: 'Enter',
      shiftKey: true,
      altKey: false,
      ctrlKey: false,
      metaKey: false
    })

    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('disables cancellation and repeated confirmation while deletion is pending', () => {
    const onConfirm = vi.fn()

    render(
      <DeleteConfirmationDialog
        open
        title="Удалить материал?"
        description="Материал будет удалён."
        isSubmitting
        error="Удаление ещё выполняется."
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
      />
    )

    const dialog = screen.getByRole('alertdialog')

    expect(dialog).toHaveAttribute('aria-busy', 'true')

    expect(
      screen.getByRole('button', {
        name: 'Отмена'
      })
    ).toBeDisabled()

    const submitButton = screen.getByRole('button', {
      name: 'Удаляем…'
    })

    expect(submitButton).toBeDisabled()

    fireEvent.click(submitButton)

    fireEvent.keyDown(dialog, {
      key: 'Enter',
      shiftKey: true,
      altKey: false,
      ctrlKey: false,
      metaKey: false
    })

    expect(onConfirm).not.toHaveBeenCalled()

    expect(screen.getByRole('alert')).toHaveTextContent('Удаление ещё выполняется.')
  })
})
