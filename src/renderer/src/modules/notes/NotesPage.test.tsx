import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { NoteGroup, NoteRecord, NotesOverview } from '../../../../shared/contracts/notes'

const notesMocks = vi.hoisted(() => ({
  listOverview: vi.fn(),
  createGroup: vi.fn(),
  createNote: vi.fn(),
  renameGroup: vi.fn(),
  renameNote: vi.fn(),
  moveNote: vi.fn(),
  deleteGroup: vi.fn(),
  deleteNote: vi.fn()
}))

vi.mock('./api/notes-client', () => ({
  notesClient: notesMocks
}))

vi.mock('./components/NoteEditor', () => ({
  NoteEditor: ({ noteId }: { noteId: string }) => (
    <div data-testid="note-editor">Открыта заметка {noteId}</div>
  )
}))

import { NotesPage } from './NotesPage'

const group: NoteGroup = {
  id: 'group-work',
  title: 'Работа',
  createdAt: 1,
  updatedAt: 1
}

const overview: NotesOverview = {
  groups: [group],
  notes: [
    {
      id: 'note-plan',
      groupId: group.id,
      title: 'План проекта',
      plainText: 'Первый этап проекта',
      createdAt: 1,
      updatedAt: 3
    },
    {
      id: 'note-idea',
      groupId: null,
      title: 'Быстрая идея',
      plainText: '',
      createdAt: 2,
      updatedAt: 2
    }
  ]
}

beforeEach(() => {
  notesMocks.listOverview.mockResolvedValue(overview)
  notesMocks.createGroup.mockResolvedValue({
    id: 'group-new',
    title: 'Проекты',
    createdAt: 4,
    updatedAt: 4
  })
})

describe('NotesPage', () => {
  it('renders the notes workspace directly without a module sidebar', async () => {
    render(<NotesPage />)

    expect(await screen.findByRole('heading', { name: 'Заметки' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Работа' })).toBeInTheDocument()
    expect(screen.getAllByText('План проекта').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Быстрая идея').length).toBeGreaterThan(0)
    expect(document.querySelector('[data-module-sidebar]')).not.toBeInTheDocument()
  })

  it('creates a group from the home page', async () => {
    const user = userEvent.setup()
    render(<NotesPage />)

    await screen.findByRole('heading', { name: 'Заметки' })
    await user.click(screen.getByRole('button', { name: 'Новая группа' }))
    await user.type(screen.getByRole('textbox', { name: 'Название группы' }), 'Проекты')
    await user.click(screen.getByRole('button', { name: 'Создать' }))

    await waitFor(() => expect(notesMocks.createGroup).toHaveBeenCalledWith('Проекты'))
    expect(await screen.findByRole('heading', { name: 'Проекты' })).toBeInTheDocument()
  })

  it('opens a selected note in the simple editor workspace', async () => {
    const user = userEvent.setup()
    render(<NotesPage />)

    await screen.findByRole('heading', { name: 'Заметки' })
    await user.click(screen.getAllByRole('button', { name: 'Открыть заметку «План проекта»' })[0])

    expect(screen.getByTestId('note-editor')).toHaveTextContent('note-plan')
  })
})
