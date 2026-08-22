import { AnimatePresence } from 'framer-motion'
import {
  CheckCircle2,
  FolderPlus,
  Inbox,
  ListTodo,
  Pencil,
  Plus,
  Search,
  Trash2,
  X
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type {
  CreateTaskGroupInput,
  CreateTaskInput,
  TaskGroupRecord,
  TaskRecord,
  UpdateTaskGroupInput,
  UpdateTaskInput
} from '../../../../shared/contracts/tasks'
import { cn } from '../../shared/lib/cn'
import { DeleteConfirmationDialog } from '../../shared/ui/DeleteConfirmationDialog'
import { ModuleHeader } from '../../shared/ui/ModuleHeader'
import { StandardModulePage } from '../../shared/ui/StandardModulePage'
import { tasksClient } from './api/tasks-client'
import { TaskDialog } from './components/TaskDialog'
import { TaskGroupDialog } from './components/TaskGroupDialog'
import { TaskRow } from './components/TaskRow'
import { TaskGroupIconGlyph, taskGroupColorClasses } from './task-options'

type TaskViewFilter = 'all' | 'active' | 'completed'
type TaskGroupFilter = 'all' | 'ungrouped' | string

interface TasksPageProps {
  resourceId?: string | null
  onResourceHandled?: () => void
}

const viewFilters: Array<{ id: TaskViewFilter; label: string }> = [
  { id: 'all', label: 'Все' },
  { id: 'active', label: 'Активные' },
  { id: 'completed', label: 'Выполненные' }
]

function errorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : 'Не удалось выполнить действие'
}

function toUpdateTaskInput(
  task: TaskRecord,
  status = task.status,
  groupId = task.groupId
): UpdateTaskInput {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    groupId,
    status,
    priority: task.priority,
    dueDate: task.dueDate,
    dueTime: task.dueTime
  }
}

function sortTasks(tasks: TaskRecord[]): TaskRecord[] {
  return [...tasks].sort((left, right) => {
    if (left.status !== right.status) return left.status === 'active' ? -1 : 1

    const leftActivity =
      left.status === 'completed' ? (left.completedAt ?? left.updatedAt) : left.updatedAt
    const rightActivity =
      right.status === 'completed' ? (right.completedAt ?? right.updatedAt) : right.updatedAt

    if (leftActivity !== rightActivity) return rightActivity - leftActivity
    return right.createdAt - left.createdAt
  })
}

export function TasksPage({ resourceId, onResourceHandled }: TasksPageProps): React.JSX.Element {
  const [groups, setGroups] = useState<TaskGroupRecord[]>([])
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [viewFilter, setViewFilter] = useState<TaskViewFilter>('all')
  const [groupFilter, setGroupFilter] = useState<TaskGroupFilter>('all')
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

  const groupTaskCounts = useMemo(() => {
    const counts = new Map<string, number>()
    let ungrouped = 0

    for (const task of tasks) {
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

    return sortTasks(
      tasks.filter((task) => {
        if (groupFilter === 'ungrouped' && task.groupId !== null) return false
        if (groupFilter !== 'all' && groupFilter !== 'ungrouped' && task.groupId !== groupFilter) {
          return false
        }

        if (viewFilter !== 'all' && task.status !== viewFilter) return false

        if (!normalizedQuery) return true
        const groupName = task.groupId ? (groupById.get(task.groupId)?.name ?? '') : ''
        return [task.title, groupName]
          .join(' ')
          .toLocaleLowerCase('ru-RU')
          .includes(normalizedQuery)
      })
    )
  }, [groupById, groupFilter, query, tasks, viewFilter])

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

  async function saveGroup(input: CreateTaskGroupInput | UpdateTaskGroupInput): Promise<void> {
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

    try {
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
    } catch {
      return
    }
  }

  async function toggleTask(task: TaskRecord): Promise<void> {
    if (isSaving) return

    try {
      await saveTask(toUpdateTaskInput(task, task.status === 'completed' ? 'active' : 'completed'))
    } catch {
      return
    }
  }

  async function moveTaskToGroup(task: TaskRecord, groupId: string): Promise<void> {
    if (isSaving) return

    const nextGroupId = task.groupId === groupId ? null : groupId

    try {
      await saveTask(toUpdateTaskInput(task, task.status, nextGroupId))
    } catch {
      return
    }
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
      <StandardModulePage>
        <div className="flex min-h-[70vh] items-center justify-center text-sm text-[var(--app-muted)]">
          Загружаем задачи…
        </div>
      </StandardModulePage>
    )
  }

  return (
    <StandardModulePage>
      <ModuleHeader
        icon={ListTodo}
        title="Задачи"
        description="Простой список дел: название, группа и статус."
        actions={
          <>
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
          </>
        }
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3.5 focus-within:border-violet-500/45 focus-within:ring-2 focus-within:ring-violet-500/10">
            <Search className="size-4 shrink-0 text-[var(--app-muted)]" />
            <input
              value={query}
              type="text"
              role="searchbox"
              aria-label="Поиск по задачам"
              placeholder="Найти задачу…"
              className="min-w-0 flex-1 bg-transparent text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60"
              onChange={(event) => setQuery(event.target.value)}
            />
            {query && (
              <button
                type="button"
                aria-label="Очистить поиск задач"
                className="text-[var(--app-muted)] hover:text-[var(--app-text)]"
                onClick={() => setQuery('')}
              >
                <X className="size-4" />
              </button>
            )}
          </label>

          <div className="flex shrink-0 gap-1 overflow-x-auto rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-1">
            {viewFilters.map((filter) => (
              <button
                key={filter.id}
                type="button"
                aria-pressed={viewFilter === filter.id}
                className={
                  viewFilter === filter.id
                    ? 'h-9 shrink-0 rounded-lg bg-violet-500 px-3.5 text-sm font-semibold text-white'
                    : 'h-9 shrink-0 rounded-lg px-3.5 text-sm font-medium text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'
                }
                onClick={() => setViewFilter(filter.id)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </ModuleHeader>

      {error && (
        <div
          role="alert"
          className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          <span>{error}</span>
          <button
            type="button"
            aria-label="Закрыть ошибку"
            className="flex size-7 items-center justify-center rounded-lg hover:bg-red-500/10"
            onClick={() => setError(null)}
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="self-start rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3 shadow-[var(--app-shadow-card)] lg:sticky lg:top-5">
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-xs font-semibold tracking-[0.12em] text-[var(--app-muted)] uppercase">
              Группы
            </span>
            <button
              type="button"
              aria-label="Создать группу"
              className="flex size-7 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
              onClick={openNewGroup}
            >
              <Plus className="size-4" />
            </button>
          </div>

          <div className="mt-2 space-y-1">
            <button
              type="button"
              className={cn(
                'flex h-10 w-full items-center gap-2 rounded-xl px-3 text-sm transition-colors',
                groupFilter === 'all'
                  ? 'bg-violet-500/12 font-semibold text-violet-200'
                  : 'text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'
              )}
              onClick={() => setGroupFilter('all')}
            >
              <ListTodo className="size-4" />
              <span className="min-w-0 flex-1 truncate text-left">Все задачи</span>
              <span className="text-xs opacity-70">{tasks.length}</span>
            </button>

            <button
              type="button"
              className={cn(
                'flex h-10 w-full items-center gap-2 rounded-xl px-3 text-sm transition-colors',
                groupFilter === 'ungrouped'
                  ? 'bg-violet-500/12 font-semibold text-violet-200'
                  : 'text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'
              )}
              onClick={() => setGroupFilter('ungrouped')}
            >
              <Inbox className="size-4" />
              <span className="min-w-0 flex-1 truncate text-left">Без группы</span>
              <span className="text-xs opacity-70">{groupTaskCounts.ungrouped}</span>
            </button>
          </div>

          {groups.length > 0 && <div className="my-3 border-t border-[var(--app-border)]" />}

          <div className="space-y-1">
            {groups.map((group) => {
              const color = taskGroupColorClasses[group.color]
              const selected = groupFilter === group.id

              return (
                <div
                  key={group.id}
                  className={cn(
                    'flex items-center rounded-xl',
                    selected && 'bg-[var(--app-control)]'
                  )}
                >
                  <button
                    type="button"
                    className={cn(
                      'flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-xl px-2.5 text-sm transition-colors',
                      selected
                        ? 'font-semibold text-[var(--app-text)]'
                        : 'text-[var(--app-muted)] hover:text-[var(--app-text)]'
                    )}
                    onClick={() => setGroupFilter(group.id)}
                  >
                    <span
                      className={cn(
                        'flex size-7 shrink-0 items-center justify-center rounded-lg border',
                        color.soft,
                        color.text,
                        color.border
                      )}
                    >
                      <TaskGroupIconGlyph icon={group.icon} className="size-3.5" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-left">{group.name}</span>
                    <span className="text-xs opacity-60">
                      {groupTaskCounts.counts.get(group.id) ?? 0}
                    </span>
                  </button>
                  <div className="mr-1 flex shrink-0 items-center">
                    <button
                      type="button"
                      aria-label={`Изменить группу «${group.name}»`}
                      className="flex size-7 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
                      onClick={() => {
                        setEditingGroup(group)
                        setGroupDialogOpen(true)
                      }}
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Удалить группу «${group.name}»`}
                      className="flex size-7 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-red-500/10 hover:text-red-300"
                      onClick={() => setDeleteGroupTarget(group)}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </aside>

        <section className="min-w-0 space-y-4">
          <form
            className="flex items-center gap-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3 shadow-[var(--app-shadow-card)]"
            onSubmit={(event) => void quickAdd(event)}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
              <Plus className="size-4" />
            </span>
            <input
              value={quickTitle}
              maxLength={240}
              aria-label="Быстро добавить задачу"
              placeholder={
                selectedGroupForNewTask
                  ? `Новая задача в «${groupById.get(selectedGroupForNewTask)?.name ?? ''}»…`
                  : 'Быстро добавить задачу…'
              }
              className="min-w-0 flex-1 bg-transparent text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60"
              onChange={(event) => setQuickTitle(event.target.value)}
            />
            <button
              type="submit"
              disabled={!quickTitle.trim() || isSaving}
              className="h-9 shrink-0 rounded-xl bg-violet-500 px-3.5 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-40"
            >
              Добавить
            </button>
          </form>

          {visibleTasks.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--app-border)] bg-[var(--app-surface)] px-6 text-center">
              <span className="flex size-14 items-center justify-center rounded-2xl border border-violet-500/15 bg-violet-500/10 text-violet-300">
                <CheckCircle2 className="size-7" />
              </span>
              <h2 className="mt-4 text-lg font-semibold text-[var(--app-text)]">
                {tasks.length === 0 ? 'Задач пока нет' : 'Ничего не найдено'}
              </h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-[var(--app-muted)]">
                {tasks.length === 0
                  ? 'Добавьте первую задачу или сначала создайте группу.'
                  : 'Измените группу, статус или строку поиска.'}
              </p>
              {tasks.length === 0 && (
                <button
                  type="button"
                  className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white hover:bg-violet-400"
                  onClick={openNewTask}
                >
                  <Plus className="size-4" /> Новая задача
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[var(--app-shadow-card)]">
              <div className="divide-y divide-[var(--app-border)]">
                <AnimatePresence initial={false} mode="popLayout">
                  {visibleTasks.map((task) => {
                    const group = task.groupId ? (groupById.get(task.groupId) ?? null) : null

                    return (
                      <TaskRow
                        key={task.id}
                        task={task}
                        group={group}
                        groups={groups}
                        busy={isSaving}
                        onToggle={() => toggleTask(task)}
                        onMove={(groupId) => moveTaskToGroup(task, groupId)}
                        onEdit={() => {
                          setEditingTask(task)
                          setTaskDialogOpen(true)
                        }}
                        onDelete={() => setDeleteTaskTarget(task)}
                      />
                    )
                  })}
                </AnimatePresence>
              </div>
            </div>
          )}
        </section>
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
    </StandardModulePage>
  )
}
