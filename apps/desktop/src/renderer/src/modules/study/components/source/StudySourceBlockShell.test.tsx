import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { StudySourceBlockShell } from './StudySourceBlockShell'

const originalClipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard')

afterEach(() => {
  if (originalClipboardDescriptor) {
    Object.defineProperty(navigator, 'clipboard', originalClipboardDescriptor)
  } else {
    Reflect.deleteProperty(navigator, 'clipboard')
  }

  vi.restoreAllMocks()
})

describe('StudySourceBlockShell', () => {
  it('copies source and opens and closes the fullscreen view', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText
      }
    })

    render(
      <StudySourceBlockShell
        source="# Заголовок"
        copyLabel="Копировать Markdown"
        copiedAnnouncement="Markdown скопирован"
        copyErrorAnnouncement="Не удалось скопировать Markdown"
        expandLabel="Развернуть Markdown-блок"
        collapseLabel="Свернуть Markdown-блок"
        dialogTitle="Markdown-блок на весь экран"
        dialogDescription="Полноэкранное редактирование Markdown."
      >
        {({ fullscreen, actions }) => (
          <section data-fullscreen={fullscreen ? 'true' : 'false'}>
            <div>{actions}</div>
          </section>
        )}
      </StudySourceBlockShell>
    )

    await user.click(screen.getByRole('button', { name: 'Копировать Markdown' }))

    expect(writeText).toHaveBeenCalledWith('# Заголовок')
    expect(await screen.findByRole('button', { name: 'Скопировано' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Развернуть Markdown-блок' }))

    const dialog = screen.getByRole('dialog', {
      name: 'Markdown-блок на весь экран'
    })

    expect(dialog.querySelector('[data-fullscreen="true"]')).toBeInTheDocument()

    await user.click(
      within(dialog).getByRole('button', {
        name: 'Свернуть Markdown-блок'
      })
    )

    expect(
      screen.queryByRole('dialog', {
        name: 'Markdown-блок на весь экран'
      })
    ).not.toBeInTheDocument()
  })
})
