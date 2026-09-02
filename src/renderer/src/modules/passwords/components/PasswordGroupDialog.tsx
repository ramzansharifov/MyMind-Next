import { Tooltip } from '../../../shared/ui/tooltip'
import { FolderPlus } from 'lucide-react'
import { useEffect, useState } from 'react'

import type {
  CreatePasswordGroupInput,
  PasswordGroupColor,
  PasswordGroupIcon,
  PasswordGroupRecord,
  UpdatePasswordGroupInput
} from '../../../../../shared/contracts/passwords'
import { cn } from '../../../shared/lib/cn'
import { AppDialog } from '../../../shared/ui/AppDialog'
import {
  PASSWORD_GROUP_COLOR_OPTIONS,
  PASSWORD_GROUP_ICON_OPTIONS,
  PasswordGroupIconGlyph,
  passwordGroupColorClasses
} from '../password-options'

const GROUP_FORM_ID = 'password-group-editor-form'

interface PasswordGroupDialogProps {
  open: boolean
  group: PasswordGroupRecord | null
  busy: boolean
  onOpenChange: (open: boolean) => void
  onSave: (input: CreatePasswordGroupInput | UpdatePasswordGroupInput) => Promise<void>
}

export function PasswordGroupDialog({
  open,
  group,
  busy,
  onOpenChange,
  onSave
}: PasswordGroupDialogProps): React.JSX.Element {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState<PasswordGroupIcon>('folder')
  const [color, setColor] = useState<PasswordGroupColor>('violet')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName(group?.name ?? '')
    setIcon(group?.icon ?? 'folder')
    setColor(group?.color ?? 'violet')
    setError(null)
  }, [group, open])

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    const normalizedName = name.trim()
    if (!normalizedName || busy) return

    setError(null)
    const input: CreatePasswordGroupInput = { name: normalizedName, icon, color }
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
      description="Организуйте доступы по контекстам — например, Работа, Личное, Разработка или Финансы."
      icon={<FolderPlus />}
      size="md"
      busy={busy}
      footer={
        <>
          <button
            type="button"
            disabled={busy}
            className="h-10 rounded-xl px-4 text-sm font-medium text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] disabled:opacity-45"
            onClick={() => onOpenChange(false)}
          >
            Отмена
          </button>
          <button
            type="submit"
            form={GROUP_FORM_ID}
            disabled={busy || !name.trim()}
            className="h-10 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-45"
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
            className="h-11 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3.5 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60 focus:border-violet-500/45 focus:ring-2 focus:ring-violet-500/15"
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <div className="space-y-2">
          <span className="block text-xs font-medium text-[var(--app-muted)]">Иконка</span>
          <div className="grid grid-cols-6 gap-2 max-[520px]:grid-cols-4">
            {PASSWORD_GROUP_ICON_OPTIONS.map((option) => (
              <Tooltip content={`Иконка: ${option.label}`} side="top" key={option.value}>
                <button
                  type="button"
                  aria-label={`Иконка: ${option.label}`}
                  aria-pressed={icon === option.value}
                  className={cn(
                    'flex aspect-square items-center justify-center rounded-xl border text-[var(--app-muted)] transition-colors outline-none',
                    icon === option.value
                      ? 'border-violet-400/35 bg-violet-500/15 text-violet-200 ring-2 ring-violet-500/10'
                      : 'border-[var(--app-border)] bg-[var(--app-workspace)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'
                  )}
                  onClick={() => setIcon(option.value)}
                >
                  <PasswordGroupIconGlyph icon={option.value} className="size-5" />
                </button>
              </Tooltip>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <span className="block text-xs font-medium text-[var(--app-muted)]">Цвет</span>
          <div className="grid grid-cols-8 gap-2 max-[520px]:grid-cols-4">
            {PASSWORD_GROUP_COLOR_OPTIONS.map((option) => {
              const classes = passwordGroupColorClasses[option.value]
              return (
                <Tooltip content={`Цвет: ${option.label}`} side="top" key={option.value}>
                  <button
                    type="button"
                    aria-label={`Цвет: ${option.label}`}
                    aria-pressed={color === option.value}
                    className={cn(
                      'flex aspect-square items-center justify-center rounded-xl border bg-[var(--app-workspace)] transition-transform outline-none hover:scale-105',
                      color === option.value
                        ? `${classes.border} ring-2 ring-white/10`
                        : 'border-[var(--app-border)]'
                    )}
                    onClick={() => setColor(option.value)}
                  >
                    <span className={cn('size-5 rounded-full shadow-sm', classes.dot)} />
                  </button>
                </Tooltip>
              )
            })}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-4 py-3">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                'flex size-9 items-center justify-center rounded-xl border',
                passwordGroupColorClasses[color].soft,
                passwordGroupColorClasses[color].text,
                passwordGroupColorClasses[color].border
              )}
            >
              <PasswordGroupIconGlyph icon={icon} className="size-4" />
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-[var(--app-text)]">
                {name.trim() || 'Название группы'}
              </div>
              <div className="mt-0.5 text-xs text-[var(--app-muted)]">
                Так группа будет выглядеть в хранилище
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
