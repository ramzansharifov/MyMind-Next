import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { StudyMarkdownBlock } from './StudyMarkdownBlock'

const markdown = `
# План

- [x] Готово
- [ ] Осталось

| Тема | Статус |
| --- | --- |
| Markdown | Готово |

[Документация](https://example.com)

<script>unsafe()</script>
`

describe('StudyMarkdownBlock', () => {
  it('renders safe GitHub Flavored Markdown', () => {
    render(<StudyMarkdownBlock mode="read" source={markdown} />)

    expect(
      screen.getByRole('heading', {
        name: 'План'
      })
    ).toBeInTheDocument()

    expect(screen.getByRole('table')).toBeInTheDocument()

    expect(screen.getAllByRole('checkbox')[0]).toBeChecked()

    expect(
      screen.getByRole('link', {
        name: 'Документация'
      })
    ).toHaveAttribute('target', '_blank')

    expect(screen.queryByText('unsafe()')).not.toBeInTheDocument()
  })
})
