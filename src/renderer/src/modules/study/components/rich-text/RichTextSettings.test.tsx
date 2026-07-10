import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { RichTextSettings } from './RichTextSettings'

describe('RichTextSettings', () => {
  it('shows a compact empty state without an active editor', () => {
    render(<RichTextSettings editor={null} />)

    expect(screen.getByText('Выбери текстовый блок')).toBeInTheDocument()
  })
})
