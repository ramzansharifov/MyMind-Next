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

const task: TaskRecord = {
  id: 'task-1',
  title: 'Подготовить отчёт',
  description: 'Проверить итоговые цифры.',
  groupId: workGroup.id,
  status: 'active',
  priority: 'high',
  dueDate: null,
  dueTime: null,
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
  mocks.createGroup.mockResolvedValue({
    id: 'group-home',
    name: 'Дом',
    icon: 'home',
    color: 'emerald',
    position: 1,
    createdAt: 7,
    updatedAt: 7
  })
  mocks.updateGroup.mockImplementation(async (input) => ({
    ...workGroup,
    ...input,
    updatedAt: 8
  }))
  mocks.deleteGroup.mockResolvedValue(true)
  mocks.deleteTask.mockResolvedValue(true)
})

describe('TasksPage', () => {
  it('shows status filters, task groups and grouped tasks', async () => {
    render(<TasksPage />)

    expect(await screen.findByRole('heading', { name: 'Задачи' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Все задачи/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Работа/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Активные' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Сегодня' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Просрочено' })).toBeInTheDocument()
    expect(screen.getByText('Подготовить отчёт')).toBeInTheDocument()
    expect(screen.getByText('Высокий')).toBeInTheDocument()
  })

  it('quick-adds a task into the selected group', async () => {
    const user = userEvent.setup()
    render(<TasksPage />)

    await user.click(await screen.findByRole('button', { name: /Работа/ }))
    await user.type(screen.getByRole('textbox', { name: 'Быстро добавить задачу' }), 'Позвонить клиенту')
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

  it('marks an active task as completed without rebuilding its metadata', async () => {
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

  it('creates custom groups with icon and color', async () => {
    const user = userEvent.setup()
    render(<TasksPage />)

    await user.click(await screen.findByRole('button', { name: 'Новая группа' }))
    await user.type(screen.getByLabelText('Название'), 'Дом')
    await user.click(screen.getByRole('button', { name: 'Иконка: Дом' }))
    await user.click(screen.getByRole('button', { name: 'Цвет: Изумрудный' }))
    await user.click(screen.getByRole('button', { name: 'Создать группу' }))

    await waitFor(() =>
      expect(mocks.createGroup).toHaveBeenCalledWith({
        name: 'Дом',
        icon: 'home',
        color: 'emerald'
      })
    )
  })

  it('warns that deleting a group keeps its tasks', async () => {
    const user = userEvent.setup()
    render(<TasksPage />)

    await user.click(
      await screen.findByRole('button', { name: 'Удалить группу «Работа»' })
    )

    expect(screen.getByRole('heading', { name: 'Удалить группу?' })).toBeInTheDocument()
    expect(
      screen.getByText('Сами задачи сохранятся и будут перенесены в «Без группы».')
    ).toBeInTheDocument()
    expect(screen.getByText('Задачи из этой группы не удаляются')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Удалить' }))
    await waitFor(() => expect(mocks.deleteGroup).toHaveBeenCalledWith({ id: workGroup.id }))
  })
})
