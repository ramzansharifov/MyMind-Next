import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { RichTextSettings } from './RichTextSettings'

describe('RichTextSettings', () => {
  it('does not crash without an active editor', () => {
    render(<RichTextSettings editor={null} />)

    expect(screen.getByText('Текстовый блок не активен')).toBeInTheDocument()
  })
})
