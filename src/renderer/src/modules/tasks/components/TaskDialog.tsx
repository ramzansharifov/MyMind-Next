import { ListTodo } from 'lucide-react'
import { useEffect, useState } from 'react'

import type {
  CreateTaskInput,
  TaskGroupRecord,
  TaskRecord,
  TaskStatus,
  UpdateTaskInput
} from '../../../../../shared/contracts/tasks'
import { AppDialog } from '../../../shared/ui/AppDialog'
import { AppSelect } from '../../../shared/ui/AppSelect'

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
  const [groupId, setGroupId] = useState(NO_GROUP_VALUE)
  const [status, setStatus] = useState<TaskStatus>('active')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    const initialGroupExists =
      initialGroupId !== null && groups.some((group) => group.id === initialGroupId)
    const initialGroup = task
      ? (task.groupId ?? NO_GROUP_VALUE)
      : initialGroupExists && initialGroupId
        ? initialGroupId
        : NO_GROUP_VALUE

    setTitle(task?.title ?? '')
    setGroupId(initialGroup)
    setStatus(task?.status ?? 'active')
    setError(null)
  }, [groups, initialGroupId, open, task])

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const normalizedTitle = title.trim()
    if (!normalizedTitle || busy) return

    setError(null)
    const input: CreateTaskInput = {
      title: normalizedTitle,
      description: task?.description ?? '',
      groupId: groupId === NO_GROUP_VALUE ? null : groupId,
      status,
      priority: task?.priority ?? 'normal',
      dueDate: task?.dueDate ?? null,
      dueTime: task?.dueTime ?? null
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
      description="Название, группа и статус — ничего лишнего."
      icon={<ListTodo />}
      size="md"
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
            className="bg-accent-500 hover:bg-accent-400 h-10 rounded-xl px-4 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-45"
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
            className="focus:border-accent-500/45 focus:ring-accent-500/15 h-11 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3.5 text-sm text-[var(--app-text)] transition-[border-color,box-shadow] outline-none placeholder:text-[var(--app-muted)]/60 focus:ring-2"
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>

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
                    ? 'bg-accent-500 h-9 rounded-lg text-sm font-semibold text-white'
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
          <div
            role="alert"
            className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300"
          >
            {error}
          </div>
        )}
      </form>
    </AppDialog>
  )
}
