import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { StudyNode } from '../../../../../shared/contracts/study'
import { TooltipProvider } from '../../../shared/ui/tooltip'

const studyMocks = vi.hoisted(() => ({
  getMaterial: vi.fn(),
  saveMaterial: vi.fn()
}))

vi.mock('../api/study-client', () => ({
  studyClient: studyMocks
}))

vi.mock('./StudyBlockEditor', () => ({
  StudyBlockEditor: ({ mode, focusMode }: { mode: string; focusMode: boolean }) => (
    <div data-testid="study-block-editor">
      {mode}:{String(focusMode)}
    </div>
  )
}))

vi.mock('./StudyReadNavigation', () => ({
  StudyReadNavigation: () => <aside>Навигация чтения</aside>
}))

import { StudyMaterialEditor } from './StudyMaterialEditor'

const materialNode: StudyNode = {
  id: 'material-focus',
  type: 'material',
  parentId: null,
  title: 'Материал для фокуса',
  position: 0,
  isExpanded: true,
  createdAt: 1,
  updatedAt: 1
}

beforeEach(() => {
  studyMocks.getMaterial.mockResolvedValue({
    nodeId: materialNode.id,
    document: { version: 1, blocks: [] },
    plainText: '',
    createdAt: 1,
    updatedAt: 1
  })
  studyMocks.saveMaterial.mockResolvedValue(undefined)
})

describe('StudyMaterialEditor focus mode', () => {
  it('enters focus only from reading, hides editing chrome and exits by Escape', async () => {
    const user = userEvent.setup()
    const onFocusModeChange = vi.fn()
    const props = {
      node: materialNode,
      onRename: vi.fn(),
      navigation: null,
      onNavigationHandled: vi.fn(),
      onFocusModeChange
    }

    const view = render(<StudyMaterialEditor {...props} focusMode={false} />, {
      wrapper: TooltipProvider
    })

    await waitFor(() => expect(studyMocks.getMaterial).toHaveBeenCalledWith(materialNode.id))
    await user.click(await screen.findByRole('tab', { name: 'Чтение' }))
    await user.click(screen.getByRole('button', { name: 'Открыть режим фокуса' }))

    expect(onFocusModeChange).toHaveBeenLastCalledWith(true)

    view.rerender(<StudyMaterialEditor {...props} focusMode />)

    expect(screen.getByTestId('study-block-editor')).toHaveTextContent('read:true')
    expect(screen.queryByRole('tab', { name: 'Правка' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Переименовать материал' })).not.toBeInTheDocument()
    expect(screen.queryByText('Навигация чтения')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Выйти из режима фокуса' })).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onFocusModeChange).toHaveBeenLastCalledWith(false)
  })
})
