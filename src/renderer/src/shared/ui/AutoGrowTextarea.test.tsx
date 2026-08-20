import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AutoGrowTextarea } from './AutoGrowTextarea'

describe('AutoGrowTextarea inline background', () => {
  it('keeps the textarea transparent and paints the background only behind mirrored text', () => {
    render(
      <AutoGrowTextarea
        value="Выделенный заголовок"
        aria-label="Текст заголовка"
        style={{ backgroundColor: '#4c1d95', color: '#ffffff', fontSize: '2rem' }}
        onChange={vi.fn()}
      />
    )

    const textarea = screen.getByRole('textbox', { name: 'Текст заголовка' })
    const mirror = textarea.parentElement?.querySelector<HTMLElement>(
      '.auto-grow-textarea-inline-background__mirror'
    )
    const mark = mirror?.querySelector<HTMLElement>('.auto-grow-textarea-inline-background__mark')

    expect(textarea).toHaveStyle({ backgroundColor: 'transparent' })
    expect(mirror).toHaveAttribute('aria-hidden', 'true')
    expect(mirror).toHaveStyle({ color: 'transparent', backgroundColor: 'transparent' })
    expect(mark).toHaveTextContent('Выделенный заголовок')
    expect(mark).toHaveStyle({ backgroundColor: '#4c1d95' })
  })

  it('preserves the original textarea path when no text background is configured', () => {
    const onChange = vi.fn()

    const { container } = render(
      <AutoGrowTextarea
        value="Обычный текст"
        aria-label="Обычное поле"
        style={{ backgroundColor: 'transparent' }}
        onChange={onChange}
      />
    )

    const textarea = screen.getByRole('textbox', { name: 'Обычное поле' })

    expect(container.querySelector('.auto-grow-textarea-inline-background__mirror')).toBeNull()

    fireEvent.change(textarea, { target: { value: 'Новый текст' } })
    expect(onChange).toHaveBeenCalledTimes(1)
  })
})
