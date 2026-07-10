import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { StudyDocument } from '../../../../../shared/contracts/study'
import { StudyBlockEditor } from './StudyBlockEditor'

const studyDocument: StudyDocument = {
  version: 1,
  blocks: [
    {
      id: 'heading-1',
      type: 'heading',
      text: 'Раздел',
      level: 1
    }
  ]
}

describe('StudyBlockEditor', () => {
  it('collapses and expands a block in edit mode', () => {
    render(<StudyBlockEditor document={studyDocument} mode="edit" onChange={vi.fn()} />)

    const headingInput = screen.getByDisplayValue('Раздел')

    const content = headingInput.closest('[data-state]')

    expect(content).toHaveAttribute('data-state', 'open')

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Свернуть блок «Заголовок»'
      })
    )

    expect(content).toHaveAttribute('data-state', 'closed')

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Развернуть блок «Заголовок»'
      })
    )

    expect(content).toHaveAttribute('data-state', 'open')
  })
})
