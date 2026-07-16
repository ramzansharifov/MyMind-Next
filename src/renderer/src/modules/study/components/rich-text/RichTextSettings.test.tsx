import { Editor } from '@tiptap/core'
import { render, screen } from '@testing-library/react'
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

  it('toggles quote formatting for the active paragraph', async () => {
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

    const quoteButton = screen.getByRole('button', {
      name: 'Цитата'
    })

    expect(quoteButton).toHaveAttribute('data-state', 'off')

    await user.click(quoteButton)

    expect(editor.isActive('blockquote')).toBe(true)
    expect(editor.getHTML()).toBe('<blockquote><p>Важная мысль</p></blockquote>')
    expect(quoteButton).toHaveAttribute('data-state', 'on')

    await user.click(quoteButton)

    expect(editor.isActive('blockquote')).toBe(false)
    expect(editor.getHTML()).toBe('<p>Важная мысль</p>')
    expect(quoteButton).toHaveAttribute('data-state', 'off')
  })
})
