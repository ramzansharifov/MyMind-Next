import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { AppDialog } from './AppDialog'

function ControlledDialog({ busy = false }: { busy?: boolean }): React.JSX.Element {
  const [open, setOpen] = useState(true)
  return (
    <AppDialog
      open={open}
      onOpenChange={setOpen}
      title="Общий диалог"
      description="Единая оболочка"
      busy={busy}
    >
      <button type="button">Содержимое</button>
    </AppDialog>
  )
}

describe('AppDialog', () => {
  it('renders the shared overlay, compact header and content shell', () => {
    render(<ControlledDialog />)

    expect(screen.getByRole('dialog', { name: 'Общий диалог' })).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Общий диалог' })).toHaveClass('max-h-[85vh]')
    expect(screen.getByText('Единая оболочка')).toHaveClass('sr-only')
    expect(document.querySelector('[data-app-dialog-overlay]')).toBeInTheDocument()
    expect(document.querySelector('[data-app-dialog-overlay]')).toHaveClass('inset-0')
    expect(document.querySelector('[data-app-dialog-header]')).toBeInTheDocument()
    expect(document.querySelector('[data-app-dialog-body]')).toBeInTheDocument()
  })

  it('uses one close behavior for regular dialogs', async () => {
    const user = userEvent.setup()
    render(<ControlledDialog />)

    await user.click(screen.getByRole('button', { name: 'Закрыть диалог' }))
    expect(screen.queryByRole('dialog', { name: 'Общий диалог' })).not.toBeInTheDocument()
  })

  it('blocks closing while a dialog is busy', async () => {
    const user = userEvent.setup()
    render(<ControlledDialog busy />)

    const closeButton = screen.getByRole('button', { name: 'Закрыть диалог' })
    expect(closeButton).toBeDisabled()
    await user.click(closeButton)
    expect(screen.getByRole('dialog', { name: 'Общий диалог' })).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Общий диалог' })).toHaveClass('max-h-[85vh]')
  })

  it('supports a nested layer for dialogs opened from another modal', () => {
    render(
      <AppDialog
        open
        onOpenChange={vi.fn()}
        title="Вложенный диалог"
        description="Поверх основной формы"
        layer="nested"
      >
        <div>Вложенное содержимое</div>
      </AppDialog>
    )

    expect(document.querySelector('[data-app-dialog-overlay]')).toHaveClass('z-[90]')
    expect(screen.getByRole('dialog', { name: 'Вложенный диалог' })).toHaveClass('z-[91]')
  })

  it('keeps fullscreen content below the application titlebar', () => {
    const onOpenChange = vi.fn()
    render(
      <AppDialog
        open
        onOpenChange={onOpenChange}
        title="Полноэкранный просмотр"
        description="Исходный блок"
        size="fullscreen"
      >
        <div>Полноэкранное содержимое</div>
      </AppDialog>
    )

    const dialog = screen.getByRole('dialog', { name: 'Полноэкранный просмотр' })
    const overlay = document.querySelector('[data-app-dialog-overlay]')

    expect(dialog).toBeInTheDocument()
    expect(screen.getByText('Полноэкранное содержимое')).toBeInTheDocument()
    expect(document.querySelector('[data-app-dialog-header]')).not.toBeInTheDocument()
    expect(dialog).toHaveClass('app-fullscreen-bounds')
    expect(dialog).not.toHaveClass('inset-0', 'h-full')
    expect(overlay).toHaveClass('app-fullscreen-bounds')
    expect(overlay).not.toHaveClass('inset-0')
  })
})
