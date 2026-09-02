import { Tooltip } from '../../../shared/ui/tooltip'
import {
  Activity,
  CalendarDays,
  ChevronDown,
  Clock3,
  Pencil,
  Scale,
  Sigma,
  Trash2
} from 'lucide-react'
import { useId, useMemo, useState } from 'react'

import type { WorkoutSessionRecord } from '../../../../../shared/contracts/workouts'
import { cn } from '../../../shared/lib/cn'
import {
  workoutMuscleGroupClasses,
  workoutMuscleGroupLabel,
  WorkoutMuscleGroupIcon
} from '../workout-options'

interface WorkoutSessionCardProps {
  session: WorkoutSessionRecord
  onOpenMuscleMap: () => void
  onEdit: () => void
  onDelete: () => void
}

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date)
}

function formatNumber(value: number, maximumFractionDigits = 1): string {
  return value.toLocaleString('ru-RU', { maximumFractionDigits })
}

export function WorkoutSessionCard({
  session,
  onOpenMuscleMap,
  onEdit,
  onDelete
}: WorkoutSessionCardProps): React.JSX.Element {
  const [expanded, setExpanded] = useState(false)
  const detailsId = useId()
  const title = session.programName || 'Свободная тренировка'
  const groups = useMemo(
    () => [...new Set(session.exercises.flatMap((exercise) => exercise.muscleGroups))],
    [session.exercises]
  )
  const hasExternalWeight = session.exercises.some((exercise) => exercise.usesExternalWeight)

  return (
    <article
      className={cn(
        'overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[var(--app-shadow-card)] transition-colors',
        expanded ? 'bg-[var(--app-surface)]' : 'hover:bg-[var(--app-card-hover)]'
      )}
    >
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={detailsId}
        aria-label={`${expanded ? 'Свернуть' : 'Раскрыть'} тренировку «${title}»`}
        className="flex w-full items-center gap-4 px-4 py-3.5 text-left focus-visible:ring-2 focus-visible:ring-violet-500/35 focus-visible:outline-none focus-visible:ring-inset"
        onClick={() => setExpanded((current) => !current)}
      >
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-[var(--app-text)]">{title}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-[var(--app-muted)]">
            <span>{formatDate(session.date)}</span>
            {session.durationMinutes ? (
              <>
                <span aria-hidden="true">·</span>
                <span>{session.durationMinutes} мин</span>
              </>
            ) : null}
          </div>
        </div>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-[var(--app-muted)] transition-transform duration-200',
            expanded && 'rotate-180'
          )}
          aria-hidden="true"
        />
      </button>

      <div
        id={detailsId}
        aria-hidden={!expanded}
        inert={!expanded}
        className={cn(
          'grid transition-[grid-template-rows,opacity] duration-200 ease-out',
          expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-[var(--app-border)] px-4 pt-4 pb-4">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl bg-[var(--app-workspace)] px-3 py-2.5">
                <div className="flex items-center gap-1.5 text-[10px] font-medium text-[var(--app-muted)]">
                  <Clock3 className="size-3.5" aria-hidden="true" /> Время
                </div>
                <div className="mt-1 text-sm font-semibold text-[var(--app-text)]">
                  {session.durationMinutes ? `${session.durationMinutes} мин` : 'Не указано'}
                </div>
              </div>
              <div className="rounded-xl bg-[var(--app-workspace)] px-3 py-2.5">
                <div className="flex items-center gap-1.5 text-[10px] font-medium text-[var(--app-muted)]">
                  <Sigma className="size-3.5" aria-hidden="true" /> Подходы
                </div>
                <div className="mt-1 text-sm font-semibold text-[var(--app-text)]">
                  {session.totalSets}
                </div>
              </div>
              <div className="rounded-xl bg-[var(--app-workspace)] px-3 py-2.5">
                <div className="flex items-center gap-1.5 text-[10px] font-medium text-[var(--app-muted)]">
                  <Activity className="size-3.5" aria-hidden="true" /> Повторения
                </div>
                <div className="mt-1 text-sm font-semibold text-[var(--app-text)]">
                  {session.totalReps}
                </div>
              </div>
              <div className="rounded-xl bg-[var(--app-workspace)] px-3 py-2.5">
                <div className="flex items-center gap-1.5 text-[10px] font-medium text-[var(--app-muted)]">
                  <Scale className="size-3.5" aria-hidden="true" /> Тоннаж
                </div>
                <div className="mt-1 text-sm font-semibold text-[var(--app-text)]">
                  {hasExternalWeight
                    ? `${formatNumber(session.totalVolumeKg)} кг`
                    : 'Без доп. веса'}
                </div>
              </div>
            </div>

            {groups.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {groups.map((group) => {
                  const classes = workoutMuscleGroupClasses[group]
                  return (
                    <span
                      key={group}
                      className={cn(
                        'inline-flex h-6 items-center gap-1 rounded-lg border px-2 text-[11px] font-medium',
                        classes.soft,
                        classes.text,
                        classes.border
                      )}
                    >
                      <WorkoutMuscleGroupIcon group={group} className="size-3" />
                      {workoutMuscleGroupLabel(group)}
                    </span>
                  )
                })}
              </div>
            )}

            {session.comment && (
              <div className="mt-3 rounded-xl bg-[var(--app-workspace)] px-3.5 py-3 text-xs leading-5 text-[var(--app-muted)]">
                {session.comment}
              </div>
            )}

            <div className="mt-4 space-y-2">
              {session.exercises.map((exercise, exerciseIndex) => {
                const volume = exercise.sets.reduce((sum, set) => sum + set.reps * set.weightKg, 0)
                return (
                  <section
                    key={exercise.id}
                    className="overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)]"
                  >
                    <div className="flex items-start gap-3 px-3.5 py-3">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--app-surface)] text-[11px] font-semibold text-[var(--app-muted)]">
                        {exerciseIndex + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-[var(--app-text)]">
                          {exercise.exerciseTitle}
                        </div>
                        <div className="mt-0.5 text-[11px] text-[var(--app-muted)]">
                          {workoutMuscleGroupLabel(exercise.muscleGroup)} · {exercise.sets.length}{' '}
                          подх.
                          {exercise.usesExternalWeight
                            ? ` · ${formatNumber(volume)} кг объёма`
                            : ' · Без дополнительного веса'}
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-[var(--app-border)] px-3.5 py-2.5">
                      <div className="flex flex-wrap gap-1.5">
                        {exercise.sets.map((set) => (
                          <span
                            key={set.id}
                            className="inline-flex items-center rounded-lg bg-[var(--app-surface)] px-2.5 py-1.5 text-[11px] text-[var(--app-muted)]"
                          >
                            <strong className="mr-1 font-semibold text-[var(--app-text)]">
                              {set.position + 1}.
                            </strong>
                            {set.reps} повт.
                            {exercise.usesExternalWeight
                              ? ` × ${formatNumber(set.weightKg)} кг`
                              : ''}
                          </span>
                        ))}
                      </div>
                      {exercise.comment && (
                        <div className="mt-2 text-xs leading-5 text-[var(--app-muted)]">
                          {exercise.comment}
                        </div>
                      )}
                    </div>
                  </section>
                )
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--app-border)] pt-3">
              <div className="inline-flex items-center gap-1.5 text-[11px] text-[var(--app-muted)]">
                <CalendarDays className="size-3.5" aria-hidden="true" />
                {formatDate(session.date)}
              </div>
              <div className="flex items-center gap-1">
                <Tooltip content={`Посмотреть модель мышц тренировки «${title}»`} side="top">
                  <button
                    type="button"
                    aria-label={`Посмотреть модель мышц тренировки «${title}»`}
                    className="flex size-9 items-center justify-center rounded-xl text-[var(--app-muted)] transition-colors hover:bg-violet-500/10 hover:text-violet-300"
                    onClick={onOpenMuscleMap}
                  >
                    <Activity className="size-4" aria-hidden="true" />
                  </button>
                </Tooltip>
                <Tooltip content="Изменить тренировку" side="top">
                  <button
                    type="button"
                    aria-label="Изменить тренировку"
                    className="flex size-9 items-center justify-center rounded-xl text-[var(--app-muted)] transition-colors hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
                    onClick={onEdit}
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                  </button>
                </Tooltip>
                <Tooltip content="Удалить тренировку" side="top">
                  <button
                    type="button"
                    aria-label="Удалить тренировку"
                    className="flex size-9 items-center justify-center rounded-xl text-[var(--app-muted)] transition-colors hover:bg-red-500/10 hover:text-red-300"
                    onClick={onDelete}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </Tooltip>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}
