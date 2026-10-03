import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { NoteDocument, NoteRecord } from '../../../../../shared/contracts/notes'

const notesMocks = vi.hoisted(() => ({
  getNote: vi.fn(),
  saveNote: vi.fn(),
  renameNote: vi.fn(),
  importAsset: vi.fn(),
  openAsset: vi.fn(),
  stubCanvas: false
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

vi.mock('./NoteCanvas', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./NoteCanvas')>()
  return {
    ...actual,
    NoteCanvas: (props: Parameters<typeof actual.NoteCanvas>[0]) =>
      notesMocks.stubCanvas ? (
        <div>
          <div data-testid="note-canvas-mode">{props.mode}</div>
          {props.mode === 'edit' && (
            <button type="button" onClick={() => props.onChange(changedDocument)}>
              Изменить документ
            </button>
          )}
        </div>
      ) : (
        <actual.NoteCanvas {...props} />
      )
  }
})

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
  vi.clearAllMocks()
  notesMocks.stubCanvas = false
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
    const scrollContainer = container.querySelector<HTMLElement>(
      '[data-note-editor-scroll-container]'
    )

    expect(workspace).toHaveClass('flex', 'h-full', 'min-h-0', 'flex-col')
    expect(header).toHaveClass('min-h-20', 'border-b', 'px-6', 'bg-[var(--app-workspace)]')
    expect(scrollContainer).toHaveClass('note-canvas-scroll')
    expect(scrollContainer).not.toHaveClass('rounded-[28px]')
    expect(scrollContainer).not.toHaveClass('shadow-[var(--app-shadow-card)]')
    expect(screen.getByRole('tablist', { name: 'Режим заметки' })).toHaveClass('rounded-lg')
  })

  it('keeps a full-width header and the same canvas layout in editing and reading modes', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <NoteEditor noteId={note.id} onBack={vi.fn()} onNoteUpdated={vi.fn()} />
    )

    await screen.findByRole('heading', { name: note.title })

    const headerContent = container.querySelector<HTMLElement>('[data-note-editor-header-content]')
    const content = container.querySelector<HTMLElement>('[data-note-editor-content]')

    expect(headerContent).toHaveClass('flex', 'w-full')
    expect(headerContent).not.toHaveClass('max-w-[var(--app-standard-content-width)]')
    expect(content).toHaveClass('note-canvas-layout')
    expect(content).toHaveAttribute('data-settings-visible', 'true')
    expect(
      screen.getByRole('complementary', { name: 'Настройки текста заметки' })
    ).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Чтение' }))
    await waitFor(() => {
      expect(screen.getByRole('document', { name: 'Текст заметки' })).toBeInTheDocument()
    })

    expect(container.querySelector('[data-note-editor-content]')).toHaveClass('note-canvas-layout')
    expect(container.querySelector('[data-note-editor-content]')).toHaveAttribute(
      'data-settings-visible',
      'false'
    )
    expect(
      screen.queryByRole('complementary', { name: 'Настройки текста заметки' })
    ).not.toBeInTheDocument()
    expect(container.querySelector('[data-note-editor-mode="read"]')).toHaveClass(
      'bg-[var(--app-workspace)]'
    )
  })

  it('switches the note canvas between editing and reading', async () => {
    const user = userEvent.setup()

    render(<NoteEditor noteId={note.id} onBack={vi.fn()} onNoteUpdated={vi.fn()} />)

    await screen.findByRole('heading', { name: note.title })
    expect(screen.getByRole('textbox', { name: 'Текст заметки' })).toHaveAttribute(
      'contenteditable',
      'true'
    )

    await user.click(screen.getByRole('tab', { name: 'Чтение' }))
    await waitFor(() => {
      expect(screen.getByRole('document', { name: 'Текст заметки' })).toHaveAttribute(
        'contenteditable',
        'false'
      )
    })

    await user.click(screen.getByRole('tab', { name: 'Редактирование' }))
    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'Текст заметки' })).toHaveAttribute(
        'contenteditable',
        'true'
      )
    })
  })

  it('flushes the latest draft before entering reading mode', async () => {
    notesMocks.stubCanvas = true
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
      expect(screen.getByTestId('note-canvas-mode')).toHaveTextContent('read')
    })
  })
})
