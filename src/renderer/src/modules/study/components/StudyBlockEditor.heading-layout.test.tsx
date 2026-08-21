import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { StudyDocument } from '../../../../../shared/contracts/study'
import { StudyBlockEditor } from './StudyBlockEditor'

describe('StudyBlockEditor heading layout', () => {
  it('aligns a heading and paints only the rounded text background when text scope is selected', () => {
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
    expect(heading).toHaveClass('rounded-lg')
    expect(highlight).toHaveStyle({ backgroundColor: '#4c1d95' })
    expect(highlight).toHaveClass('rounded-lg')
  })

  it('paints the rounded full heading container and supports right alignment', () => {
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
    expect(heading).toHaveClass('rounded-lg')
    expect(heading?.querySelector('[data-study-heading-background="text"]')).not.toBeInTheDocument()
  })

  it('uses a rounded text-only mirror in edit mode without painting the textarea container', () => {
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
    const highlight = mirror?.querySelector<HTMLElement>('span')

    expect(textarea).toHaveStyle({ textAlign: 'center', backgroundColor: 'transparent' })
    expect(textarea).toHaveClass('rounded-lg')
    expect(mirror).toBeInTheDocument()
    expect(highlight).toHaveStyle({ backgroundColor: '#713f12' })
    expect(highlight).toHaveClass('rounded-lg')
  })

  it('paints the rounded textarea container in edit mode when full background is selected', () => {
    const document: StudyDocument = {
      version: 1,
      blocks: [
        {
          id: 'heading-edit-container',
          type: 'heading',
          text: 'Весь контейнер',
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
        mode="edit"
        onChange={vi.fn()}
      />
    )

    const textarea = screen.getByRole('textbox', { name: 'Текст заголовка' })

    expect(textarea).toHaveStyle({ textAlign: 'right', backgroundColor: '#1e3a8a' })
    expect(textarea).toHaveClass('rounded-lg')
    expect(container.querySelector('[data-study-heading-edit-highlight]')).not.toBeInTheDocument()
  })
})
