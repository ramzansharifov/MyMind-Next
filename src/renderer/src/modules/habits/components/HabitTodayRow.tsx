import * as Popover from '@radix-ui/react-popover'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  Bell,
  Check,
  Clock3,
  Ellipsis,
  Minus,
  Pencil,
  Plus,
  Repeat2,
  SkipForward,
  Target,
  Trash2
} from 'lucide-react'
import { useState } from 'react'

import type {
  HabitEntryRecord,
  HabitGroupRecord,
  HabitRecord
} from '../../../../../shared/contracts/habits'
import { cn } from '../../../shared/lib/cn'
import { Tooltip } from '../../../shared/ui/tooltip'
import { HabitGroupIconGlyph, habitGroupColorClasses } from '../habit-options'
import { habitScheduleLabel } from '../habit-schedule-options'

interface HabitTodayRowProps {
  habit: HabitRecord
  group: HabitGroupRecord | null
  entry: HabitEntryRecord | undefined
  busy: boolean
  onAdvance: () => void | Promise<void>
  onChangeCount: (delta: number) => void | Promise<void>
  onToggleSkipped: () => void | Promise<void>
  onEdit: () => void
  onDelete: () => void
}

const quickTransition = { duration: 0.2, ease: [0.22, 1, 0.36, 1] as const }
const springTransition = { type: 'spring' as const, stiffness: 520, damping: 32, mass: 0.55 }

export function HabitTodayRow({
  habit,
  group,
  entry,
  busy,
  onAdvance,
  onChangeCount,
  onToggleSkipped,
  onEdit,
  onDelete
}: HabitTodayRowProps): React.JSX.Element {
  const reduceMotion = useReducedMotion()
  const [detailsOpen, setDetailsOpen] = useState(false)
  const transition = reduceMotion ? { duration: 0 } : quickTransition
  const currentValue = entry?.skipped ? 0 : Math.min(entry?.value ?? 0, habit.targetValue)
  const completed = Boolean(entry && !entry.skipped && currentValue >= habit.targetValue)
  const skipped = Boolean(entry?.skipped)
  const color = group ? habitGroupColorClasses[group.color] : null
  const progress =
    habit.trackingType === 'count' ? currentValue / habit.targetValue : completed ? 1 : 0
  const countCompleted = habit.trackingType === 'count' && completed

  const actionLabel =
    habit.trackingType === 'check'
      ? completed
        ? `Снять выполнение привычки «${habit.title}»`
        : `Выполнить привычку «${habit.title}»`
      : completed
        ? `Привычка «${habit.title}» выполнена`
        : `Добавить выполнение привычки «${habit.title}»: ${currentValue} из ${habit.targetValue}`

  return (
    <motion.article
      layout={!reduceMotion}
      data-habit-row={habit.id}
      data-completed={completed ? 'true' : 'false'}
      data-progress={currentValue}
      initial={false}
      transition={transition}
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-[var(--app-surface)] shadow-[var(--app-shadow-card)] transition-colors',
        completed
          ? 'border-emerald-400/25'
          : skipped
            ? 'border-amber-400/20 opacity-75'
            : 'border-[var(--app-border)]'
      )}
    >
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-emerald-500/[0.055]"
        initial={false}
        animate={{ opacity: completed ? 1 : 0 }}
        transition={transition}
      />
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-2 left-0 w-0.5 origin-center rounded-full bg-emerald-400"
        initial={false}
        animate={{ opacity: completed ? 1 : 0, scaleY: completed ? 1 : 0.3 }}
        transition={transition}
      />

      <div className="relative z-[1] flex items-start gap-3 p-3.5">
        <button
          type="button"
          aria-label={actionLabel}
          aria-pressed={habit.trackingType === 'check' ? completed : undefined}
          disabled={busy || countCompleted}
          className="flex min-w-0 flex-1 items-start gap-3 text-left outline-none disabled:cursor-default"
          onClick={() => void onAdvance()}
        >
          <motion.span
            aria-hidden="true"
            className={cn(
              'relative mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl border',
              completed
                ? 'border-emerald-400/35 bg-emerald-500/15 text-emerald-300'
                : skipped
                  ? 'border-amber-400/30 bg-amber-500/10 text-amber-300'
                  : 'border-violet-400/20 bg-violet-500/10 text-violet-300'
            )}
            initial={false}
            animate={{ scale: completed ? 1 : 0.96 }}
            transition={reduceMotion ? { duration: 0 } : springTransition}
          >
            <AnimatePresence initial={false} mode="wait">
              {completed ? (
                <motion.span
                  key="completed"
                  initial={reduceMotion ? false : { opacity: 0, scale: 0.45, rotate: -18 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, scale: 0.45, rotate: 12 }}
                  transition={reduceMotion ? { duration: 0 } : springTransition}
                >
                  <Check className="size-5" strokeWidth={3} />
                </motion.span>
              ) : (
                <motion.span key="target" initial={false} animate={{ opacity: 1, scale: 1 }}>
                  <Target className="size-5" />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.span>

          <span
            className={cn(
              'min-w-0 flex-1 py-1 text-sm leading-5 font-semibold break-words whitespace-normal transition-colors',
              completed
                ? 'text-[var(--app-muted)] line-through decoration-emerald-300/65'
                : 'text-[var(--app-text)]'
            )}
          >
            {habit.title}
          </span>
        </button>

        <Popover.Root open={detailsOpen} onOpenChange={setDetailsOpen}>
          <Tooltip content={`Подробнее о привычке «${habit.title}»`} side="top">
            <Popover.Trigger asChild>
              <button
                type="button"
                aria-label={`Подробнее о привычке «${habit.title}»`}
                className="flex size-9 shrink-0 items-center justify-center rounded-lg text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
              >
                <Ellipsis className="size-5" />
              </button>
            </Popover.Trigger>
          </Tooltip>

          <Popover.Portal>
            <Popover.Content
              data-testid="habit-details-popover"
              side="bottom"
              align="end"
              sideOffset={8}
              collisionPadding={12}
              className="z-[90] w-[320px] rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-raised)] p-3 shadow-2xl outline-none"
            >
              <div className="grid gap-2.5">
                <div className="flex items-center gap-3 rounded-xl bg-[var(--app-control)] px-3 py-2.5">
                  <span
                    className={cn(
                      'flex size-8 shrink-0 items-center justify-center rounded-lg border',
                      group && color
                        ? [color.soft, color.text, color.border]
                        : 'border-[var(--app-border)] text-[var(--app-muted)]'
                    )}
                  >
                    {group ? (
                      <HabitGroupIconGlyph icon={group.icon} className="size-4" />
                    ) : (
                      <Target className="size-4" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[10px] font-medium tracking-[0.12em] text-[var(--app-muted)] uppercase">
                      Группа
                    </div>
                    <div className="mt-0.5 truncate text-sm font-medium">
                      {group?.name ?? 'Без группы'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl bg-[var(--app-control)] px-3 py-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-violet-400/20 bg-violet-500/10 text-violet-200">
                    <Repeat2 className="size-4" />
                  </span>
                  <div>
                    <div className="text-[10px] font-medium tracking-[0.12em] text-[var(--app-muted)] uppercase">
                      Повторение
                    </div>
                    <div className="mt-0.5 text-sm font-medium">{habitScheduleLabel(habit)}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl bg-[var(--app-control)] px-3 py-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-[var(--app-border)] text-[var(--app-muted)]">
                    <Clock3 className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-medium tracking-[0.12em] text-[var(--app-muted)] uppercase">
                      Предпочтительное время
                    </div>
                    {habit.preferredTimes.length > 0 ? (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {habit.preferredTimes.map((item) => (
                          <span
                            key={`${item.unit}-${item.time}`}
                            className="inline-flex h-6 items-center rounded-lg border border-[var(--app-border)] bg-[var(--app-workspace)] px-2 text-[11px] text-[var(--app-text)]"
                          >
                            {habit.trackingType === 'count'
                              ? `${item.unit} · ${item.time}`
                              : item.time}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-0.5 text-sm text-[var(--app-muted)]">Не задано</div>
                    )}
                  </div>
                </div>

                {habit.remindersEnabled && habit.preferredTimes.length > 0 && (
                  <div className="flex items-center gap-3 rounded-xl bg-[var(--app-control)] px-3 py-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-violet-400/20 bg-violet-500/10 text-violet-200">
                      <Bell className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-medium tracking-[0.12em] text-[var(--app-muted)] uppercase">
                        Напоминания
                      </div>
                      <div className="mt-1.5">
                        <span className="inline-flex h-6 items-center rounded-lg border border-[var(--app-border)] bg-[var(--app-workspace)] px-2 text-[11px] text-[var(--app-text)]">
                          За 30 минут
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {habit.trackingType === 'count' && (
                  <div className="rounded-xl bg-[var(--app-control)] px-3 py-2.5">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-medium tracking-[0.12em] text-[var(--app-muted)] uppercase">
                          Прогресс
                        </div>
                        <div className="mt-0.5 text-sm font-medium">
                          {skipped
                            ? 'Пропущено'
                            : `${currentValue} / ${habit.targetValue}${habit.unit ? ` ${habit.unit}` : ''}`}
                        </div>
                      </div>

                      {!skipped && (
                        <div className="flex items-center rounded-lg border border-[var(--app-border)] bg-[var(--app-workspace)] p-0.5">
                          <Tooltip content="Уменьшить прогресс" side="top">
                            <button
                              type="button"
                              aria-label={`Уменьшить прогресс «${habit.title}»`}
                              disabled={busy || currentValue <= 0}
                              className="flex size-7 items-center justify-center rounded-md text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] disabled:opacity-30"
                              onClick={() => void onChangeCount(-1)}
                            >
                              <Minus className="size-3.5" />
                            </button>
                          </Tooltip>
                          <Tooltip content="Увеличить прогресс" side="top">
                            <button
                              type="button"
                              aria-label={`Увеличить прогресс «${habit.title}»`}
                              disabled={busy || completed}
                              className="flex size-7 items-center justify-center rounded-md text-violet-300 transition-colors hover:bg-violet-500/10 disabled:opacity-30"
                              onClick={() => void onAdvance()}
                            >
                              <Plus className="size-3.5" />
                            </button>
                          </Tooltip>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center justify-end gap-1 border-t border-[var(--app-border)] pt-3">
                <Tooltip
                  content={skipped ? 'Отменить пропуск' : 'Пропустить на этот день'}
                  side="top"
                >
                  <button
                    type="button"
                    aria-label={
                      skipped
                        ? `Отменить пропуск привычки «${habit.title}»`
                        : `Пропустить привычку «${habit.title}»`
                    }
                    aria-pressed={skipped}
                    disabled={busy}
                    className={cn(
                      'flex size-9 items-center justify-center rounded-lg transition-colors disabled:opacity-40',
                      skipped
                        ? 'bg-amber-500/10 text-amber-200 hover:bg-amber-500/15'
                        : 'text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'
                    )}
                    onClick={() => {
                      setDetailsOpen(false)
                      void onToggleSkipped()
                    }}
                  >
                    <SkipForward className="size-4" />
                  </button>
                </Tooltip>

                <Tooltip content="Изменить привычку" side="top">
                  <button
                    type="button"
                    aria-label={`Изменить привычку «${habit.title}»`}
                    className="flex size-9 items-center justify-center rounded-lg text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
                    onClick={() => {
                      setDetailsOpen(false)
                      onEdit()
                    }}
                  >
                    <Pencil className="size-4" />
                  </button>
                </Tooltip>

                <Tooltip content="Удалить привычку" side="top">
                  <button
                    type="button"
                    aria-label={`Удалить привычку «${habit.title}»`}
                    className="flex size-9 items-center justify-center rounded-lg text-[var(--app-muted)] transition-colors hover:bg-red-500/10 hover:text-red-300"
                    onClick={() => {
                      setDetailsOpen(false)
                      onDelete()
                    }}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </Tooltip>
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>

      {habit.trackingType === 'count' && (
        <div className="relative z-[1] h-0.5 overflow-hidden bg-[var(--app-workspace)]">
          <motion.div
            aria-hidden="true"
            className={cn(
              'h-full origin-left',
              completed ? 'bg-emerald-400/70' : 'bg-violet-400/60'
            )}
            initial={false}
            animate={{ scaleX: Math.max(0, Math.min(1, progress)) }}
            transition={transition}
          />
        </div>
      )}
    </motion.article>
  )
}
