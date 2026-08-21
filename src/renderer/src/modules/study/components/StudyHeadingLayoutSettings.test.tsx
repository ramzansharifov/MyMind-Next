import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { StudyHeadingBlock } from '../../../../../shared/contracts/study'
import { StudyHeadingLayoutSettings } from './StudyHeadingLayoutSettings'

const heading: StudyHeadingBlock = {
  id: 'heading-settings',
  type: 'heading',
  text: 'Заголовок',
  level: 1,
  alignment: 'left',
  backgroundScope: 'text',
  backgroundColor: '#7c3aed'
}

describe('StudyHeadingLayoutSettings', () => {
  it('offers left, center and right alignment controls', () => {
    const onChange = vi.fn()

    render(<StudyHeadingLayoutSettings block={heading} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Центр' }))
    expect(onChange).toHaveBeenCalledWith({ ...heading, alignment: 'center' })

    fireEvent.click(screen.getByRole('button', { name: 'Справа' }))
    expect(onChange).toHaveBeenCalledWith({ ...heading, alignment: 'right' })
  })

  it('switches between text-only and full-container background', () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <StudyHeadingLayoutSettings block={heading} onChange={onChange} />
    )

    expect(screen.getByText('Область фона')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Весь блок' }))
    expect(onChange).toHaveBeenCalledWith({ ...heading, backgroundScope: 'container' })

    const containerHeading = { ...heading, backgroundScope: 'container' as const }
    rerender(<StudyHeadingLayoutSettings block={containerHeading} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Текст' }))
    expect(onChange).toHaveBeenCalledWith({ ...containerHeading, backgroundScope: 'text' })
  })
})
