import { Tooltip } from '../../../shared/ui/tooltip'
import {
  ClipboardCopy,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Pencil,
  ShieldAlert,
  Star,
  UserRound
} from 'lucide-react'
import { useEffect, useState } from 'react'

import type {
  PasswordGroupRecord,
  PasswordItemRecord
} from '../../../../../shared/contracts/passwords'
import { cn } from '../../../shared/lib/cn'
import { AppDialog } from '../../../shared/ui/AppDialog'
import {
  passwordIssueClassName,
  passwordIssueLabel,
  passwordStrengthClassName,
  passwordStrengthLabel,
  passwordTypeLabel
} from '../password-options'

interface PasswordDetailDialogProps {
  open: boolean
  item: PasswordItemRecord | null
  group: PasswordGroupRecord | null
  onOpenChange: (open: boolean) => void
  onEdit: () => void
  onCopy: (field: 'username' | 'password') => Promise<void>
  onOpenWebsite: () => Promise<void>
}

export function PasswordDetailDialog({
  open,
  item,
  group,
  onOpenChange,
  onEdit,
  onCopy,
  onOpenWebsite
}: PasswordDetailDialogProps): React.JSX.Element {
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    if (open) setRevealed(false)
  }, [open, item?.id])

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={item?.title ?? 'Пароль'}
      description={item ? `${passwordTypeLabel(item.type)}${group ? ` · ${group.name}` : ''}` : ''}
      icon={<KeyRound />}
      size="lg"
      footer={
        <>
          <button
            type="button"
            className="h-10 rounded-xl px-4 text-sm font-medium text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
            onClick={() => onOpenChange(false)}
          >
            Закрыть
          </button>
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white hover:bg-violet-400"
            onClick={onEdit}
          >
            <Pencil className="size-4" /> Изменить
          </button>
        </>
      }
    >
      {item ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'rounded-lg border px-2.5 py-1 text-xs font-medium',
                passwordStrengthClassName(item.strength)
              )}
            >
              {passwordStrengthLabel(item.strength)} пароль
            </span>
            {item.favorite && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-300">
                <Star className="size-3 fill-current" /> Избранное
              </span>
            )}
            {item.securityIssues.map((issue) => (
              <span
                key={issue}
                className={cn(
                  'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium',
                  passwordIssueClassName(issue)
                )}
              >
                <ShieldAlert className="size-3" /> {passwordIssueLabel(issue)}
              </span>
            ))}
          </div>

          {item.username && (
            <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-4">
              <div className="flex items-center gap-2 text-xs font-medium text-[var(--app-muted)]">
                <UserRound className="size-3.5" /> Логин / email
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--app-text)]">
                  {item.username}
                </div>
                <Tooltip content="Скопировать логин" side="top">
                  <button
                    type="button"
                    aria-label="Скопировать логин"
                    className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-[var(--app-border)] text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
                    onClick={() => void onCopy('username')}
                  >
                    <ClipboardCopy className="size-4" />
                  </button>
                </Tooltip>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-[var(--app-muted)]">Пароль</span>
              <span className="text-[11px] text-[var(--app-muted)]">
                Обновлён {new Date(item.passwordUpdatedAt).toLocaleDateString('ru-RU')}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="min-w-0 flex-1 overflow-x-auto font-mono text-sm font-semibold whitespace-nowrap text-[var(--app-text)]">
                {revealed ? item.password : '••••••••••••••••'}
              </div>
              <Tooltip content={revealed ? 'Скрыть пароль' : 'Показать пароль'} side="top">
                <button
                  type="button"
                  aria-label={revealed ? 'Скрыть пароль' : 'Показать пароль'}
                  className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-[var(--app-border)] text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
                  onClick={() => setRevealed((current) => !current)}
                >
                  {revealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </Tooltip>
              <Tooltip content="Скопировать пароль" side="top">
                <button
                  type="button"
                  aria-label="Скопировать пароль"
                  className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/10 text-violet-300 hover:bg-violet-500/15"
                  onClick={() => void onCopy('password')}
                >
                  <ClipboardCopy className="size-4" />
                </button>
              </Tooltip>
            </div>
          </div>

          {item.website && (
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-4 py-3 text-left hover:bg-[var(--app-control-hover)]"
              onClick={() => void onOpenWebsite()}
            >
              <ExternalLink className="size-4 shrink-0 text-violet-300" />
              <span className="min-w-0 flex-1 truncate text-sm text-[var(--app-text)]">
                {item.website}
              </span>
              <span className="text-xs text-[var(--app-muted)]">Открыть</span>
            </button>
          )}

          {item.customFields.length > 0 && (
            <div className="space-y-2 rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-4">
              <div className="text-xs font-semibold tracking-[0.1em] text-[var(--app-muted)] uppercase">
                Дополнительные поля
              </div>
              {item.customFields.map((field, index) => (
                <div
                  key={`${field.label}-${index}`}
                  className="grid grid-cols-[minmax(100px,0.7fr)_minmax(0,1.3fr)] gap-3 border-t border-[var(--app-border)] pt-2 first:border-0 first:pt-0"
                >
                  <span className="text-xs text-[var(--app-muted)]">{field.label}</span>
                  <span className="min-w-0 font-mono text-xs break-all text-[var(--app-text)]">
                    {revealed ? field.value : '••••••••'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-lg border border-[var(--app-border)] bg-[var(--app-control)] px-2 py-1 text-xs text-[var(--app-muted)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {item.notes && (
            <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-4">
              <div className="text-xs font-medium text-[var(--app-muted)]">Заметки</div>
              <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-[var(--app-text)]">
                {item.notes}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="py-10 text-center text-sm text-[var(--app-muted)]">Загружаем запись…</div>
      )}
    </AppDialog>
  )
}
