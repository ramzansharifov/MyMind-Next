import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { StudyNode } from '../../../../../shared/contracts/study'

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

import { StudyTree } from './StudyTree'

const folder: StudyNode = {
  id: 'folder-1',
  type: 'folder',
  parentId: null,
  title: 'Папка',
  position: 0,
  isExpanded: true,
  createdAt: 1,
  updatedAt: 1
}

const material: StudyNode = {
  id: 'material-1',
  type: 'material',
  parentId: folder.id,
  title: 'Материал',
  position: 0,
  isExpanded: false,
  createdAt: 1,
  updatedAt: 1
}

function renderTree(onRename = vi.fn()): void {
  render(
    <StudyTree
      nodes={[folder, material]}
      search=""
      selectedNodeId={material.id}
      activeParentId={folder.id}
      collapsed={false}
      onSelect={vi.fn()}
      onSelectRoot={vi.fn()}
      onToggleFolder={vi.fn()}
      onRename={onRename}
      onDuplicate={vi.fn()}
      onDelete={vi.fn()}
      onCreateFolder={vi.fn()}
      onCreateMaterial={vi.fn()}
      onMove={vi.fn()}
    />
  )
}

describe('StudyTree sidebar interactions', () => {
  it('uses full-width compact rows and hover-only nesting guides', () => {
    renderTree()

    const folderRow = document.querySelector('[data-study-tree-node-id="folder-1"]')
    const materialRow = document.querySelector('[data-study-tree-node-id="material-1"]')

    expect(folderRow).toHaveClass('h-8', 'w-full', 'rounded-none')
    expect(folderRow).toHaveStyle({ paddingLeft: '2px' })
    expect(materialRow).toHaveStyle({ paddingLeft: '18px' })
    expect(screen.getByRole('button', { name: 'Свернуть папку' })).toHaveClass('size-5', 'p-0')
    expect(folderRow?.querySelector('[data-study-tree-guide="folder"]')).toBeInTheDocument()
    expect(materialRow?.querySelector('[data-study-tree-guide="ancestor"]')).toBeInTheDocument()
  })

  it('opens the same actions by right click and colors the rename icon with the accent palette', async () => {
    const user = userEvent.setup()
    const onRename = vi.fn()
    renderTree(onRename)

    fireEvent.contextMenu(screen.getByRole('button', { name: 'Открыть: Папка' }))

    const renameItem = await screen.findByRole('menuitem', { name: 'Переименовать' })
    const renameIcon = renameItem.querySelector('svg')

    expect(renameItem).toHaveAttribute('data-study-tree-action', 'rename')
    expect(renameIcon).toHaveClass('text-violet-300')

    await user.click(renameItem)
    expect(onRename).toHaveBeenCalledWith(folder)
  })
})
