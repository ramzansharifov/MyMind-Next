import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { StudyMermaidBlock } from './StudyMermaidBlock'

vi.mock('./mermaid-renderer', () => ({
  getStudyMermaidErrorMessage: (reason: unknown) => String(reason),
  renderStudyMermaid: vi.fn(async () => ({
    svg: '<svg viewBox="0 0 100 100"><rect width="100" height="100" /></svg>',
    diagramType: 'flowchart'
  }))
}))

describe('StudyMermaidBlock interactive reader', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('uses the code surface and supports fullscreen zoom and pan in read mode', async () => {
    const { container } = render(
      <StudyMermaidBlock mode="read" source="flowchart LR\n  A --> B" scale={100} />
    )

    expect(container.querySelector('[data-study-mermaid-block][data-mode="read"]')).toHaveClass(
      'bg-[var(--app-code-surface)]'
    )

    await act(async () => {
      vi.advanceTimersByTime(320)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(container.querySelector('.study-mermaid-svg svg')).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Развернуть Mermaid-блок'
      })
    )

    const dialog = screen.getByRole('dialog', {
      name: 'Mermaid-блок на весь экран'
    })

    fireEvent.click(
      within(dialog).getByRole('button', {
        name: 'Увеличить масштаб Mermaid'
      })
    )

    expect(within(dialog).getByText('120%')).toBeInTheDocument()

    const viewport = within(dialog).getByRole('region', {
      name: 'Интерактивная область Mermaid'
    })

    fireEvent.pointerDown(viewport, {
      pointerId: 1,
      button: 0,
      clientX: 20,
      clientY: 30
    })
    fireEvent.pointerMove(viewport, {
      pointerId: 1,
      clientX: 65,
      clientY: 70
    })
    fireEvent.pointerUp(viewport, {
      pointerId: 1,
      clientX: 65,
      clientY: 70
    })

    expect(viewport).toHaveAttribute('data-pan-x', '45')
    expect(viewport).toHaveAttribute('data-pan-y', '40')
  })
})
