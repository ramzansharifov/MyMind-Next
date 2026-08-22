import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Check, Pencil, Trash2 } from 'lucide-react'

import type { TaskGroupRecord, TaskRecord } from '../../../../../shared/contracts/tasks'
import { cn } from '../../../shared/lib/cn'
import { TaskGroupIconGlyph, taskGroupColorClasses } from '../task-options'
import { TaskMoveGroupMenu } from './TaskMoveGroupMenu'

interface TaskRowProps {
  task: TaskRecord
  group: TaskGroupRecord | null
  groups: TaskGroupRecord[]
  busy: boolean
  onToggle: () => void | Promise<void>
  onMove: (groupId: string) => void | Promise<void>
  onEdit: () => void
  onDelete: () => void
}

const quickTransition = { duration: 0.2, ease: [0.22, 1, 0.36, 1] as const }
const springTransition = { type: 'spring' as const, stiffness: 520, damping: 32, mass: 0.55 }

export function TaskRow({
  task,
  group,
  groups,
  busy,
  onToggle,
  onMove,
  onEdit,
  onDelete
}: TaskRowProps): React.JSX.Element {
  const completed = task.status === 'completed'
  const reduceMotion = useReducedMotion()
  const transition = reduceMotion ? { duration: 0 } : quickTransition

  return (
    <motion.article
      layout={!reduceMotion}
      data-task-row={task.id}
      data-completed={completed ? 'true' : 'false'}
      initial={false}
      animate={{
        backgroundColor: completed ? 'rgba(16, 185, 129, 0.055)' : 'rgba(0, 0, 0, 0)'
      }}
      exit={reduceMotion ? undefined : { opacity: 0, y: -5, scale: 0.992 }}
      transition={transition}
      className="relative flex items-center gap-3 overflow-hidden px-4 py-3.5 hover:bg-[var(--app-control-hover)]"
    >
      <motion.span
        aria-hidden="true"
        className="absolute inset-y-2 left-0 w-0.5 origin-center rounded-full bg-emerald-400"
        initial={false}
        animate={{ opacity: completed ? 1 : 0, scaleY: completed ? 1 : 0.3 }}
        transition={transition}
      />

      <button
        type="button"
        aria-label={
          completed ? `Вернуть задачу «${task.title}»` : `Выполнить задачу «${task.title}»`
        }
        aria-pressed={completed}
        disabled={busy}
        className="flex min-w-0 flex-1 items-center gap-3 text-left outline-none disabled:cursor-wait"
        onClick={() => void onToggle()}
      >
        <motion.span
          aria-hidden="true"
          className={cn(
            'relative flex size-5 shrink-0 items-center justify-center rounded-full border',
            completed ? 'border-emerald-400 bg-emerald-500/18' : 'border-[var(--app-muted)]/80'
          )}
          initial={false}
          animate={{ scale: completed ? 1 : 0.92 }}
          transition={reduceMotion ? { duration: 0 } : springTransition}
        >
          <AnimatePresence initial={false}>
            {completed && (
              <motion.span
                key="check"
                initial={reduceMotion ? false : { opacity: 0, scale: 0.4, rotate: -18 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, scale: 0.4, rotate: 12 }}
                transition={reduceMotion ? { duration: 0 } : springTransition}
              >
                <Check className="size-3 text-emerald-300" strokeWidth={3} />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.span>

        <span className="min-w-0 flex-1">
          <span className="relative block w-fit max-w-full">
            <span
              className={cn(
                'block max-w-full truncate text-sm font-semibold leading-5 transition-colors',
                completed ? 'text-[var(--app-muted)]' : 'text-[var(--app-text)]'
              )}
            >
              {task.title}
            </span>
            <motion.span
              aria-hidden="true"
              className="absolute left-0 right-0 top-1/2 h-px origin-left bg-emerald-300/65"
              initial={false}
              animate={{ opacity: completed ? 1 : 0, scaleX: completed ? 1 : 0 }}
              transition={transition}
            />
          </span>

          {group && (
            <span
              className={cn(
                'mt-1.5 inline-flex h-6 max-w-full items-center gap-1.5 rounded-lg border px-2 text-[11px] font-medium transition-opacity',
                taskGroupColorClasses[group.color].soft,
                taskGroupColorClasses[group.color].text,
                taskGroupColorClasses[group.color].border,
                completed && 'opacity-65'
              )}
            >
              <TaskGroupIconGlyph icon={group.icon} className="size-3 shrink-0" />
              <span className="truncate">{group.name}</span>
            </span>
          )}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {completed && (
          <motion.span
            data-task-completed-badge
            initial={reduceMotion ? false : { opacity: 0, x: 6, scale: 0.94 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0, x: 6, scale: 0.94 }}
            transition={transition}
            className="hidden h-7 shrink-0 items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 text-[11px] font-semibold text-emerald-300 sm:inline-flex"
          >
            <Check className="size-3" strokeWidth={2.75} />
            Выполнено
          </motion.span>
        )}
      </AnimatePresence>

      <div className="flex shrink-0 items-center">
        <TaskMoveGroupMenu task={task} groups={groups} disabled={busy} onMove={onMove} />
        <button
          type="button"
          aria-label={`Изменить задачу «${task.title}»`}
          className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-control)] hover:text-[var(--app-text)]"
          onClick={onEdit}
        >
          <Pencil className="size-3.5" />
        </button>
        <button
          type="button"
          aria-label={`Удалить задачу «${task.title}»`}
          className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-red-500/10 hover:text-red-300"
          onClick={onDelete}
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </motion.article>
  )
}
