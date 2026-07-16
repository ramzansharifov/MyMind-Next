import { Editor } from '@tiptap/core'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'

import { TooltipProvider } from '../../../../shared/ui/tooltip'
import { createRichTextExtensions } from './extensions'
import { RichTextSettings } from './RichTextSettings'

let editor: Editor | null = null

afterEach(() => {
  editor?.destroy()
  editor = null
})

describe('RichTextSettings', () => {
  it('shows a compact empty state without an active editor', () => {
    render(<RichTextSettings editor={null} />)

    expect(screen.getByText('Выбери текстовый блок')).toBeInTheDocument()
  })

  it('keeps quote formatting in the text section and toggles the active paragraph', async () => {
    const user = userEvent.setup()

    editor = new Editor({
      extensions: createRichTextExtensions(false),
      content: '<p>Важная мысль</p>'
    })

    render(
      <TooltipProvider>
        <RichTextSettings editor={editor} />
      </TooltipProvider>
    )

    const textSection = screen.getByRole('heading', { name: 'Текст' }).closest('section')

    expect(textSection).not.toBeNull()
    expect(screen.queryByRole('heading', { name: 'Абзац' })).not.toBeInTheDocument()

    const quoteControl = within(textSection!).getByRole('radio', {
      name: 'Цитата'
    })

    expect(quoteControl).toHaveAttribute('aria-checked', 'false')

    await user.click(quoteControl)

    expect(editor.isActive('blockquote')).toBe(true)
    expect(editor.getHTML()).toContain('<blockquote><p>Важная мысль</p></blockquote>')
    expect(quoteControl).toHaveAttribute('aria-checked', 'true')

    await user.click(quoteControl)

    expect(editor.isActive('blockquote')).toBe(false)
    expect(editor.getHTML()).not.toContain('<blockquote>')
    expect(editor.getHTML()).toContain('<p>Важная мысль</p>')
    expect(quoteControl).toHaveAttribute('aria-checked', 'false')
  })

  it('keeps internal and regular link actions in one row', () => {
    editor = new Editor({
      extensions: createRichTextExtensions(false),
      content: '<p>Текст со ссылкой</p>'
    })

    render(
      <TooltipProvider>
        <RichTextSettings editor={editor} />
      </TooltipProvider>
    )

    const linksSection = screen.getByRole('heading', { name: 'Ссылки' }).closest('section')

    expect(linksSection).not.toBeNull()
    expect(screen.queryByRole('heading', { name: 'Внутренняя ссылка' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Ссылка' })).not.toBeInTheDocument()

    const actions = within(linksSection!).getByTestId('link-actions')

    expect(actions).toHaveClass('grid-cols-2')
    expect(
      within(actions).getByRole('button', { name: 'Создать внутреннюю ссылку' })
    ).toBeInTheDocument()
    expect(
      within(actions).getByRole('button', { name: 'Добавить обычную ссылку' })
    ).toBeInTheDocument()
  })
})
