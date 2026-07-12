import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { StudyCodeBlock } from './StudyCodeBlock'

describe('StudyCodeBlock', () => {
  it('renders a number for every source line', () => {
    const { container } = render(
      <StudyCodeBlock
        mode="edit"
        language="javascript"
        source={['const first = 1', '', 'const third = 3', ''].join('\n')}
        onChange={vi.fn()}
      />
    )

    const lineNumbers = [...container.querySelectorAll('[data-study-code-line-number]')].map(
      (element) => element.textContent
    )

    expect(lineNumbers).toEqual(['1', '2', '3', '4'])
  })

  it('shows the first line for an empty block', () => {
    const { container } = render(<StudyCodeBlock mode="read" language="text" source="" />)

    expect(container.querySelector('[data-study-code-line-number="1"]')).toHaveTextContent('1')
  })
})
