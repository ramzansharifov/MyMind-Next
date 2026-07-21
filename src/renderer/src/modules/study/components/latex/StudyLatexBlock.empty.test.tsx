import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { StudyLatexBlock } from './StudyLatexBlock'

describe('StudyLatexBlock empty reader', () => {
  it('renders the same compact empty state as Markdown', () => {
    const { container } = render(<StudyLatexBlock mode="read" source="" />)

    expect(screen.getByText('Пустой LaTeX-блок')).toHaveClass(
      'text-sm',
      'text-[var(--app-muted)]'
    )
    expect(container.querySelector('.study-latex-preview')).not.toBeInTheDocument()
    expect(container.querySelector('[data-framed="true"]')).not.toBeInTheDocument()
  })
})
