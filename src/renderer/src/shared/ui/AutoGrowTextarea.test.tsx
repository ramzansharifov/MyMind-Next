import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AutoGrowTextarea } from './AutoGrowTextarea'

describe('AutoGrowTextarea background modes', () => {
  it('keeps the textarea transparent and paints the background only behind mirrored text in inline mode', () => {
    render(
      <AutoGrowTextarea
        value="Выделенный заголовок"
        backgroundMode="inline"
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

    expect((textarea as HTMLTextAreaElement).style.backgroundColor).toBe('transparent')
    expect(mirror).toHaveAttribute('aria-hidden', 'true')
    expect(mirror).toHaveStyle({ color: 'transparent', backgroundColor: 'transparent' })
    expect(mark).toHaveTextContent('Выделенный заголовок')
    expect(mark).toHaveStyle({ backgroundColor: '#4c1d95' })
  })

  it('keeps the background on the textarea itself in container mode', () => {
    const { container } = render(
      <AutoGrowTextarea
        value="Фон всего блока"
        backgroundMode="container"
        aria-label="Заголовок с фоном блока"
        className="rounded-lg"
        style={{ backgroundColor: '#1e3a8a', color: '#ffffff' }}
        onChange={vi.fn()}
      />
    )

    const textarea = screen.getByRole('textbox', { name: 'Заголовок с фоном блока' })

    expect(textarea).toHaveStyle({ backgroundColor: '#1e3a8a' })
    expect(textarea).toHaveClass('rounded-lg')
    expect(container.querySelector('.auto-grow-textarea-inline-background__mirror')).toBeNull()
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
