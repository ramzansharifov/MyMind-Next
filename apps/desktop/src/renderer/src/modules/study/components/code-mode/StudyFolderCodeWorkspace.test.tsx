import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { StudyNode } from '../../../../../../shared/contracts/study'
import { StudyFolderCodeWorkspace, type StudyFolderCodeControls } from './StudyFolderCodeWorkspace'

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

function FolderTestSurface({
  mode,
  modeTabs,
  codeWorkspace,
  openCode
}: StudyFolderCodeControls): React.JSX.Element {
  return (
    <div>
      <div data-testid="folder-header-controls">{modeTabs}</div>
      {mode === 'code' ? (
        codeWorkspace
      ) : (
        <button type="button" onClick={openCode}>
          Редактировать структуру
        </button>
      )}
    </div>
  )
}

describe('StudyFolderCodeWorkspace', () => {
  it('can open a selected folder directly in structure code mode', () => {
    render(
      <StudyFolderCodeWorkspace node={folderNode} initialMode="code" onApplied={vi.fn()}>
        {(controls) => <FolderTestSurface {...controls} />}
      </StudyFolderCodeWorkspace>
    )

    expect(screen.getByText('DSL структуры Математика')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Код структуры' })).toHaveAttribute(
      'data-state',
      'active'
    )
  })

  it('opens structure code from a control inside the folder overview', () => {
    render(
      <StudyFolderCodeWorkspace node={folderNode} onApplied={vi.fn()}>
        {(controls) => <FolderTestSurface {...controls} />}
      </StudyFolderCodeWorkspace>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Редактировать структуру' }))

    expect(screen.getByText('DSL структуры Математика')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Код структуры' })).toHaveAttribute(
      'data-state',
      'active'
    )
  })

  it('does not discard unsaved folder DSL when switching back to overview', async () => {
    const user = userEvent.setup()
    render(
      <StudyFolderCodeWorkspace node={folderNode} initialMode="code" onApplied={vi.fn()}>
        {(controls) => <FolderTestSurface {...controls} />}
      </StudyFolderCodeWorkspace>
    )

    await user.click(screen.getByRole('button', { name: 'Изменить DSL' }))
    await user.click(screen.getByRole('tab', { name: 'Обзор' }))

    expect(
      screen.getByRole('dialog', { name: 'Отменить изменения структуры?' })
    ).toBeInTheDocument()
    expect(screen.getByText('DSL структуры Математика')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Отменить и перейти' }))

    expect(screen.getByRole('button', { name: 'Редактировать структуру' })).toBeInTheDocument()
    expect(screen.queryByText('DSL структуры Математика')).not.toBeInTheDocument()
  })

  it('exposes compact icon-only mode tabs for placement inside the folder header', () => {
    render(
      <StudyFolderCodeWorkspace node={folderNode} onApplied={vi.fn()}>
        {(controls) => <FolderTestSurface {...controls} />}
      </StudyFolderCodeWorkspace>
    )

    const headerControls = screen.getByTestId('folder-header-controls')
    const overviewTab = screen.getByRole('tab', { name: 'Обзор' })
    const codeTab = screen.getByRole('tab', { name: 'Код структуры' })

    expect(headerControls).toContainElement(overviewTab)
    expect(headerControls).toContainElement(codeTab)
    expect(overviewTab).not.toHaveTextContent('Обзор')
    expect(codeTab).not.toHaveTextContent('Код структуры')
  })
})
