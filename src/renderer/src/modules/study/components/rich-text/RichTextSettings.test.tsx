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
})
