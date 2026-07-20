import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import {
  MODULE_TREE_NODE_INSIDE_DROP_CLASS_NAME,
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
    const { container, rerender } = render(<ModuleTreeNodeDropIndicator placement="before" />)

    expect(
      container.querySelector('[data-module-tree-drop-indicator="before"]')
    ).toBeInTheDocument()

    rerender(<ModuleTreeNodeDropIndicator placement="after" />)

    expect(container.querySelector('[data-module-tree-drop-indicator="after"]')).toBeInTheDocument()

    rerender(<ModuleTreeNodeDropIndicator placement="inside" />)

    expect(container.querySelector('[data-module-tree-drop-indicator]')).not.toBeInTheDocument()
    expect(MODULE_TREE_NODE_INSIDE_DROP_CLASS_NAME).toBe(
      'bg-violet-500/15 ring-1 ring-violet-500/45'
    )
  })

  it('renders identical drag overlay shells for both module trees', () => {
    render(<ModuleTreeDragOverlay icon={<span aria-hidden="true">icon</span>} title="Элемент" />)

    expect(screen.getByText('Элемент').parentElement).toHaveAttribute(
      'data-module-tree-drag-overlay',
      'true'
    )
  })
})
