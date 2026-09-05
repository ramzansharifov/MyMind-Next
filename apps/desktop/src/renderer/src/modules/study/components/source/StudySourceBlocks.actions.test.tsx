import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { StudyLatexBlock } from '../latex/StudyLatexBlock'
import { StudyMarkdownBlock } from '../markdown/StudyMarkdownBlock'
import { StudyMermaidBlock } from '../mermaid/StudyMermaidBlock'

describe('study source block actions', () => {
  it('shows copy and fullscreen controls for Markdown', () => {
    render(
      <StudyMarkdownBlock
        mode="edit"
        source="# План"
        viewMode="write"
        onChange={vi.fn()}
        onViewModeChange={vi.fn()}
      />
    )

    expect(screen.getByRole('button', { name: 'Копировать Markdown' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Развернуть Markdown-блок' })).toBeInTheDocument()
  })

  it('shows copy and fullscreen controls for LaTeX', () => {
    render(
      <StudyLatexBlock
        mode="edit"
        source={String.raw`\frac{1}{2}`}
        viewMode="write"
        onChange={vi.fn()}
        onViewModeChange={vi.fn()}
      />
    )

    expect(screen.getByRole('button', { name: 'Копировать LaTeX' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Развернуть LaTeX-блок' })).toBeInTheDocument()
  })

  it('shows copy and fullscreen controls for Mermaid', () => {
    render(
      <StudyMermaidBlock
        mode="edit"
        source="flowchart LR\nA --> B"
        viewMode="write"
        onChange={vi.fn()}
        onViewModeChange={vi.fn()}
      />
    )

    expect(screen.getByRole('button', { name: 'Копировать Mermaid-код' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Развернуть Mermaid-блок' })).toBeInTheDocument()
  })
})
