import { CalendarDays, ListTodo } from 'lucide-react'
import { useEffect, useState } from 'react'

import type {
  CreateTaskInput,
  TaskGroupRecord,
  TaskPriority,
  TaskRecord,
  TaskStatus,
  UpdateTaskInput
} from '../../../../../shared/contracts/tasks'
import { AppDialog } from '../../../shared/ui/AppDialog'
import { AppSelect } from '../../../shared/ui/AppSelect'
import { TASK_PRIORITY_OPTIONS } from '../task-options'

const NO_GROUP_VALUE = '__none__'
const TASK_FORM_ID = 'task-editor-form'

interface TaskDialogProps {
  open: boolean
  task: TaskRecord | null
  groups: TaskGroupRecord[]
  initialGroupId: string | null
  busy: boolean
  onOpenChange: (open: boolean) => void
  onSave: (input: CreateTaskInput | UpdateTaskInput) => Promise<void>
}

export function TaskDialog({
  open,
  task,
  groups,
  initialGroupId,
  busy,
  onOpenChange,
  onSave
}: TaskDialogProps): React.JSX.Element {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [groupId, setGroupId] = useState(NO_GROUP_VALUE)
  const [status, setStatus] = useState<TaskStatus>('active')
  const [priority, setPriority] = useState<TaskPriority>('normal')
  const [dueDate, setDueDate] = useState('')
  const [dueTime, setDueTime] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    const initialGroupExists =
      initialGroupId !== null && groups.some((group) => group.id === initialGroupId)

    setTitle(task?.title ?? '')
    setDescription(task?.description ?? '')
    setGroupId(task?.groupId ?? (initialGroupExists ? initialGroupId : NO_GROUP_VALUE))
    setStatus(task?.status ?? 'active')
    setPriority(task?.priority ?? 'normal')
    setDueDate(task?.dueDate ?? '')
    setDueTime(task?.dueTime ?? '')
    setError(null)
  }, [groups, initialGroupId, open, task])

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const normalizedTitle = title.trim()
    if (!normalizedTitle || busy) return

    setError(null)
    const input: CreateTaskInput = {
      title: normalizedTitle,
      description: description.trim(),
      groupId: groupId === NO_GROUP_VALUE ? null : groupId,
      status,
      priority,
      dueDate: dueDate || null,
      dueTime: dueDate && dueTime ? dueTime : null
    }

    try {
      await onSave(task ? { ...input, id: task.id } : input)
      onOpenChange(false)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось сохранить задачу')
    }
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={task ? 'Изменить задачу' : 'Новая задача'}
      description="Настройте задачу, её группу, срок и приоритет."
      icon={<ListTodo />}
      size="lg"
      busy={busy}
      footer={
        <>
          <button
            type="button"
            disabled={busy}
            className="h-10 rounded-xl px-4 text-sm font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] disabled:opacity-45"
            onClick={() => onOpenChange(false)}
          >
            Отмена
          </button>
          <button
            type="submit"
            form={TASK_FORM_ID}
            disabled={busy || !title.trim()}
            className="h-10 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {busy ? 'Сохраняем…' : task ? 'Сохранить' : 'Создать задачу'}
          </button>
        </>
      }
    >
      <form id={TASK_FORM_ID} className="space-y-5" onSubmit={(event) => void submit(event)}>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-[var(--app-muted)]">Название</span>
          <input
            autoFocus
            value={title}
            maxLength={240}
            placeholder="Что нужно сделать?"
            className="h-11 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3.5 text-sm text-[var(--app-text)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--app-muted)]/60 focus:border-violet-500/45 focus:ring-2 focus:ring-violet-500/15"
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-[var(--app-muted)]">Описание</span>
          <textarea
            value={description}
            maxLength={5000}
            rows={4}
            placeholder="Детали, заметки, полезный контекст…"
            className="w-full resize-y rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3.5 py-3 text-sm leading-6 text-[var(--app-text)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--app-muted)]/60 focus:border-violet-500/45 focus:ring-2 focus:ring-violet-500/15"
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <span className="block text-xs font-medium text-[var(--app-muted)]">Группа</span>
            <AppSelect
              ariaLabel="Группа задачи"
              value={groupId}
              options={[
                { value: NO_GROUP_VALUE, label: 'Без группы' },
                ...groups.map((group) => ({ value: group.id, label: group.name }))
              ]}
              onValueChange={setGroupId}
            />
          </div>

          <div className="space-y-1.5">
            <span className="block text-xs font-medium text-[var(--app-muted)]">Приоритет</span>
            <AppSelect
              ariaLabel="Приоритет задачи"
              value={priority}
              options={TASK_PRIORITY_OPTIONS}
              onValueChange={(value) => setPriority(value as TaskPriority)}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-[var(--app-text)]">
            <CalendarDays className="size-4 text-violet-300" /> Срок
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="block text-xs text-[var(--app-muted)]">Дата</span>
              <input
                type="date"
                value={dueDate}
                min="1900-01-01"
                max="2200-12-31"
                className="h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-violet-500/45 focus:ring-2 focus:ring-violet-500/15"
                onChange={(event) => {
                  setDueDate(event.target.value)
                  if (!event.target.value) setDueTime('')
                }}
              />
            </label>
            <label className="space-y-1.5">
              <span className="block text-xs text-[var(--app-muted)]">Время</span>
              <input
                type="time"
                value={dueTime}
                disabled={!dueDate}
                className="h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-violet-500/45 focus:ring-2 focus:ring-violet-500/15 disabled:cursor-not-allowed disabled:opacity-40"
                onChange={(event) => setDueTime(event.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="block text-xs font-medium text-[var(--app-muted)]">Статус</span>
          <div className="grid grid-cols-2 gap-1 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-1">
            {(
              [
                { value: 'active', label: 'Активная' },
                { value: 'completed', label: 'Выполнена' }
              ] as Array<{ value: TaskStatus; label: string }>
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={status === option.value}
                className={
                  status === option.value
                    ? 'h-9 rounded-lg bg-violet-500 text-sm font-semibold text-white'
                    : 'h-9 rounded-lg text-sm font-medium text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'
                }
                onClick={() => setStatus(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}
      </form>
    </AppDialog>
  )
}
