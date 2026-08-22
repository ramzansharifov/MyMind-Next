import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Check, MoreHorizontal } from 'lucide-react'

import type { TaskGroupRecord, TaskRecord } from '../../../../../shared/contracts/tasks'
import { cn } from '../../../shared/lib/cn'
import { TaskGroupIconGlyph, taskGroupColorClasses } from '../task-options'

interface TaskMoveGroupMenuProps {
  task: TaskRecord
  groups: TaskGroupRecord[]
  disabled?: boolean
  onMove: (groupId: string) => void | Promise<void>
}

export function TaskMoveGroupMenu({
  task,
  groups,
  disabled = false,
  onMove
}: TaskMoveGroupMenuProps): React.JSX.Element {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={`Перенести задачу «${task.title}»`}
          disabled={disabled}
          className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] transition-colors outline-none hover:bg-[var(--app-control)] hover:text-[var(--app-text)] focus-visible:ring-2 focus-visible:ring-violet-500/35 disabled:cursor-wait disabled:opacity-40"
        >
          <MoreHorizontal className="size-4" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          data-testid="task-group-move-menu"
          align="end"
          sideOffset={6}
          collisionPadding={12}
          className="z-[130] flex h-72 w-64 flex-col overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-1.5 shadow-2xl outline-none"
        >
          <div className="shrink-0 px-2.5 pt-1.5 pb-2">
            <div className="text-xs font-semibold text-[var(--app-text)]">Перенести в группу</div>
          </div>

          <div className="mx-1 border-t border-[var(--app-border)]" />

          <div
            data-testid="task-group-move-scroll"
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1.5"
          >
            {groups.length === 0 ? (
              <div className="flex h-full items-center justify-center px-4 text-center text-xs leading-5 text-[var(--app-muted)]">
                Групп пока нет
              </div>
            ) : (
              groups.map((group) => {
                const selected = task.groupId === group.id
                const color = taskGroupColorClasses[group.color]

                return (
                  <DropdownMenu.Item
                    key={group.id}
                    aria-label={
                      selected
                        ? `Убрать задачу из группы «${group.name}»`
                        : `Перенести задачу в группу «${group.name}»`
                    }
                    className={cn(
                      'mx-1 flex h-10 cursor-default items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors outline-none select-none data-[highlighted]:bg-[var(--app-control-hover)]',
                      selected ? 'text-[var(--app-text)]' : 'text-[var(--app-muted)]'
                    )}
                    onSelect={() => void onMove(group.id)}
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
                    <span className="min-w-0 flex-1 truncate">{group.name}</span>
                    {selected && (
                      <Check aria-hidden="true" className="size-4 shrink-0 text-violet-300" />
                    )}
                  </DropdownMenu.Item>
                )
              })
            )}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
