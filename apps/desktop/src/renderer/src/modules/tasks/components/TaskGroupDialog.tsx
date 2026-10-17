import { FolderPlus } from 'lucide-react'
import { useState } from 'react'

import type {
  CreateTaskGroupInput,
  TaskGroupIcon,
  TaskGroupRecord,
  UpdateTaskGroupInput
} from '../../../../../shared/contracts/tasks'
import { cn } from '../../../shared/lib/cn'
import { AppDialog } from '../../../shared/ui/AppDialog'
import { Tooltip } from '../../../shared/ui/tooltip'
import { TASK_GROUP_ICON_OPTIONS } from '../task-options'
import { TaskGroupIconGlyph } from '../task-icons'

const GROUP_FORM_ID = 'task-group-editor-form'

interface TaskGroupDialogProps {
  open: boolean
  group: TaskGroupRecord | null
  busy: boolean
  onOpenChange: (open: boolean) => void
  onSave: (input: CreateTaskGroupInput | UpdateTaskGroupInput) => Promise<void>
}

export function TaskGroupDialog({
  open,
  group,
  busy,
  onOpenChange,
  onSave
}: TaskGroupDialogProps): React.JSX.Element {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState<TaskGroupIcon>('folder')
  const [error, setError] = useState<string | null>(null)

  const [formInputs, setFormInputs] = useState<{ group: typeof group; open: typeof open } | null>(
    null
  )
  if (formInputs === null || formInputs.group !== group || formInputs.open !== open) {
    setFormInputs({ group: group, open: open })
    if (open) {
      setName(group?.name ?? '')
      setIcon(group?.icon ?? 'folder')
      setError(null)
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const normalizedName = name.trim()
    if (!normalizedName || busy) return

    setError(null)
    const input: CreateTaskGroupInput = { name: normalizedName, icon }

    try {
      await onSave(group ? { ...input, id: group.id } : input)
      onOpenChange(false)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось сохранить группу')
    }
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={group ? 'Изменить группу' : 'Новая группа'}
      description="Создайте отдельный контекст для задач — например, Работа, Дом или Покупки."
      icon={<FolderPlus />}
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
            form={GROUP_FORM_ID}
            disabled={busy || !name.trim()}
            className="bg-accent-500 hover:bg-accent-400 h-10 rounded-xl px-4 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-45"
          >
            {busy ? 'Сохраняем…' : group ? 'Сохранить' : 'Создать группу'}
          </button>
        </>
      }
    >
      <form id={GROUP_FORM_ID} className="space-y-5" onSubmit={(event) => void submit(event)}>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-[var(--app-muted)]">Название</span>
          <input
            autoFocus
            value={name}
            maxLength={80}
            placeholder="Например, Работа"
            className="focus:border-accent-500/45 focus:ring-accent-500/15 h-11 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3.5 text-sm text-[var(--app-text)] transition-[border-color,box-shadow] outline-none placeholder:text-[var(--app-muted)]/60 focus:ring-2"
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <div className="space-y-2">
          <span className="block text-xs font-medium text-[var(--app-muted)]">Иконка</span>
          <div className="grid grid-cols-6 gap-2 max-[520px]:grid-cols-4">
            {TASK_GROUP_ICON_OPTIONS.map((option) => (
              <Tooltip content={`Иконка: ${option.label}`} side="top" key={option.value}>
                <button
                  type="button"
                  aria-label={`Иконка: ${option.label}`}
                  aria-pressed={icon === option.value}
                  className={cn(
                    'flex aspect-square items-center justify-center rounded-xl border text-[var(--app-muted)] transition-colors outline-none',
                    icon === option.value
                      ? 'border-accent-400/35 bg-accent-500/15 text-accent-200 ring-accent-500/10 ring-2'
                      : 'border-[var(--app-border)] bg-[var(--app-workspace)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'
                  )}
                  onClick={() => setIcon(option.value)}
                >
                  <TaskGroupIconGlyph icon={option.value} className="size-5" />
                </button>
              </Tooltip>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="border-accent-400/25 bg-accent-500/12 text-accent-300 flex size-9 items-center justify-center rounded-xl border">
              <TaskGroupIconGlyph icon={icon} className="size-4" />
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-[var(--app-text)]">
                {name.trim() || 'Название группы'}
              </div>
              <div className="mt-0.5 text-xs text-[var(--app-muted)]">
                Так группа будет выглядеть в списке
              </div>
            </div>
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
