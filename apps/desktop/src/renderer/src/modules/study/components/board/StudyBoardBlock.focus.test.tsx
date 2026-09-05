import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { StudyBlock } from '../../../../../../shared/contracts/study'
import {
  APP_MODULE_NAVIGATE_EVENT,
  type AppModuleNavigationRequest
} from '../../../../app/module-navigation'

const boardMocks = vi.hoisted(() => ({
  ensureStudyBoard: vi.fn()
}))

vi.mock('../../../boards/api/boards-client', () => ({
  boardsClient: boardMocks
}))

import { StudyBoardBlock } from './StudyBoardBlock'

const block: Extract<StudyBlock, { type: 'board' }> = {
  id: 'board-block-focus',
  type: 'board',
  boardId: 'board-focus',
  title: 'Доска фокуса'
}

afterEach(() => {
  boardMocks.ensureStudyBoard.mockReset()
})

describe('StudyBoardBlock focus navigation', () => {
  it('preserves focus mode when a board is opened from reading', async () => {
    const user = userEvent.setup()
    let request: AppModuleNavigationRequest | null = null
    const listener = (event: Event): void => {
      request = (event as CustomEvent<AppModuleNavigationRequest>).detail
    }

    boardMocks.ensureStudyBoard.mockResolvedValue({
      id: 'board-focus',
      type: 'board',
      parentId: null,
      title: 'Доска фокуса',
      position: 0,
      isExpanded: true,
      isSystem: false,
      sourceMaterialId: 'material-focus',
      sourceBlockId: block.id,
      createdAt: 1,
      updatedAt: 1
    })

    window.addEventListener(APP_MODULE_NAVIGATE_EVENT, listener)
    render(<StudyBoardBlock materialId="material-focus" block={block} mode="read" focusMode />)

    await user.click(screen.getByRole('button', { name: /Открыть доску/ }))
    await waitFor(() => expect(request).not.toBeNull())

    expect(request).toEqual({
      view: 'boards',
      resourceId: 'board-focus',
      focusMode: true
    })

    window.removeEventListener(APP_MODULE_NAVIGATE_EVENT, listener)
  })
})
