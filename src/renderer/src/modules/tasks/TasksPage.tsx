import {
  CalendarClock,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  FolderPlus,
  Inbox,
  ListTodo,
  Pencil,
  Plus,
  Search,
  Trash2,
  TriangleAlert,
  X
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type {
  CreateTaskGroupInput,
  CreateTaskInput,
  TaskGroupRecord,
  TaskPriority,
  TaskRecord,
  UpdateTaskGroupInput,
  UpdateTaskInput
} from '../../../../shared/contracts/tasks'
import { cn } from '../../shared/lib/cn'
import { AppSelect } from '../../shared/ui/AppSelect'
import { DeleteConfirmationDialog } from '../../shared/ui/DeleteConfirmationDialog'
import { tasksClient } from './api/tasks-client'
import { TaskDialog } from './components/TaskDialog'
import { TaskGroupDialog } from './components/TaskGroupDialog'
import {
  TASK_PRIORITY_OPTIONS,
  TaskGroupIconGlyph,
  taskGroupColorClasses,
  taskPriorityClassName,
  taskPriorityLabel
} from './task-options'

type TaskViewFilter = 'all' | 'active' | 'today' | 'overdue' | 'completed'
type TaskGroupFilter = 'all' | 'ungrouped' | string

interface TasksPageProps {
  resourceId?: string | null
  onResourceHandled?: () => void
}

interface TaskSection {
  id: string
  title: string
  tasks: TaskRecord[]
  icon: React.ReactNode
  tone?: 'danger' | 'success' | 'default'
}

const PRIORITY_ALL = 'all'

const viewFilters: Array<{ id: TaskViewFilter; label: string }> = [
  { id: 'all', label: 'Все' },
  { id: 'active', label: 'Активные' },
  { id: 'today', label: 'Сегодня' },
  { id: 'overdue', label: 'Просрочено' },
  { id: 'completed', label: 'Выполненные' }
]

function errorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : 'Не удалось выполнить действие'
}

function localDateKey(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function localTimeKey(date = new Date()): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function isTaskOverdue(task: TaskRecord, today: string, nowTime: string): boolean {
  if (task.status !== 'active' || task.dueDate === null) return false
  if (task.dueDate < today) return true
  return task.dueDate === today && task.dueTime !== null && task.dueTime < nowTime
}

function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1)
}

function formatDueDate(value: string, today: string): string {
  if (value === today) return 'Сегодня'

  const todayDate = parseLocalDate(today)
  const tomorrowDate = new Date(todayDate)
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  if (value === localDateKey(tomorrowDate)) return 'Завтра'

  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: parseLocalDate(value).getFullYear() === todayDate.getFullYear() ? undefined : 'numeric'
  }).format(parseLocalDate(value))
}

function toUpdateTaskInput(task: TaskRecord, status = task.status): UpdateTaskInput {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    groupId: task.groupId,
    status,
    priority: task.priority,
    dueDate: task.dueDate,
    dueTime: task.dueTime
  }
}

function sortActiveTasks(tasks: TaskRecord[]): TaskRecord[] {
  const priorityRank: Record<TaskPriority, number> = { high: 0, normal: 1, low: 2 }
  return [...tasks].sort((left, right) => {
    const leftDate = left.dueDate ?? '9999-99-99'
    const rightDate = right.dueDate ?? '9999-99-99'
    if (leftDate !== rightDate) return leftDate.localeCompare(rightDate)
    const leftTime = left.dueTime ?? '99:99'
    const rightTime = right.dueTime ?? '99:99'
    if (leftTime !== rightTime) return leftTime.localeCompare(rightTime)
    if (priorityRank[left.priority] !== priorityRank[right.priority]) {
      return priorityRank[left.priority] - priorityRank[right.priority]
    }
    return right.updatedAt - left.updatedAt
  })
}

function sortCompletedTasks(tasks: TaskRecord[]): TaskRecord[] {
  return [...tasks].sort(
    (left, right) => (right.completedAt ?? right.updatedAt) - (left.completedAt ?? left.updatedAt)
  )
}

export function TasksPage({ resourceId, onResourceHandled }: TasksPageProps): React.JSX.Element {
  const [groups, setGroups] = useState<TaskGroupRecord[]>([])
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [viewFilter, setViewFilter] = useState<TaskViewFilter>('all')
  const [groupFilter, setGroupFilter] = useState<TaskGroupFilter>('all')
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all')
  const [query, setQuery] = useState('')
  const [quickTitle, setQuickTitle] = useState('')
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskRecord | null>(null)
  const [groupDialogOpen, setGroupDialogOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<TaskGroupRecord | null>(null)
  const [deleteTaskTarget, setDeleteTaskTarget] = useState<TaskRecord | null>(null)
  const [deleteGroupTarget, setDeleteGroupTarget] = useState<TaskGroupRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const handledResourceIdRef = useRef<string | null>(null)

  const now = new Date()
  const today = localDateKey(now)
  const nowTime = localTimeKey(now)

  const loadOverview = useCallback(async (): Promise<void> => {
    setError(null)
    try {
      const overview = await tasksClient.listOverview()
      setGroups(overview.groups)
      setTasks(overview.tasks)
    } catch (reason) {
      setError(errorMessage(reason))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) void loadOverview()
    })
    return () => {
      cancelled = true
    }
  }, [loadOverview])

  useEffect(() => {
    if (!resourceId) {
      handledResourceIdRef.current = null
      return
    }
    if (isLoading || handledResourceIdRef.current === resourceId) return

    handledResourceIdRef.current = resourceId
    const task = tasks.find((item) => item.id === resourceId)
    if (task) {
      setEditingTask(task)
      setTaskDialogOpen(true)
    }
    onResourceHandled?.()
  }, [isLoading, onResourceHandled, resourceId, tasks])

  const groupById = useMemo(() => new Map(groups.map((group) => [group.id, group])), [groups])

  const stats = useMemo(() => {
    const active = tasks.filter((task) => task.status === 'active')
    return {
      active: active.length,
      today: active.filter((task) => task.dueDate === today).length,
      overdue: active.filter((task) => isTaskOverdue(task, today, nowTime)).length,
      completed: tasks.filter((task) => task.status === 'completed').length
    }
  }, [nowTime, tasks, today])

  const groupActiveCounts = useMemo(() => {
    const counts = new Map<string, number>()
    let ungrouped = 0
    for (const task of tasks) {
      if (task.status !== 'active') continue
      if (task.groupId === null) {
        ungrouped += 1
      } else {
        counts.set(task.groupId, (counts.get(task.groupId) ?? 0) + 1)
      }
    }
    return { counts, ungrouped }
  }, [tasks])

  const visibleTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ru-RU')

    return tasks.filter((task) => {
      if (groupFilter === 'ungrouped' && task.groupId !== null) return false
      if (groupFilter !== 'all' && groupFilter !== 'ungrouped' && task.groupId !== groupFilter) {
        return false
      }
      if (priorityFilter !== PRIORITY_ALL && task.priority !== priorityFilter) return false

      if (viewFilter === 'active' && task.status !== 'active') return false
      if (viewFilter === 'completed' && task.status !== 'completed') return false
      if (viewFilter === 'today' && !(task.status === 'active' && task.dueDate === today)) return false
      if (viewFilter === 'overdue' && !isTaskOverdue(task, today, nowTime)) return false

      if (!normalizedQuery) return true
      const groupName = task.groupId ? groupById.get(task.groupId)?.name ?? '' : ''
      return [task.title, task.description, groupName]
        .join(' ')
        .toLocaleLowerCase('ru-RU')
        .includes(normalizedQuery)
    })
  }, [groupById, groupFilter, nowTime, priorityFilter, query, tasks, today, viewFilter])

  const sections = useMemo<TaskSection[]>(() => {
    if (viewFilter === 'completed') {
      return [
        {
          id: 'completed',
          title: 'Выполненные',
          tasks: sortCompletedTasks(visibleTasks),
          icon: <CheckCircle2 className="size-4" />,
          tone: 'success'
        }
      ]
    }

    if (viewFilter === 'today') {
      return [
        {
          id: 'today',
          title: 'Сегодня',
          tasks: sortActiveTasks(visibleTasks),
          icon: <CalendarClock className="size-4" />
        }
      ]
    }

    if (viewFilter === 'overdue') {
      return [
        {
          id: 'overdue',
          title: 'Просрочено',
          tasks: sortActiveTasks(visibleTasks),
          icon: <TriangleAlert className="size-4" />,
          tone: 'danger'
        }
      ]
    }

    const active = visibleTasks.filter((task) => task.status === 'active')
    const overdue = active.filter((task) => isTaskOverdue(task, today, nowTime))
    const todayTasks = active.filter(
      (task) => task.dueDate === today && !isTaskOverdue(task, today, nowTime)
    )
    const upcoming = active.filter((task) => task.dueDate !== null && task.dueDate > today)
    const noDueDate = active.filter((task) => task.dueDate === null)
    const result: TaskSection[] = [
      {
        id: 'overdue',
        title: 'Просрочено',
        tasks: sortActiveTasks(overdue),
        icon: <TriangleAlert className="size-4" />,
        tone: 'danger'
      },
      {
        id: 'today',
        title: 'Сегодня',
        tasks: sortActiveTasks(todayTasks),
        icon: <CalendarClock className="size-4" />
      },
      {
        id: 'upcoming',
        title: 'Предстоящие',
        tasks: sortActiveTasks(upcoming),
        icon: <Clock3 className="size-4" />
      },
      {
        id: 'without-date',
        title: 'Без срока',
        tasks: sortActiveTasks(noDueDate),
        icon: <Inbox className="size-4" />
      }
    ]

    if (viewFilter === 'all') {
      result.push({
        id: 'completed',
        title: 'Выполненные',
        tasks: sortCompletedTasks(visibleTasks.filter((task) => task.status === 'completed')),
        icon: <CheckCircle2 className="size-4" />,
        tone: 'success'
      })
    }

    return result
  }, [nowTime, today, viewFilter, visibleTasks])

  const nonEmptySections = sections.filter((section) => section.tasks.length > 0)

  const selectedGroupForNewTask =
    groupFilter !== 'all' && groupFilter !== 'ungrouped' && groupById.has(groupFilter)
      ? groupFilter
      : null

  function openNewTask(): void {
    setEditingTask(null)
    setTaskDialogOpen(true)
  }

  function openNewGroup(): void {
    setEditingGroup(null)
    setGroupDialogOpen(true)
  }

  async function saveTask(input: CreateTaskInput | UpdateTaskInput): Promise<void> {
    setIsSaving(true)
    setError(null)
    try {
      const saved =
        'id' in input ? await tasksClient.updateTask(input) : await tasksClient.createTask(input)
      setTasks((current) => [saved, ...current.filter((task) => task.id !== saved.id)])
    } catch (reason) {
      setError(errorMessage(reason))
      throw reason
    } finally {
      setIsSaving(false)
    }
  }

  async function saveGroup(
    input: CreateTaskGroupInput | UpdateTaskGroupInput
  ): Promise<void> {
    setIsSaving(true)
    setError(null)
    try {
      const saved =
        'id' in input ? await tasksClient.updateGroup(input) : await tasksClient.createGroup(input)
      setGroups((current) => {
        const exists = current.some((group) => group.id === saved.id)
        return exists
          ? current.map((group) => (group.id === saved.id ? saved : group))
          : [...current, saved]
      })
      if (!('id' in input)) setGroupFilter(saved.id)
    } catch (reason) {
      setError(errorMessage(reason))
      throw reason
    } finally {
      setIsSaving(false)
    }
  }

  async function quickAdd(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const title = quickTitle.trim()
    if (!title || isSaving) return

    const groupId =
      groupFilter === 'ungrouped'
        ? null
        : groupFilter !== 'all' && groupById.has(groupFilter)
          ? groupFilter
          : null

    await saveTask({
      title,
      description: '',
      groupId,
      status: 'active',
      priority: 'normal',
      dueDate: null,
      dueTime: null
    })
    setQuickTitle('')
  }

  async function toggleTask(task: TaskRecord): Promise<void> {
    await saveTask(toUpdateTaskInput(task, task.status === 'completed' ? 'active' : 'completed'))
  }

  async function confirmDeleteTask(): Promise<void> {
    if (!deleteTaskTarget) return
    setIsDeleting(true)
    setError(null)
    try {
      await tasksClient.deleteTask({ id: deleteTaskTarget.id })
      setTasks((current) => current.filter((task) => task.id !== deleteTaskTarget.id))
      setDeleteTaskTarget(null)
    } catch (reason) {
      setError(errorMessage(reason))
    } finally {
      setIsDeleting(false)
    }
  }

  async function confirmDeleteGroup(): Promise<void> {
    if (!deleteGroupTarget) return
    setIsDeleting(true)
    setError(null)
    try {
      await tasksClient.deleteGroup({ id: deleteGroupTarget.id })
      setGroups((current) => current.filter((group) => group.id !== deleteGroupTarget.id))
      setTasks((current) =>
        current.map((task) =>
          task.groupId === deleteGroupTarget.id ? { ...task, groupId: null } : task
        )
      )
      if (groupFilter === deleteGroupTarget.id) setGroupFilter('ungrouped')
      setDeleteGroupTarget(null)
    } catch (reason) {
      setError(errorMessage(reason))
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <main className="flex h-full items-center justify-center bg-[var(--app-workspace)] text-sm text-[var(--app-muted)]">
        Загружаем задачи…
      </main>
    )
  }

  return (
    <main className="h-full overflow-y-auto bg-[var(--app-workspace)] px-8 py-7 max-[700px]:px-4 max-[700px]:py-5">
      <div className="mx-auto w-full max-w-[1400px]">
        <header className="relative isolate overflow-hidden rounded-[28px] border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-[var(--app-shadow-card)]">
          <div aria-hidden="true" className="pointer-events-none absolute -top-32 right-8 -z-10 size-80 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="flex min-w-0 items-center gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10 text-violet-300">
                <ListTodo className="size-6" />
              </span>
              <div>
                <h1 className="text-3xl font-semibold tracking-[-0.035em] text-[var(--app-text)]">Задачи</h1>
                <p className="mt-1 text-sm text-[var(--app-muted)]">Дела по контекстам, срокам и приоритетам — без лишней сложности.</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-4 text-sm font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
                onClick={openNewGroup}
              >
                <FolderPlus className="size-4" /> Новая группа
              </button>
              <button
                type="button"
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-violet-400"
                onClick={openNewTask}
              >
                <Plus className="size-4" /> Новая задача
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { id: 'active' as const, label: 'Активные', value: stats.active, icon: Circle },
              { id: 'today' as const, label: 'Сегодня', value: stats.today, icon: CalendarClock },
              { id: 'overdue' as const, label: 'Просроченные', value: stats.overdue, icon: TriangleAlert },
              { id: 'completed' as const, label: 'Выполненные', value: stats.completed, icon: CheckCircle2 }
            ].map((stat) => {
              const Icon = stat.icon
              const danger = stat.id === 'overdue' && stat.value > 0
              return (
                <button
                  key={stat.id}
                  type="button"
                  className={cn(
                    'flex items-center justify-between rounded-2xl border bg-[var(--app-workspace)] px-4 py-3 text-left transition-colors',
                    viewFilter === stat.id
                      ? 'border-violet-400/30 bg-violet-500/10'
                      : danger
                        ? 'border-rose-400/20 hover:bg-rose-500/[0.06]'
                        : 'border-[var(--app-border)] hover:bg-[var(--app-control-hover)]'
                  )}
                  onClick={() => setViewFilter(stat.id)}
                >
                  <span>
                    <span className="block text-xs font-medium text-[var(--app-muted)]">{stat.label}</span>
                    <span className={cn('mt-1 block text-2xl font-semibold text-[var(--app-text)]', danger && 'text-rose-200')}>{stat.value}</span>
                  </span>
                  <Icon className={cn('size-5 text-[var(--app-muted)]', danger && 'text-rose-300')} />
                </button>
              )
            })}
          </div>
        </header>

        {error && (
          <div role="alert" className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <span>{error}</span>
            <button type="button" aria-label="Закрыть ошибку" className="flex size-7 items-center justify-center rounded-lg hover:bg-red-500/10" onClick={() => setError(null)}><X className="size-4" /></button>
          </div>
        )}

        <div className="mt-5 grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
          <aside className="self-start rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3 shadow-[var(--app-shadow-card)] lg:sticky lg:top-5">
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--app-muted)]">Группы</span>
              <button type="button" aria-label="Создать группу" className="flex size-7 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]" onClick={openNewGroup}><Plus className="size-4" /></button>
            </div>

            <div className="mt-2 space-y-1">
              <button
                type="button"
                className={cn(
                  'flex h-10 w-full items-center gap-2 rounded-xl px-3 text-sm transition-colors',
                  groupFilter === 'all' ? 'bg-violet-500/12 font-semibold text-violet-200' : 'text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'
                )}
                onClick={() => setGroupFilter('all')}
              >
                <ListTodo className="size-4" />
                <span className="min-w-0 flex-1 truncate text-left">Все задачи</span>
                <span className="text-xs opacity-70">{stats.active}</span>
              </button>

              <button
                type="button"
                className={cn(
                  'flex h-10 w-full items-center gap-2 rounded-xl px-3 text-sm transition-colors',
                  groupFilter === 'ungrouped' ? 'bg-violet-500/12 font-semibold text-violet-200' : 'text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'
                )}
                onClick={() => setGroupFilter('ungrouped')}
              >
                <Inbox className="size-4" />
                <span className="min-w-0 flex-1 truncate text-left">Без группы</span>
                <span className="text-xs opacity-70">{groupActiveCounts.ungrouped}</span>
              </button>
            </div>

            {groups.length > 0 && <div className="my-3 border-t border-[var(--app-border)]" />}

            <div className="space-y-1">
              {groups.map((group) => {
                const color = taskGroupColorClasses[group.color]
                const selected = groupFilter === group.id
                return (
                  <div key={group.id} className={cn('group flex items-center rounded-xl', selected && 'bg-[var(--app-control)]')}>
                    <button
                      type="button"
                      className={cn('flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-xl px-2.5 text-sm transition-colors', selected ? 'font-semibold text-[var(--app-text)]' : 'text-[var(--app-muted)] hover:text-[var(--app-text)]')}
                      onClick={() => setGroupFilter(group.id)}
                    >
                      <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-lg border', color.soft, color.text, color.border)}>
                        <TaskGroupIconGlyph icon={group.icon} className="size-3.5" />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-left">{group.name}</span>
                      <span className="text-xs opacity-60">{groupActiveCounts.counts.get(group.id) ?? 0}</span>
                    </button>
                    <div className={cn('mr-1 flex shrink-0 items-center', selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}>
                      <button type="button" aria-label={`Изменить группу «${group.name}»`} className="flex size-7 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]" onClick={() => { setEditingGroup(group); setGroupDialogOpen(true) }}><Pencil className="size-3.5" /></button>
                      <button type="button" aria-label={`Удалить группу «${group.name}»`} className="flex size-7 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-red-500/10 hover:text-red-300" onClick={() => setDeleteGroupTarget(group)}><Trash2 className="size-3.5" /></button>
                    </div>
                  </div>
                )
              })}
            </div>
          </aside>

          <section className="min-w-0 space-y-4">
            <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-[var(--app-shadow-card)]">
              <div className="flex flex-wrap gap-2">
                <label className="flex h-11 min-w-[240px] flex-1 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3.5 focus-within:border-violet-500/45 focus-within:ring-2 focus-within:ring-violet-500/10">
                  <Search className="size-4 shrink-0 text-[var(--app-muted)]" />
                  <input value={query} type="search" aria-label="Поиск по задачам" placeholder="Найти задачу…" className="min-w-0 flex-1 bg-transparent text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60" onChange={(event) => setQuery(event.target.value)} />
                  {query && <button type="button" aria-label="Очистить поиск задач" className="text-[var(--app-muted)] hover:text-[var(--app-text)]" onClick={() => setQuery('')}><X className="size-4" /></button>}
                </label>

                <div className="min-w-[150px]">
                  <AppSelect
                    ariaLabel="Фильтр по приоритету"
                    value={priorityFilter}
                    options={[{ value: PRIORITY_ALL, label: 'Все приоритеты' }, ...TASK_PRIORITY_OPTIONS]}
                    onValueChange={(value) => setPriorityFilter(value as TaskPriority | 'all')}
                  />
                </div>
              </div>

              <div className="mt-3 flex gap-1 overflow-x-auto rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-1">
                {viewFilters.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    aria-pressed={viewFilter === filter.id}
                    className={viewFilter === filter.id ? 'h-9 shrink-0 rounded-lg bg-violet-500 px-3.5 text-sm font-semibold text-white' : 'h-9 shrink-0 rounded-lg px-3.5 text-sm font-medium text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'}
                    onClick={() => setViewFilter(filter.id)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            <form className="flex items-center gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3 shadow-[var(--app-shadow-card)]" onSubmit={(event) => void quickAdd(event)}>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300"><Plus className="size-4" /></span>
              <input value={quickTitle} maxLength={240} aria-label="Быстро добавить задачу" placeholder={selectedGroupForNewTask ? `Новая задача в «${groupById.get(selectedGroupForNewTask)?.name ?? ''}»…` : 'Быстро добавить задачу…'} className="min-w-0 flex-1 bg-transparent text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60" onChange={(event) => setQuickTitle(event.target.value)} />
              <button type="submit" disabled={!quickTitle.trim() || isSaving} className="h-9 shrink-0 rounded-xl bg-violet-500 px-3.5 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-40">Добавить</button>
            </form>

            {nonEmptySections.length === 0 ? (
              <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--app-border)] bg-[var(--app-surface)] px-6 text-center">
                <span className="flex size-14 items-center justify-center rounded-2xl border border-violet-500/15 bg-violet-500/10 text-violet-300"><CheckCircle2 className="size-7" /></span>
                <h2 className="mt-4 text-lg font-semibold text-[var(--app-text)]">{tasks.length === 0 ? 'Задач пока нет' : 'Ничего не найдено'}</h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-[var(--app-muted)]">{tasks.length === 0 ? 'Добавьте первую задачу или сначала создайте группы вроде «Работа» и «Дом».' : 'Измените группу, статус, приоритет или строку поиска.'}</p>
                {tasks.length === 0 && <button type="button" className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white hover:bg-violet-400" onClick={openNewTask}><Plus className="size-4" /> Новая задача</button>}
              </div>
            ) : (
              nonEmptySections.map((section) => (
                <div key={section.id} className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[var(--app-shadow-card)]">
                  <div className="flex items-center gap-2 border-b border-[var(--app-border)] px-4 py-3">
                    <span className={cn('text-[var(--app-muted)]', section.tone === 'danger' && 'text-rose-300', section.tone === 'success' && 'text-emerald-300')}>{section.icon}</span>
                    <h2 className={cn('text-sm font-semibold text-[var(--app-text)]', section.tone === 'danger' && 'text-rose-200')}>{section.title}</h2>
                    <span className="ml-auto rounded-lg bg-[var(--app-control)] px-2 py-0.5 text-xs text-[var(--app-muted)]">{section.tasks.length}</span>
                  </div>

                  <div className="divide-y divide-[var(--app-border)]">
                    {section.tasks.map((task) => {
                      const group = task.groupId ? groupById.get(task.groupId) ?? null : null
                      const overdue = isTaskOverdue(task, today, nowTime)
                      return (
                        <article key={task.id} className={cn('group/task flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-[var(--app-control-hover)]', task.status === 'completed' && 'opacity-65')}>
                          <button
                            type="button"
                            aria-label={task.status === 'completed' ? `Вернуть задачу «${task.title}»` : `Выполнить задачу «${task.title}»`}
                            aria-pressed={task.status === 'completed'}
                            disabled={isSaving}
                            className={cn('mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors', task.status === 'completed' ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300' : 'border-[var(--app-border-strong)] text-transparent hover:border-violet-400/50 hover:bg-violet-500/10 hover:text-violet-300')}
                            onClick={() => void toggleTask(task)}
                          >
                            <Check className="size-3.5" />
                          </button>

                          <button type="button" className="min-w-0 flex-1 text-left outline-none" onClick={() => { setEditingTask(task); setTaskDialogOpen(true) }}>
                            <div className={cn('text-sm font-semibold leading-5 text-[var(--app-text)]', task.status === 'completed' && 'line-through decoration-[var(--app-muted)]/70')}>{task.title}</div>
                            {task.description && <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--app-muted)]">{task.description}</p>}

                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              {group && (() => {
                                const color = taskGroupColorClasses[group.color]
                                return <span className={cn('inline-flex h-6 items-center gap-1.5 rounded-lg border px-2 text-[11px] font-medium', color.soft, color.text, color.border)}><TaskGroupIconGlyph icon={group.icon} className="size-3" />{group.name}</span>
                              })()}
                              {task.dueDate && <span className={cn('inline-flex h-6 items-center gap-1 rounded-lg border px-2 text-[11px] font-medium', overdue ? 'border-rose-400/25 bg-rose-500/10 text-rose-200' : task.dueDate === today ? 'border-violet-400/25 bg-violet-500/10 text-violet-200' : 'border-[var(--app-border)] bg-[var(--app-control)] text-[var(--app-muted)]')}><CalendarClock className="size-3" />{formatDueDate(task.dueDate, today)}{task.dueTime ? ` · ${task.dueTime}` : ''}</span>}
                              {task.priority !== 'normal' && <span className={cn('inline-flex h-6 items-center rounded-lg border px-2 text-[11px] font-medium', taskPriorityClassName(task.priority))}>{taskPriorityLabel(task.priority)}</span>}
                            </div>
                          </button>

                          <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover/task:opacity-100 focus-within:opacity-100">
                            <button type="button" aria-label={`Изменить задачу «${task.title}»`} className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-control)] hover:text-[var(--app-text)]" onClick={() => { setEditingTask(task); setTaskDialogOpen(true) }}><Pencil className="size-3.5" /></button>
                            <button type="button" aria-label={`Удалить задачу «${task.title}»`} className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-red-500/10 hover:text-red-300" onClick={() => setDeleteTaskTarget(task)}><Trash2 className="size-3.5" /></button>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </section>
        </div>
      </div>

      <TaskDialog
        open={taskDialogOpen}
        task={editingTask}
        groups={groups}
        initialGroupId={selectedGroupForNewTask}
        busy={isSaving}
        onOpenChange={(open) => {
          setTaskDialogOpen(open)
          if (!open) setEditingTask(null)
        }}
        onSave={saveTask}
      />

      <TaskGroupDialog
        open={groupDialogOpen}
        group={editingGroup}
        busy={isSaving}
        onOpenChange={(open) => {
          setGroupDialogOpen(open)
          if (!open) setEditingGroup(null)
        }}
        onSave={saveGroup}
      />

      <DeleteConfirmationDialog
        open={deleteTaskTarget !== null}
        title="Удалить задачу?"
        subject={deleteTaskTarget?.title}
        description="Задача будет окончательно удалена."
        isSubmitting={isDeleting}
        error={error}
        onOpenChange={(open) => {
          if (!open) setDeleteTaskTarget(null)
        }}
        onConfirm={confirmDeleteTask}
      />

      <DeleteConfirmationDialog
        open={deleteGroupTarget !== null}
        title="Удалить группу?"
        subject={deleteGroupTarget?.name}
        description="Сами задачи сохранятся и будут перенесены в «Без группы»."
        notice="Задачи из этой группы не удаляются"
        isSubmitting={isDeleting}
        error={error}
        onOpenChange={(open) => {
          if (!open) setDeleteGroupTarget(null)
        }}
        onConfirm={confirmDeleteGroup}
      />
    </main>
  )
}
