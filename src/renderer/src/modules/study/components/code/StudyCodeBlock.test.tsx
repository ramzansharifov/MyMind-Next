import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { StudyCodeBlock } from './StudyCodeBlock'

describe('StudyCodeBlock', () => {
  it('renders a number for every source line through the shared source gutter', () => {
    const { container } = render(
      <StudyCodeBlock
        mode="edit"
        language="javascript"
        source={['const first = 1', '', 'const third = 3', ''].join('\n')}
        onChange={vi.fn()}
      />
    )

    const lineNumbers = [...container.querySelectorAll('[data-study-source-line-number]')].map(
      (element) => element.textContent
    )

    expect(lineNumbers).toEqual(['1', '2', '3', '4'])
    expect(container.querySelector('[data-study-source-line-numbers]')).toBeInTheDocument()
    expect(container.querySelector('.study-source-editor-body')).toBeInTheDocument()
    expect(container.querySelector('.study-source-editor__editor')).toBeInTheDocument()
  })

  it('removes one legacy framing line before numbering and editing code', () => {
    const onChange = vi.fn()
    const { container } = render(
      <StudyCodeBlock
        mode="edit"
        language="sql"
        source={'\nBEGIN;\n\nCOMMIT;'}
        onChange={onChange}
      />
    )

    const lineNumbers = [...container.querySelectorAll('[data-study-source-line-number]')].map(
      (element) => element.textContent
    )

    expect(lineNumbers).toEqual(['1', '2', '3'])
    expect(screen.getByRole('textbox')).toHaveValue('BEGIN;\n\nCOMMIT;')
    expect(onChange).toHaveBeenCalledWith('BEGIN;\n\nCOMMIT;')
  })

  it('shows the first line for an empty block', () => {
    const { container } = render(<StudyCodeBlock mode="read" language="text" source="" />)

    expect(container.querySelector('[data-study-source-line-number="1"]')).toHaveTextContent('1')
  })

  it('uses a horizontally scrollable code viewport', () => {
    const { container } = render(
      <StudyCodeBlock
        mode="read"
        language="javascript"
        source={`const longValue = '${'value-'.repeat(80)}'`}
      />
    )

    expect(container.querySelector('[data-study-code-scroll]')).toHaveClass('overflow-x-auto')
  })

  it('opens and closes the fullscreen code view', async () => {
    const user = userEvent.setup()

    render(<StudyCodeBlock mode="read" language="javascript" source="const fullscreen = true" />)

    await user.click(
      screen.getByRole('button', {
        name: 'Развернуть блок кода'
      })
    )

    const dialog = screen.getByRole('dialog', {
      name: 'Блок кода на весь экран'
    })

    expect(
      dialog.querySelector('[data-study-code-block][data-fullscreen="true"]')
    ).toBeInTheDocument()
    expect(dialog.querySelector('.study-source-editor-body[data-fullscreen="true"]')).toBeInTheDocument()

    await user.click(
      within(dialog).getByRole('button', {
        name: 'Свернуть блок кода'
      })
    )

    expect(
      screen.queryByRole('dialog', {
        name: 'Блок кода на весь экран'
      })
    ).not.toBeInTheDocument()
  })
})
