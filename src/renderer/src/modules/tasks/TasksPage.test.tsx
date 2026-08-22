import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { TaskGroupRecord, TaskRecord } from '../../../../shared/contracts/tasks'

const mocks = vi.hoisted(() => ({
  listOverview: vi.fn(),
  createGroup: vi.fn(),
  updateGroup: vi.fn(),
  deleteGroup: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn()
}))

vi.mock('./api/tasks-client', () => ({ tasksClient: mocks }))

import { TasksPage } from './TasksPage'

const workGroup: TaskGroupRecord = {
  id: 'group-work',
  name: 'Работа',
  icon: 'briefcase',
  color: 'blue',
  position: 0,
  createdAt: 1,
  updatedAt: 1
}

const homeGroup: TaskGroupRecord = {
  id: 'group-home',
  name: 'Дом',
  icon: 'home',
  color: 'emerald',
  position: 1,
  createdAt: 1,
  updatedAt: 1
}

const task: TaskRecord = {
  id: 'task-1',
  title: 'Подготовить отчёт',
  description: 'Старое скрытое описание.',
  groupId: workGroup.id,
  status: 'active',
  priority: 'high',
  dueDate: '2026-08-25',
  dueTime: '12:30',
  completedAt: null,
  createdAt: 2,
  updatedAt: 2
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.listOverview.mockResolvedValue({ groups: [workGroup], tasks: [task] })
  mocks.createTask.mockImplementation(async (input) => ({
    ...input,
    id: 'task-created',
    completedAt: input.status === 'completed' ? 5 : null,
    createdAt: 5,
    updatedAt: 5
  }))
  mocks.updateTask.mockImplementation(async (input) => ({
    ...task,
    ...input,
    completedAt: input.status === 'completed' ? 6 : null,
    updatedAt: 6
  }))
  mocks.createGroup.mockImplementation(async (input) => ({
    ...input,
    id: 'group-created',
    position: 1,
    createdAt: 7,
    updatedAt: 7
  }))
  mocks.updateGroup.mockImplementation(async (input) => ({
    ...workGroup,
    ...input,
    updatedAt: 8
  }))
  mocks.deleteGroup.mockResolvedValue(true)
  mocks.deleteTask.mockResolvedValue(true)
})

describe('TasksPage', () => {
  it('puts search and simple status filters in the header without priority or date filters', async () => {
    render(<TasksPage />)

    expect(await screen.findByRole('heading', { name: 'Задачи' })).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Поиск по задачам' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Все' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Активные' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Выполненные' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Сегодня' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Просрочено' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Фильтр по приоритету')).not.toBeInTheDocument()
    expect(screen.queryByText('Высокий')).not.toBeInTheDocument()
    expect(screen.getByText('Подготовить отчёт')).toBeInTheDocument()
  })

  it('quick-adds a task into the selected group with neutral legacy metadata', async () => {
    const user = userEvent.setup()
    render(<TasksPage />)

    await user.click(await screen.findByRole('button', { name: 'Работа 1' }))
    await user.type(
      screen.getByRole('textbox', { name: 'Быстро добавить задачу' }),
      'Позвонить клиенту'
    )
    await user.click(screen.getByRole('button', { name: 'Добавить' }))

    await waitFor(() =>
      expect(mocks.createTask).toHaveBeenCalledWith({
        title: 'Позвонить клиенту',
        description: '',
        groupId: workGroup.id,
        status: 'active',
        priority: 'normal',
        dueDate: null,
        dueTime: null
      })
    )
  })

  it('marks a task as completed by clicking the task itself and preserves old hidden metadata', async () => {
    const user = userEvent.setup()
    render(<TasksPage />)

    await user.click(
      await screen.findByRole('button', { name: 'Выполнить задачу «Подготовить отчёт»' })
    )

    await waitFor(() =>
      expect(mocks.updateTask).toHaveBeenCalledWith({
        id: task.id,
        title: task.title,
        description: task.description,
        groupId: task.groupId,
        status: 'completed',
        priority: task.priority,
        dueDate: task.dueDate,
        dueTime: task.dueTime
      })
    )
  })

  it('moves a task through a fixed scrollable group menu and toggles the current group off', async () => {
    mocks.listOverview.mockResolvedValue({ groups: [workGroup, homeGroup], tasks: [task] })
    const user = userEvent.setup()
    render(<TasksPage />)

    const moveButton = await screen.findByRole('button', {
      name: 'Перенести задачу «Подготовить отчёт»'
    })
    await user.click(moveButton)

    expect(screen.getByTestId('task-group-move-menu')).toHaveClass('h-72', 'w-64')
    expect(screen.getByTestId('task-group-move-scroll')).toHaveClass('overflow-y-auto')

    await user.click(screen.getByRole('menuitem', { name: 'Перенести задачу в группу «Дом»' }))

    await waitFor(() =>
      expect(mocks.updateTask).toHaveBeenLastCalledWith({
        id: task.id,
        title: task.title,
        description: task.description,
        groupId: homeGroup.id,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate,
        dueTime: task.dueTime
      })
    )

    await user.click(
      await screen.findByRole('button', { name: 'Перенести задачу «Подготовить отчёт»' })
    )
    await user.click(screen.getByRole('menuitem', { name: 'Убрать задачу из группы «Дом»' }))

    await waitFor(() =>
      expect(mocks.updateTask).toHaveBeenLastCalledWith({
        id: task.id,
        title: task.title,
        description: task.description,
        groupId: null,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate,
        dueTime: task.dueTime
      })
    )
  })

  it('keeps edit and delete actions visible without hover-only opacity', async () => {
    render(<TasksPage />)

    const edit = await screen.findByRole('button', { name: 'Изменить задачу «Подготовить отчёт»' })
    const remove = screen.getByRole('button', { name: 'Удалить задачу «Подготовить отчёт»' })
    const actions = edit.parentElement

    expect(edit).toBeInTheDocument()
    expect(remove).toBeInTheDocument()
    expect(actions).not.toHaveClass('opacity-0')
    expect(actions).not.toHaveClass('group-hover/task:opacity-100')
  })

  it('shows only title, group and status in the task dialog', async () => {
    const user = userEvent.setup()
    render(<TasksPage />)

    await user.click(await screen.findByRole('button', { name: 'Новая задача' }))

    expect(screen.getByRole('heading', { name: 'Новая задача' })).toBeInTheDocument()
    expect(screen.getByText('Название')).toBeInTheDocument()
    expect(screen.getByText('Группа')).toBeInTheDocument()
    expect(screen.getByText('Статус')).toBeInTheDocument()
    expect(screen.queryByText('Описание')).not.toBeInTheDocument()
    expect(screen.queryByText('Приоритет')).not.toBeInTheDocument()
    expect(screen.queryByText('Срок')).not.toBeInTheDocument()
  })

  it('creates a group without a custom color by using the app accent', async () => {
    const user = userEvent.setup()
    render(<TasksPage />)

    await user.click(await screen.findByRole('button', { name: 'Новая группа' }))
    await user.type(screen.getByLabelText('Название'), 'Дом')

    const noColor = screen.getByRole('button', { name: 'Цвет: Без цвета' })
    expect(noColor).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: 'Создать группу' }))

    await waitFor(() =>
      expect(mocks.createGroup).toHaveBeenCalledWith({
        name: 'Дом',
        icon: 'folder',
        color: 'accent'
      })
    )
  })

  it('warns that deleting a group keeps its tasks', async () => {
    const user = userEvent.setup()
    render(<TasksPage />)

    await user.click(await screen.findByRole('button', { name: 'Удалить группу «Работа»' }))

    expect(screen.getByRole('heading', { name: 'Удалить группу?' })).toBeInTheDocument()
    expect(
      screen.getByText('Сами задачи сохранятся и будут перенесены в «Без группы».')
    ).toBeInTheDocument()
    expect(screen.getByText('Задачи из этой группы не удаляются')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Удалить' }))
    await waitFor(() => expect(mocks.deleteGroup).toHaveBeenCalledWith({ id: workGroup.id }))
  })
})
