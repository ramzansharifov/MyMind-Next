import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { NoteDocument, NoteRecord } from '../../../../../shared/contracts/notes'

const notesMocks = vi.hoisted(() => ({
  getNote: vi.fn(),
  saveNote: vi.fn(),
  renameNote: vi.fn(),
  importAsset: vi.fn(),
  openAsset: vi.fn()
}))

vi.mock('../api/notes-client', () => ({
  notesClient: {
    getNote: notesMocks.getNote,
    saveNote: notesMocks.saveNote,
    renameNote: notesMocks.renameNote
  },
  notesBlockAssetClient: {
    importAsset: notesMocks.importAsset,
    openAsset: notesMocks.openAsset
  }
}))

vi.mock('../../study/components/StudyBlockAssetProvider', () => ({
  StudyBlockAssetProvider: ({ children }: { children: ReactNode }) => <>{children}</>
}))

const changedDocument: NoteDocument = {
  version: 1,
  blocks: [
    {
      id: 'block-text',
      type: 'text',
      text: 'Обновлённый текст',
      html: '<p>Обновлённый текст</p>'
    }
  ]
}

vi.mock('../../study/components/StudyBlockEditor', () => ({
  StudyBlockEditor: ({
    mode,
    onChange
  }: {
    mode: 'edit' | 'read'
    onChange: (document: NoteDocument) => void
  }) => (
    <div>
      <div data-testid="note-block-editor-mode">{mode}</div>
      {mode === 'edit' && (
        <button type="button" onClick={() => onChange(changedDocument)}>
          Изменить документ
        </button>
      )}
    </div>
  )
}))

import { NoteEditor } from './NoteEditor'

const note: NoteRecord = {
  id: 'note-1',
  groupId: null,
  title: 'Моя заметка',
  plainText: '',
  createdAt: 1,
  updatedAt: 1,
  document: {
    version: 1,
    blocks: []
  }
}

beforeEach(() => {
  notesMocks.getNote.mockResolvedValue(note)
  notesMocks.saveNote.mockImplementation(async ({ document }: { document: NoteDocument }) => ({
    ...note,
    document,
    plainText: document.blocks[0]?.type === 'text' ? document.blocks[0].text : ''
  }))
  notesMocks.renameNote.mockResolvedValue(note)
})

describe('NoteEditor reading mode', () => {
  it('uses the same flat workspace layout as the study material editor', async () => {
    const { container } = render(
      <NoteEditor noteId={note.id} onBack={vi.fn()} onNoteUpdated={vi.fn()} />
    )

    await screen.findByRole('heading', { name: note.title })

    const workspace = container.querySelector<HTMLElement>('[data-note-editor-mode="edit"]')
    const header = container.querySelector<HTMLElement>('[data-note-editor-header]')
    const scrollContainer = container.querySelector<HTMLElement>('[data-note-editor-scroll-container]')

    expect(workspace).toHaveClass('flex', 'h-full', 'min-h-0', 'flex-col')
    expect(header).toHaveClass('min-h-20', 'border-b', 'px-6')
    expect(scrollContainer).toHaveClass('min-h-0', 'flex-1', 'overflow-y-auto', 'px-6', 'py-6')
    expect(scrollContainer).not.toHaveClass('rounded-[28px]')
    expect(scrollContainer).not.toHaveClass('shadow-[var(--app-shadow-card)]')
    expect(screen.getByRole('tablist', { name: 'Режим заметки' })).toHaveClass('rounded-lg')
  })

  it('switches between editing and reading through the shared block editor', async () => {
    const user = userEvent.setup()

    render(<NoteEditor noteId={note.id} onBack={vi.fn()} onNoteUpdated={vi.fn()} />)

    await screen.findByRole('heading', { name: note.title })
    expect(screen.getByTestId('note-block-editor-mode')).toHaveTextContent('edit')

    await user.click(screen.getByRole('tab', { name: 'Чтение' }))
    await waitFor(() => {
      expect(screen.getByTestId('note-block-editor-mode')).toHaveTextContent('read')
    })

    await user.click(screen.getByRole('tab', { name: 'Редактирование' }))
    expect(screen.getByTestId('note-block-editor-mode')).toHaveTextContent('edit')
  })

  it('flushes the latest draft before entering reading mode', async () => {
    const user = userEvent.setup()

    render(<NoteEditor noteId={note.id} onBack={vi.fn()} onNoteUpdated={vi.fn()} />)

    await screen.findByRole('heading', { name: note.title })
    await user.click(screen.getByRole('button', { name: 'Изменить документ' }))
    await user.click(screen.getByRole('tab', { name: 'Чтение' }))

    await waitFor(() => {
      expect(notesMocks.saveNote).toHaveBeenCalledWith({
        id: note.id,
        document: changedDocument
      })
      expect(screen.getByTestId('note-block-editor-mode')).toHaveTextContent('read')
    })
  })
})
