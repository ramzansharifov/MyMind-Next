import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { StudyDocument } from '../../../../../shared/contracts/study'
import { StudyBlockEditor } from './StudyBlockEditor'

describe('StudyBlockEditor heading layout', () => {
  it('aligns a heading and paints only the text when text background scope is selected', () => {
    const document: StudyDocument = {
      version: 1,
      blocks: [
        {
          id: 'heading-text-background',
          type: 'heading',
          text: 'Центральный заголовок',
          level: 1,
          alignment: 'center',
          backgroundScope: 'text',
          backgroundColor: '#4c1d95'
        }
      ]
    }

    const { container } = render(
      <StudyBlockEditor
        materialId="material-heading"
        document={document}
        mode="read"
        onChange={vi.fn()}
      />
    )

    const heading = container.querySelector<HTMLElement>(
      '[data-study-heading-id="heading-text-background"]'
    )
    const highlight = heading?.querySelector<HTMLElement>('[data-study-heading-background="text"]')

    expect(heading).toHaveStyle({ textAlign: 'center', backgroundColor: 'transparent' })
    expect(highlight).toHaveStyle({ backgroundColor: '#4c1d95' })
  })

  it('keeps the legacy full-container background and supports right alignment', () => {
    const document: StudyDocument = {
      version: 1,
      blocks: [
        {
          id: 'heading-container-background',
          type: 'heading',
          text: 'Правый заголовок',
          level: 2,
          alignment: 'right',
          backgroundScope: 'container',
          backgroundColor: '#1e3a8a'
        }
      ]
    }

    const { container } = render(
      <StudyBlockEditor
        materialId="material-heading"
        document={document}
        mode="read"
        onChange={vi.fn()}
      />
    )

    const heading = container.querySelector<HTMLElement>(
      '[data-study-heading-id="heading-container-background"]'
    )

    expect(heading).toHaveStyle({ textAlign: 'right', backgroundColor: '#1e3a8a' })
  })

  it('uses a text-only mirror in edit mode without painting the textarea container', () => {
    const document: StudyDocument = {
      version: 1,
      blocks: [
        {
          id: 'heading-edit-highlight',
          type: 'heading',
          text: 'Подсвеченный текст',
          level: 3,
          alignment: 'center',
          backgroundScope: 'text',
          backgroundColor: '#713f12'
        }
      ]
    }

    const { container } = render(
      <StudyBlockEditor
        materialId="material-heading"
        document={document}
        mode="edit"
        onChange={vi.fn()}
      />
    )

    const textarea = screen.getByRole('textbox', { name: 'Текст заголовка' })
    const mirror = container.querySelector<HTMLElement>('[data-study-heading-edit-highlight]')

    expect(textarea).toHaveStyle({ textAlign: 'center', backgroundColor: 'transparent' })
    expect(mirror).toBeInTheDocument()
    expect(mirror?.querySelector('span')).toHaveStyle({ backgroundColor: '#713f12' })
  })
})
