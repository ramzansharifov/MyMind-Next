import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Check, Clock3, Minus, Pencil, Plus, Repeat2, SkipForward, Target } from 'lucide-react'

import type {
  HabitEntryRecord,
  HabitGroupRecord,
  HabitRecord
} from '../../../../../shared/contracts/habits'
import { cn } from '../../../shared/lib/cn'
import { HabitGroupIconGlyph, habitGroupColorClasses, habitRepeatLabel } from '../habit-options'

interface HabitTodayRowProps {
  habit: HabitRecord
  group: HabitGroupRecord | null
  entry: HabitEntryRecord | undefined
  busy: boolean
  onAdvance: () => void | Promise<void>
  onChangeCount: (delta: number) => void | Promise<void>
  onToggleSkipped: () => void | Promise<void>
  onEdit: () => void
}

const quickTransition = { duration: 0.2, ease: [0.22, 1, 0.36, 1] as const }
const springTransition = { type: 'spring' as const, stiffness: 520, damping: 32, mass: 0.55 }

function nextPreferredTime(habit: HabitRecord, currentValue: number): string | null {
  const unit = habit.trackingType === 'check' ? 1 : Math.min(habit.targetValue, currentValue + 1)
  return habit.preferredTimes.find((item) => item.unit === unit)?.time ?? null
}

export function HabitTodayRow({
  habit,
  group,
  entry,
  busy,
  onAdvance,
  onChangeCount,
  onToggleSkipped,
  onEdit
}: HabitTodayRowProps): React.JSX.Element {
  const reduceMotion = useReducedMotion()
  const transition = reduceMotion ? { duration: 0 } : quickTransition
  const currentValue = entry?.skipped ? 0 : Math.min(entry?.value ?? 0, habit.targetValue)
  const completed = Boolean(entry && !entry.skipped && currentValue >= habit.targetValue)
  const skipped = Boolean(entry?.skipped)
  const color = group ? habitGroupColorClasses[group.color] : null
  const preferredTime = completed ? null : nextPreferredTime(habit, currentValue)
  const progress = habit.trackingType === 'count' ? currentValue / habit.targetValue : completed ? 1 : 0
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

      <div className="relative z-[1] flex flex-wrap items-center gap-3 p-3.5">
        <button
          type="button"
          aria-label={actionLabel}
          aria-pressed={habit.trackingType === 'check' ? completed : undefined}
          disabled={busy || countCompleted}
          className="flex min-w-0 flex-1 items-center gap-3 text-left outline-none disabled:cursor-default"
          onClick={() => void onAdvance()}
        >
          <motion.span
            aria-hidden="true"
            className={cn(
              'relative flex size-10 shrink-0 items-center justify-center rounded-xl border',
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

          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="relative block w-fit max-w-full">
                <span
                  className={cn(
                    'block max-w-full truncate text-sm font-semibold transition-colors',
                    completed ? 'text-[var(--app-muted)]' : 'text-[var(--app-text)]'
                  )}
                >
                  {habit.title}
                </span>
                <motion.span
                  aria-hidden="true"
                  className="absolute top-1/2 right-0 left-0 h-px origin-left bg-emerald-300/65"
                  initial={false}
                  animate={{ opacity: completed ? 1 : 0, scaleX: completed ? 1 : 0 }}
                  transition={transition}
                />
              </span>

              {group && color && (
                <span
                  className={cn(
                    'inline-flex h-6 items-center gap-1.5 rounded-lg border px-2 text-[11px] font-medium transition-opacity',
                    color.soft,
                    color.text,
                    color.border,
                    completed && 'opacity-65'
                  )}
                >
                  <HabitGroupIconGlyph icon={group.icon} className="size-3" />
                  {group.name}
                </span>
              )}
              <span
                className={cn(
                  'inline-flex h-6 items-center gap-1 rounded-lg border px-2 text-[11px] font-medium transition-opacity',
                  completed
                    ? 'border-emerald-400/15 bg-emerald-500/8 text-emerald-300/75'
                    : 'border-violet-400/20 bg-violet-500/10 text-violet-200'
                )}
              >
                <Repeat2 className="size-3" />
                {habitRepeatLabel(habit.repeatEveryDays)}
              </span>
              {preferredTime && (
                <span className="inline-flex h-6 items-center gap-1 rounded-lg border border-[var(--app-border)] bg-[var(--app-control)] px-2 text-[11px] text-[var(--app-muted)]">
                  <Clock3 className="size-3" />
                  {habit.trackingType === 'count' ? `${currentValue + 1} · ${preferredTime}` : preferredTime}
                </span>
              )}
            </span>
          </span>
        </button>

        {habit.trackingType === 'count' && !skipped && (
          <div
            className={cn(
              'flex h-10 items-center rounded-xl border p-1 transition-colors',
              completed
                ? 'border-emerald-400/20 bg-emerald-500/10'
                : 'border-[var(--app-border)] bg-[var(--app-workspace)]'
            )}
          >
            <button
              type="button"
              aria-label={`Уменьшить прогресс «${habit.title}»`}
              disabled={busy || currentValue <= 0}
              className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] disabled:opacity-30"
              onClick={() => void onChangeCount(-1)}
            >
              <Minus className="size-3.5" />
            </button>
            <AnimatePresence initial={false} mode="popLayout">
              <motion.span
                key={currentValue}
                data-habit-progress-value
                initial={reduceMotion ? false : { opacity: 0.45, y: 3, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -3, scale: 0.92 }}
                transition={transition}
                className={cn(
                  'min-w-24 px-2 text-center text-sm font-semibold',
                  completed ? 'text-emerald-200' : 'text-[var(--app-text)]'
                )}
              >
                {currentValue} / {habit.targetValue}
                {habit.unit ? ` ${habit.unit}` : ''}
              </motion.span>
            </AnimatePresence>
            <button
              type="button"
              aria-label={`Увеличить прогресс «${habit.title}»`}
              disabled={busy || completed}
              className="flex size-8 items-center justify-center rounded-lg text-violet-300 transition-colors hover:bg-violet-500/10 disabled:opacity-30"
              onClick={() => void onAdvance()}
            >
              <Plus className="size-3.5" />
            </button>
          </div>
        )}

        <AnimatePresence initial={false}>
          {completed && (
            <motion.span
              data-habit-completed-badge
              initial={reduceMotion ? false : { opacity: 0, x: 6, scale: 0.94 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0, x: 6, scale: 0.94 }}
              transition={transition}
              className="hidden h-8 shrink-0 items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 text-[11px] font-semibold text-emerald-300 xl:inline-flex"
            >
              <Check className="size-3" strokeWidth={2.75} />
              Выполнено
            </motion.span>
          )}
        </AnimatePresence>

        <button
          type="button"
          aria-pressed={skipped}
          disabled={busy}
          className={cn(
            'inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-medium transition-colors disabled:opacity-40',
            skipped
              ? 'border-amber-400/30 bg-amber-500/10 text-amber-200'
              : 'border-[var(--app-border)] bg-[var(--app-workspace)] text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]'
          )}
          onClick={() => void onToggleSkipped()}
        >
          <SkipForward className="size-3.5" />
          {skipped ? 'Пропущено' : 'Пропустить'}
        </button>

        <button
          type="button"
          aria-label={`Изменить привычку «${habit.title}»`}
          className="flex size-10 items-center justify-center rounded-xl text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
          onClick={onEdit}
        >
          <Pencil className="size-4" />
        </button>
      </div>

      {habit.trackingType === 'count' && (
        <div className="relative z-[1] h-0.5 overflow-hidden bg-[var(--app-workspace)]">
          <motion.div
            aria-hidden="true"
            className={cn('h-full origin-left', completed ? 'bg-emerald-400/70' : 'bg-violet-400/60')}
            initial={false}
            animate={{ scaleX: Math.max(0, Math.min(1, progress)) }}
            transition={transition}
          />
        </div>
      )}
    </motion.article>
  )
}
