import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('./tooltip', () => ({
  Tooltip: ({ children }: { children: ReactNode }) => children
}))

import { ModuleTreeNodeRow, type ModuleTreeActionEntry } from './ModuleTreeNodeRow'

function renderRow({
  moduleKind = 'study',
  isFolder = false,
  isSelected = true,
  isContextActive = false,
  collapsed = false,
  actions = []
}: {
  moduleKind?: 'study' | 'board'
  isFolder?: boolean
  isSelected?: boolean
  isContextActive?: boolean
  collapsed?: boolean
  actions?: ModuleTreeActionEntry[]
} = {}) {
  const onOpen = vi.fn()
  const onToggle = vi.fn()

  render(
    <ModuleTreeNodeRow
      moduleKind={moduleKind}
      nodeId="node-1"
      title="Тестовый узел"
      nodeTypeLabel={isFolder ? 'Папка' : 'Материал'}
      depth={1}
      collapsed={collapsed}
      isLastSibling={false}
      isFolder={isFolder}
      isExpanded={isFolder}
      hasVisibleChildren={isFolder}
      isSelected={isSelected}
      isContextActive={isContextActive}
      dropPlacement={null}
      icon={<span data-testid="node-icon" />}
      actions={actions}
      openAriaLabel="Открыть тестовый узел"
      onOpen={onOpen}
      onToggle={onToggle}
    />
  )

  return { onOpen, onToggle }
}

describe('ModuleTreeNodeRow', () => {
  it('owns shared row geometry and exposes semantic state', async () => {
    const user = userEvent.setup()
    const { onOpen } = renderRow({ isSelected: true })

    const row = document.querySelector('[data-module-tree-node="study"]')

    expect(row).toHaveAttribute('data-study-tree-node-id', 'node-1')
    expect(row).toHaveAttribute('data-selected', 'true')
    expect(row).toHaveAttribute('data-context-active', 'false')
    expect(row).toHaveClass('h-8', 'w-full', 'rounded-none')
    expect(row).toHaveStyle({ paddingLeft: '18px' })

    await user.click(screen.getByRole('button', { name: 'Открыть тестовый узел' }))
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('renders folder controls and shared nesting guides', async () => {
    const user = userEvent.setup()
    const { onToggle } = renderRow({ isFolder: true, isSelected: false, isContextActive: true })

    const row = document.querySelector('[data-module-tree-node="study"]')

    expect(row).toHaveAttribute('data-context-active', 'true')
    expect(row?.querySelector('[data-module-tree-guide="ancestor"]')).toBeInTheDocument()
    expect(row?.querySelector('[data-module-tree-guide="folder"]')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Свернуть папку' }))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('uses one action menu implementation while preserving module metadata', async () => {
    const user = userEvent.setup()
    const onRename = vi.fn()
    const actions: ModuleTreeActionEntry[] = [
      {
        kind: 'item',
        key: 'rename',
        label: 'Переименовать',
        icon: <span data-testid="rename-icon" />,
        onSelect: onRename
      }
    ]

    renderRow({ moduleKind: 'board', actions })

    fireEvent.contextMenu(screen.getByRole('button', { name: 'Открыть тестовый узел' }))

    const renameItem = await screen.findByRole('menuitem', { name: 'Переименовать' })

    expect(renameItem).toHaveAttribute('data-module-tree-action', 'rename')
    expect(renameItem).toHaveAttribute('data-board-tree-action', 'rename')

    await user.click(renameItem)
    expect(onRename).toHaveBeenCalledTimes(1)
  })

  it('does not render action controls when the adapter provides no actions', () => {
    renderRow({ actions: [] })

    expect(screen.queryByRole('button', { name: 'Действия: Тестовый узел' })).not.toBeInTheDocument()
  })
})
