import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { StudyNode } from '../../../../shared/contracts/study'
import { RenameStudyNodeDialog } from './components/RenameStudyNodeDialog'

const folder: StudyNode = {
  id: 'folder-1',
  type: 'folder',
  parentId: null,
  title: 'Старое название',
  position: 0,
  isExpanded: true,
  createdAt: 1,
  updatedAt: 1
}

describe('StudyPage dialogs', () => {
  it('confirms renaming with Shift+Enter', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const onValueChange = vi.fn()
    render(
      <RenameStudyNodeDialog
        target={folder}
        value="Новое название"
        onValueChange={onValueChange}
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
      />
    )

    const input = screen.getByDisplayValue('Новое название')

    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onConfirm).not.toHaveBeenCalled()

    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true })
    expect(onConfirm).toHaveBeenCalledTimes(1)

    await user.clear(input)
    expect(onValueChange).toHaveBeenCalled()
  })
})
