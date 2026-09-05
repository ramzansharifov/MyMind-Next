import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { NoteGroup, NotesOverview } from '../../../../shared/contracts/notes'
import { TooltipProvider } from '../../shared/ui/tooltip'

const notesMocks = vi.hoisted(() => ({
  listOverview: vi.fn(),
  createGroup: vi.fn(),
  createNote: vi.fn(),
  renameGroup: vi.fn(),
  updateGroupIcon: vi.fn(),
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
  icon: 'work',
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
  vi.clearAllMocks()
  notesMocks.listOverview.mockResolvedValue(overview)
  notesMocks.updateGroupIcon.mockImplementation(async (id, icon) => ({ ...group, id, icon }))
  notesMocks.createGroup.mockResolvedValue({
    id: 'group-new',
    title: 'Проекты',
    icon: 'folder',
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

  it('matches the shared home width and uses one card grid for recent and all notes', async () => {
    render(<NotesPage />)

    await screen.findByRole('heading', { name: 'Заметки' })

    expect(document.querySelector('[data-notes-home-container]')).toHaveClass('max-w-[1240px]')

    const hero = document.querySelector('[data-notes-hero]')
    expect(hero).not.toBeNull()
    expect(hero).toContainElement(screen.getByRole('tab', { name: 'Все' }))
    expect(hero).toContainElement(screen.getByText('Всего заметок').closest('button'))

    const recentGrid = document.querySelector('[data-notes-collection="recent"]')
    const allGrid = document.querySelector('[data-notes-collection="all"]')

    expect(recentGrid).not.toBeNull()
    expect(allGrid).not.toBeNull()
    expect(recentGrid?.className).toBe(allGrid?.className)
    expect(recentGrid).toHaveClass('grid-cols-3')
  })

  it('uses Radix tabs, switch and toggle group for dashboard navigation', async () => {
    const user = userEvent.setup()
    render(<NotesPage />)

    await screen.findByRole('heading', { name: 'Заметки' })

    expect(screen.getByRole('tab', { name: 'Все' })).toHaveAttribute('data-state', 'active')
    expect(screen.getByRole('tab', { name: 'По группам' })).toBeInTheDocument()

    const listToggle = screen.getByRole('radio', { name: 'Показать заметки списком' })
    await user.click(listToggle)
    expect(listToggle).toHaveAttribute('data-state', 'on')

    await user.click(screen.getByRole('tab', { name: 'По группам' }))

    expect(screen.queryByRole('heading', { name: 'Все группы' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Группы' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Создать новую группу' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Открыть группу «Работа»' })).toBeInTheDocument()

    const hideEmptySwitch = screen.getByRole('switch', { name: 'Скрыть пустые группы' })
    await user.click(hideEmptySwitch)
    expect(hideEmptySwitch).toHaveAttribute('aria-checked', 'true')
  })

  it('removes secondary page headers and keeps creation inside each content block', async () => {
    const user = userEvent.setup()
    render(<NotesPage />)

    await screen.findByRole('heading', { name: 'Заметки' })

    await user.click(screen.getByRole('tab', { name: 'Недавние' }))
    expect(screen.getAllByRole('heading', { name: 'Недавние заметки' })).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Создать новую заметку' })).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Без группы' }))
    expect(screen.queryByRole('heading', { name: 'Заметки без группы' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Без группы' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Создать новую заметку' })).toBeInTheDocument()
  })

  it('updates a group icon through the shared folder icon picker', async () => {
    const user = userEvent.setup()
    render(
      <TooltipProvider>
        <NotesPage />
      </TooltipProvider>
    )

    await screen.findByRole('heading', { name: 'Заметки' })
    await user.click(screen.getByRole('button', { name: 'Изменить иконку группы «Работа»' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Наука' }))

    await waitFor(() =>
      expect(notesMocks.updateGroupIcon).toHaveBeenCalledWith('group-work', 'science')
    )
  })

  it('opens a group as a block-only page with an internal back action and create card', async () => {
    const user = userEvent.setup()
    render(<NotesPage />)

    await screen.findByRole('heading', { name: 'Заметки' })
    await user.click(screen.getByRole('tab', { name: 'По группам' }))
    await user.click(screen.getByRole('button', { name: 'Открыть группу «Работа»' }))

    expect(screen.getByRole('button', { name: 'Вернуться ко всем группам' })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { name: 'Работа' })).toHaveLength(1)
    expect(
      screen.getByRole('button', { name: 'Создать заметку в группе «Работа»' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Открыть заметку «План проекта»' })
    ).toBeInTheDocument()
  })

  it('opens the group creation dialog from the placeholder card', async () => {
    const user = userEvent.setup()
    render(<NotesPage />)

    await screen.findByRole('heading', { name: 'Заметки' })
    await user.click(screen.getByRole('tab', { name: 'По группам' }))
    await user.click(screen.getByRole('button', { name: 'Создать новую группу' }))

    expect(screen.getByRole('textbox', { name: 'Название группы' })).toBeInTheDocument()
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
