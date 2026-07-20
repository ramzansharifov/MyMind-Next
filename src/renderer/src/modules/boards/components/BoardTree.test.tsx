import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { BoardNode } from '../../../../../shared/contracts/boards'

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: ReactNode }) => children,
  DragOverlay: ({ children }: { children: ReactNode }) => children,
  PointerSensor: class PointerSensor {},
  pointerWithin: vi.fn(),
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    isDragging: false
  }),
  useDroppable: () => ({
    setNodeRef: vi.fn(),
    isOver: false
  }),
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn(() => [])
}))

vi.mock('../../../shared/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: ReactNode }) => children
}))

import { BoardTree } from './BoardTree'

const folder: BoardNode = {
  id: 'folder-1',
  type: 'folder',
  parentId: null,
  title: 'Папка',
  position: 0,
  isExpanded: true,
  isSystem: false,
  createdAt: 1,
  updatedAt: 1
}

const board: BoardNode = {
  id: 'board-1',
  type: 'board',
  parentId: folder.id,
  title: 'Доска',
  position: 0,
  isExpanded: false,
  isSystem: false,
  createdAt: 1,
  updatedAt: 1
}

function renderTree(onRename = vi.fn()): void {
  render(
    <BoardTree
      nodes={[folder, board]}
      selectedNodeId={board.id}
      collapsed={false}
      onOpen={vi.fn()}
      onToggle={vi.fn()}
      onRename={onRename}
      onDelete={vi.fn()}
      onCreate={vi.fn()}
      onSelectRoot={vi.fn()}
      onMove={vi.fn()}
    />
  )
}

describe('BoardTree sidebar interactions', () => {
  it('uses full-width compact rows and hover-only nesting guides', () => {
    renderTree()

    const folderRow = document.querySelector('[data-board-tree-node="folder-1"]')
    const boardRow = document.querySelector('[data-board-tree-node="board-1"]')

    expect(folderRow).toHaveClass('h-8', 'w-full', 'rounded-none')
    expect(folderRow).toHaveStyle({ paddingLeft: '2px' })
    expect(boardRow).toHaveStyle({ paddingLeft: '18px' })
    expect(screen.getByRole('button', { name: 'Свернуть папку' })).toHaveClass('size-5', 'p-0')
    expect(folderRow?.querySelector('[data-board-tree-guide="folder"]')).toBeInTheDocument()
    expect(boardRow?.querySelector('[data-board-tree-guide="ancestor"]')).toBeInTheDocument()
  })

  it('opens the same actions by right click and colors the rename icon with the accent palette', async () => {
    const user = userEvent.setup()
    const onRename = vi.fn()
    renderTree(onRename)

    fireEvent.contextMenu(screen.getByRole('button', { name: 'Папка' }))

    const renameItem = await screen.findByRole('menuitem', { name: 'Переименовать' })
    const renameIcon = renameItem.querySelector('svg')

    expect(renameItem).toHaveAttribute('data-board-tree-action', 'rename')
    expect(renameIcon).toHaveClass('text-violet-300')

    await user.click(renameItem)
    expect(onRename).toHaveBeenCalledWith(folder)
  })
})
