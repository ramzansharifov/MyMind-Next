import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import {
  getModuleTreeNodeDropContainerClassName,
  ModuleTreeDragOverlay,
  ModuleTreeNodeDropIndicator,
  ModuleTreeRootDropZone
} from './ModuleTreeDndFeedback'

describe('ModuleTreeDndFeedback', () => {
  it('uses the boards root-zone design while preserving the contextual hover label', () => {
    const { rerender } = render(
      <ModuleTreeRootDropZone
        dropRef={vi.fn()}
        active={false}
        highlighted={false}
        isContextActive
        collapsed={false}
        ariaLabel="Выбрать корень библиотеки"
        idleLabel="Корень библиотеки"
        activeLabel="Переместить в корень"
        onSelect={vi.fn()}
      />
    )

    const rootZone = screen.getByRole('button', { name: 'Выбрать корень библиотеки' })

    expect(rootZone).toHaveTextContent('Корень библиотеки')
    expect(rootZone).toHaveClass('border-transparent', 'text-transparent')
    expect(rootZone).toHaveAttribute('aria-pressed', 'true')

    rerender(
      <ModuleTreeRootDropZone
        dropRef={vi.fn()}
        active
        highlighted={false}
        isContextActive={false}
        collapsed={false}
        ariaLabel="Выбрать корень библиотеки"
        idleLabel="Корень библиотеки"
        activeLabel="Переместить в корень"
        onSelect={vi.fn()}
      />
    )

    expect(rootZone).toHaveTextContent('Переместить в корень')
    expect(rootZone).toHaveClass('border-dashed', 'border-[var(--app-border)]')

    rerender(
      <ModuleTreeRootDropZone
        dropRef={vi.fn()}
        active
        highlighted
        isContextActive={false}
        collapsed={false}
        ariaLabel="Выбрать корень библиотеки"
        idleLabel="Корень библиотеки"
        activeLabel="Переместить в корень"
        onSelect={vi.fn()}
      />
    )

    expect(rootZone).toHaveClass('border-violet-400', 'bg-violet-500/10', 'text-violet-200')
  })

  it('shares the study insertion feedback for before, inside, and after placements', () => {
    const { rerender } = render(<ModuleTreeNodeDropIndicator placement="before" />)

    expect(screen.getByTestId('drop-feedback-host').querySelector('[data-module-tree-drop-indicator]'))
  })

  it('renders identical drag overlay shells for both module trees', () => {
    render(<ModuleTreeDragOverlay icon={<span aria-hidden="true">icon</span>} title="Элемент" />)

    expect(screen.getByText('Элемент').parentElement).toHaveAttribute(
      'data-module-tree-drag-overlay',
      'true'
    )
    expect(getModuleTreeNodeDropContainerClassName('inside')).toBe(
      'bg-violet-500/15 ring-1 ring-violet-500/45'
    )
    expect(getModuleTreeNodeDropContainerClassName('before')).toBeUndefined()
  })
})
