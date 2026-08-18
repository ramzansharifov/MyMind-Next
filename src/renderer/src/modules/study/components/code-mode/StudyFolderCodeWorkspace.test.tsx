import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { StudyNode } from '../../../../../../shared/contracts/study'
import { StudyFolderCodeWorkspace } from './StudyFolderCodeWorkspace'

vi.mock('./StudyCodeWorkspace', () => ({
  StudyCodeWorkspace: ({
    node,
    onDirtyChange
  }: {
    node: StudyNode
    onDirtyChange?: (dirty: boolean) => void
  }) => (
    <div>
      <span>DSL структуры {node.title}</span>
      <button type="button" onClick={() => onDirtyChange?.(true)}>
        Изменить DSL
      </button>
    </div>
  )
}))

const folderNode: StudyNode = {
  id: '8afac487-928c-4103-ae69-556d36988980',
  type: 'folder',
  parentId: null,
  title: 'Математика',
  position: 0,
  isExpanded: true,
  createdAt: 1,
  updatedAt: 1
}

describe('StudyFolderCodeWorkspace', () => {
  it('can open a selected folder directly in structure code mode', () => {
    render(
      <StudyFolderCodeWorkspace
        node={folderNode}
        initialMode="code"
        onApplied={vi.fn()}
      >
        <div>Обзор папки</div>
      </StudyFolderCodeWorkspace>
    )

    expect(screen.getByText('DSL структуры Математика')).toBeInTheDocument()
    expect(screen.queryByText('Обзор папки')).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Код структуры' })).toHaveAttribute(
      'data-state',
      'active'
    )
  })

  it('opens structure code from a control inside the folder overview', () => {
    render(
      <StudyFolderCodeWorkspace node={folderNode} onApplied={vi.fn()}>
        {({ openCode }) => (
          <button type="button" onClick={openCode}>
            Редактировать структуру
          </button>
        )}
      </StudyFolderCodeWorkspace>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Редактировать структуру' }))

    expect(screen.getByText('DSL структуры Математика')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Код структуры' })).toHaveAttribute(
      'data-state',
      'active'
    )
  })

  it('does not discard unsaved folder DSL when switching back to overview', () => {
    render(
      <StudyFolderCodeWorkspace
        node={folderNode}
        initialMode="code"
        onApplied={vi.fn()}
      >
        <div>Обзор папки</div>
      </StudyFolderCodeWorkspace>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Изменить DSL' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Обзор' }))

    expect(screen.getByRole('dialog', { name: 'Отменить изменения структуры?' })).toBeInTheDocument()
    expect(screen.getByText('DSL структуры Математика')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Отменить и перейти' }))

    expect(screen.getByText('Обзор папки')).toBeInTheDocument()
    expect(screen.queryByText('DSL структуры Математика')).not.toBeInTheDocument()
  })
})
