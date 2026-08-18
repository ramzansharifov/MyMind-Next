import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { StudyLatexBlock } from './StudyLatexBlock'

describe('StudyLatexBlock', () => {
  it('renders the same compact empty state as Markdown', () => {
    const { container } = render(<StudyLatexBlock mode="read" source="" />)

    expect(screen.getByText('Пустой LaTeX-блок')).toHaveClass('text-sm', 'text-[var(--app-muted)]')
    expect(container.querySelector('.study-latex-preview')).not.toBeInTheDocument()
    expect(container.querySelector('[data-framed="true"]')).not.toBeInTheDocument()
  })

  it('shows line numbers in the source editor', () => {
    const { container } = render(
      <StudyLatexBlock mode="edit" viewMode="write" source={'x = 1\ny = 2\nz = 3'} />
    )

    expect(
      Array.from(container.querySelectorAll('[data-study-source-line-number]')).map(
        (node) => node.textContent
      )
    ).toEqual(['1', '2', '3'])
  })

  it('uses the full available width for the source editor', () => {
    const { container } = render(
      <StudyLatexBlock mode="edit" viewMode="write" source={'x = 1\ny = 2'} />
    )

    expect(container.querySelector('[data-study-latex-block]')).toHaveClass('w-full')
    expect(container.querySelector('.study-source-editor-scroll')).toHaveClass('w-full')
  })

  it('uses the full available width for rendered LaTeX and preserves alignment', () => {
    const { container } = render(
      <StudyLatexBlock mode="read" source={'x = 1'} alignment="right" />
    )

    expect(container.querySelector('.study-latex-preview')).toHaveClass('w-full')
    expect(container.querySelector('.study-latex-render')).toHaveClass('w-full', 'text-right')
  })
})
