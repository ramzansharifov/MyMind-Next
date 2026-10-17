import * as ContextMenu from '@radix-ui/react-context-menu'
import { Pencil, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'

import type { TaskGroupRecord } from '../../../../../shared/contracts/tasks'

interface TaskGroupContextMenuProps {
  group: TaskGroupRecord
  disabled: boolean
  children: ReactNode
  onEdit: () => void
  onDelete: () => void
}

export function TaskGroupContextMenu({
  group,
  disabled,
  children,
  onEdit,
  onDelete
}: TaskGroupContextMenuProps): React.JSX.Element {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild disabled={disabled}>
        {children}
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content
          aria-label={`Действия группы «${group.name}»`}
          collisionPadding={12}
          className="z-[130] w-64 overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-1.5 shadow-2xl outline-none"
        >
          <ContextMenu.Label className="truncate px-2.5 pt-1.5 pb-2 text-xs font-semibold text-[var(--app-muted)]">
            {group.name}
          </ContextMenu.Label>
          <ContextMenu.Separator className="mx-1 mb-1 h-px bg-[var(--app-border)]" />
          <ContextMenu.Item
            aria-label={`Изменить группу «${group.name}»`}
            disabled={disabled}
            onSelect={onEdit}
            className="flex h-10 cursor-default items-center gap-2.5 rounded-lg px-2.5 text-sm text-[var(--app-text)] outline-none select-none data-[disabled]:opacity-40 data-[highlighted]:bg-[var(--app-control-hover)]"
          >
            <Pencil className="size-4 text-[var(--app-muted)]" />
            Изменить
          </ContextMenu.Item>
          <ContextMenu.Item
            aria-label={`Удалить группу «${group.name}»`}
            disabled={disabled}
            onSelect={onDelete}
            className="flex h-10 cursor-default items-center gap-2.5 rounded-lg px-2.5 text-sm text-red-400 outline-none select-none data-[disabled]:opacity-40 data-[highlighted]:bg-red-500/10"
          >
            <Trash2 className="size-4" />
            Удалить
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  )
}
