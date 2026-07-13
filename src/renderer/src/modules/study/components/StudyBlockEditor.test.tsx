import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { StudyDocument } from '../../../../../shared/contracts/study'
import { STUDY_REVEAL_BLOCK_EVENT } from '../lib/study-read-navigation'
import { StudyBlockEditor } from './StudyBlockEditor'

const studyDocument: StudyDocument = {
  version: 1,
  blocks: [{ id: 'heading-1', type: 'heading', text: 'Раздел', level: 1 }]
}

describe('StudyBlockEditor', () => {
  it('collapses and expands a block in edit mode', () => {
    render(
      <StudyBlockEditor
        materialId="material-1"
        document={studyDocument}
        mode="edit"
        onChange={vi.fn()}
      />
    )

    const headingInput = screen.getByDisplayValue('Раздел')
    const content = headingInput.closest('[data-state]')
    expect(content).toHaveAttribute('data-state', 'open')

    fireEvent.click(screen.getByRole('button', { name: 'Свернуть блок «Заголовок»' }))
    expect(content).toHaveAttribute('data-state', 'closed')

    fireEvent.click(screen.getByRole('button', { name: 'Развернуть блок «Заголовок»' }))
    expect(content).toHaveAttribute('data-state', 'open')
  })

  it('keeps a trailing divider visible when the final heading section is collapsed', () => {
    const document: StudyDocument = {
      version: 1,
      blocks: [
        { id: 'heading-trailing', type: 'heading', text: 'Раздел с разделителем', level: 1 },
        {
          id: 'text-trailing',
          type: 'text',
          text: 'Содержимое раздела',
          html: '<p>Содержимое раздела</p>'
        },
        {
          id: 'divider-trailing',
          type: 'divider',
          variant: 'dashed',
          thickness: 2,
          color: '#6d5dfc'
        }
      ]
    }

    const { container } = render(
      <StudyBlockEditor
        materialId="material-1"
        document={document}
        mode="read"
        onChange={vi.fn()}
      />
    )

    expect(
      container.querySelector('[data-study-divider-id="divider-trailing"]')
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Свернуть раздел «Раздел с разделителем»' }))
    expect(screen.queryByText('Содержимое раздела')).not.toBeInTheDocument()
    expect(
      container.querySelector('[data-study-divider-id="divider-trailing"]')
    ).toBeInTheDocument()
  })

  it('requires confirmation before deleting a block', () => {
    const onChange = vi.fn()
    render(
      <StudyBlockEditor
        materialId="material-1"
        document={studyDocument}
        mode="edit"
        onChange={onChange}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Удалить блок' }))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByText('Удалить блок?')).toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Удалить' }))
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('reveals a text block inside a collapsed heading section', async () => {
    const user = userEvent.setup()
    const document: StudyDocument = {
      version: 1,
      blocks: [
        { id: 'heading-reveal', type: 'heading', text: 'Скрытый раздел', level: 1 },
        {
          id: 'text-reveal',
          type: 'text',
          text: 'Скрытое содержимое',
          html: '<p>Скрытое содержимое</p>'
        }
      ]
    }

    render(
      <StudyBlockEditor
        materialId="material-1"
        document={document}
        mode="read"
        onChange={vi.fn()}
      />
    )

    const sectionToggle = screen.getByRole('button', { name: 'Свернуть раздел «Скрытый раздел»' })
    await user.click(sectionToggle)
    expect(sectionToggle).toHaveAttribute('aria-expanded', 'false')

    act(() => {
      window.dispatchEvent(
        new CustomEvent(STUDY_REVEAL_BLOCK_EVENT, { detail: { blockId: 'text-reveal' } })
      )
    })

    await waitFor(() => expect(sectionToggle).toHaveAttribute('aria-expanded', 'true'))
    expect(screen.getByText('Скрытое содержимое')).toBeVisible()
  })
})
