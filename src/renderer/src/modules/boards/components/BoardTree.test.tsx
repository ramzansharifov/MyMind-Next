import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { BOARD_SYSTEM_ROOT_ID, type BoardNode } from '../../../../../shared/contracts/boards'

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
  icon: 'science',
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
  it('uses the shared compact row and nesting guide geometry', () => {
    renderTree()

    const folderRow = document.querySelector('[data-board-tree-node="folder-1"]')
    const boardRow = document.querySelector('[data-board-tree-node="board-1"]')

    expect(folderRow).toHaveAttribute('data-module-tree-node', 'board')
    expect(boardRow).toHaveAttribute('data-selected', 'true')
    expect(folderRow).toHaveClass('h-8', 'w-full', 'rounded-none')
    expect(folderRow).toHaveStyle({ paddingLeft: '2px' })
    expect(boardRow).toHaveStyle({ paddingLeft: '18px' })
    expect(screen.getByRole('button', { name: 'Свернуть папку' })).toHaveClass('size-5', 'p-0')
    expect(folderRow?.querySelector('[data-board-tree-guide="folder"]')).toBeInTheDocument()
    expect(boardRow?.querySelector('[data-board-tree-guide="ancestor"]')).toBeInTheDocument()
    expect(folderRow?.querySelector('[data-folder-icon-name="science"]')).toBeInTheDocument()
  })

  it('uses open and closed states for the default folder icon', () => {
    const closedFolder = {
      ...folder,
      id: 'closed-folder',
      icon: 'folder' as const,
      isExpanded: false
    }

    render(
      <BoardTree
        nodes={[closedFolder]}
        selectedNodeId={null}
        collapsed={false}
        onOpen={vi.fn()}
        onToggle={vi.fn()}
        onRename={vi.fn()}
        onDelete={vi.fn()}
        onCreate={vi.fn()}
        onSelectRoot={vi.fn()}
        onMove={vi.fn()}
      />
    )

    expect(document.querySelector('[data-folder-icon-state="closed"]')).toBeInTheDocument()
  })

  it('opens the shared actions by right click and keeps module action metadata', async () => {
    const user = userEvent.setup()
    const onRename = vi.fn()
    renderTree(onRename)

    fireEvent.contextMenu(screen.getByRole('button', { name: 'Папка' }))

    const renameItem = await screen.findByRole('menuitem', { name: 'Переименовать' })
    const renameIcon = renameItem.querySelector('svg')

    expect(renameItem).toHaveAttribute('data-module-tree-action', 'rename')
    expect(renameItem).toHaveAttribute('data-board-tree-action', 'rename')
    expect(renameIcon).toHaveClass('text-accent-300')

    await user.click(renameItem)
    expect(onRename).toHaveBeenCalledWith(folder)
  })

  it('keeps managed folder restrictions while allowing board rename and deletion', async () => {
    const managedRoot: BoardNode = {
      ...folder,
      id: BOARD_SYSTEM_ROOT_ID,
      title: 'Обучение',
      icon: 'folder',
      isSystem: true
    }
    const managedFolder: BoardNode = {
      ...folder,
      id: 'managed-folder',
      parentId: managedRoot.id,
      title: 'Управляемая папка',
      sourceStudyNodeId: 'study-folder'
    }
    const managedBoard: BoardNode = {
      ...board,
      id: 'managed-board',
      parentId: managedFolder.id,
      title: 'Связанная доска',
      sourceMaterialId: 'material-1'
    }

    render(
      <BoardTree
        nodes={[managedRoot, managedFolder, managedBoard]}
        selectedNodeId={managedBoard.id}
        collapsed={false}
        onOpen={vi.fn()}
        onToggle={vi.fn()}
        onRename={vi.fn()}
        onDelete={vi.fn()}
        onCreate={vi.fn()}
        onSelectRoot={vi.fn()}
        onMove={vi.fn()}
      />
    )

    expect(screen.queryByRole('button', { name: 'Действия: Обучение' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Действия: Управляемая папка' })
    ).not.toBeInTheDocument()

    fireEvent.contextMenu(screen.getByRole('button', { name: 'Связанная доска' }))

    expect(await screen.findByRole('menuitem', { name: 'Переименовать' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Удалить' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Новая папка' })).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Новая доска' })).not.toBeInTheDocument()
  })
})
