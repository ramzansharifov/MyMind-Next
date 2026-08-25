import { CalendarDays, Clock3, Dumbbell, Pencil, Scale, Sigma } from 'lucide-react'

import type { WorkoutSessionRecord } from '../../../../../shared/contracts/workouts'
import { AppDialog } from '../../../shared/ui/AppDialog'
import { workoutMuscleGroupLabel } from '../workout-options'
import { WorkoutMuscleArtwork } from './WorkoutMuscleArtwork'

interface WorkoutSessionDetailDialogProps {
  open: boolean
  session: WorkoutSessionRecord | null
  onOpenChange: (open: boolean) => void
  onEdit: () => void
}

export function WorkoutSessionDetailDialog({
  open,
  session,
  onOpenChange,
  onEdit
}: WorkoutSessionDetailDialogProps): React.JSX.Element {
  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={session?.title || session?.programName || 'Тренировка'}
      description={
        session
          ? `${session.date}${session.programName ? ` · ${session.programName}` : ' · Свободная тренировка'}`
          : undefined
      }
      icon={<Dumbbell />}
      size="xl"
      footer={
        session ? (
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white hover:bg-violet-400"
            onClick={onEdit}
          >
            <Pencil className="size-4" /> Изменить
          </button>
        ) : null
      }
    >
      {session && (
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-3">
              <div className="flex items-center gap-2 text-xs text-[var(--app-muted)]">
                <CalendarDays className="size-3.5" /> Дата
              </div>
              <div className="mt-1.5 text-sm font-semibold text-[var(--app-text)]">
                {session.date}
              </div>
            </div>
            <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-3">
              <div className="flex items-center gap-2 text-xs text-[var(--app-muted)]">
                <Clock3 className="size-3.5" /> Время
              </div>
              <div className="mt-1.5 text-sm font-semibold text-[var(--app-text)]">
                {session.durationMinutes ? `${session.durationMinutes} мин` : 'Не указано'}
              </div>
            </div>
            <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-3">
              <div className="flex items-center gap-2 text-xs text-[var(--app-muted)]">
                <Sigma className="size-3.5" /> Объём
              </div>
              <div className="mt-1.5 text-sm font-semibold text-[var(--app-text)]">
                {session.totalSets} подх. · {session.totalReps} повт.
              </div>
            </div>
            <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-3">
              <div className="flex items-center gap-2 text-xs text-[var(--app-muted)]">
                <Scale className="size-3.5" /> Тоннаж
              </div>
              <div className="mt-1.5 text-sm font-semibold text-[var(--app-text)]">
                {session.totalVolumeKg.toLocaleString('ru-RU')} кг
              </div>
            </div>
          </div>

          {session.comment && (
            <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-4 py-3 text-sm leading-6 text-[var(--app-muted)]">
              {session.comment}
            </div>
          )}

          <div className="space-y-3">
            {session.exercises.map((exercise) => {
              const volume = exercise.sets.reduce((sum, set) => sum + set.reps * set.weightKg, 0)
              return (
                <article
                  key={exercise.id}
                  className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)]"
                >
                  <div className="flex items-center gap-3 border-b border-[var(--app-border)] px-4 py-3">
                    <WorkoutMuscleArtwork
                      groups={exercise.muscleGroups}
                      className="size-12 shrink-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-[var(--app-text)]">
                        {exercise.exerciseTitle}
                      </div>
                      <div className="mt-0.5 text-xs text-[var(--app-muted)]">
                        {workoutMuscleGroupLabel(exercise.muscleGroup)} · {exercise.sets.length}{' '}
                        подх. · {Math.round(volume * 100) / 100} кг объёма
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-[52px_1fr_1fr_1fr] bg-[var(--app-workspace)] px-4 py-2 text-[11px] font-semibold tracking-[0.08em] text-[var(--app-muted)] uppercase">
                    <span>№</span>
                    <span>Повторы</span>
                    <span>Вес</span>
                    <span>Объём</span>
                  </div>
                  <div className="divide-y divide-[var(--app-border)]">
                    {exercise.sets.map((set) => (
                      <div
                        key={set.id}
                        className="grid grid-cols-[52px_1fr_1fr_1fr] px-4 py-2.5 text-sm"
                      >
                        <span className="text-[var(--app-muted)]">{set.position + 1}</span>
                        <span className="font-medium text-[var(--app-text)]">{set.reps}</span>
                        <span className="text-[var(--app-text)]">{set.weightKg} кг</span>
                        <span className="text-[var(--app-muted)]">
                          {Math.round(set.reps * set.weightKg * 100) / 100} кг
                        </span>
                      </div>
                    ))}
                  </div>
                  {exercise.comment && (
                    <div className="border-t border-[var(--app-border)] px-4 py-3 text-xs leading-5 text-[var(--app-muted)]">
                      {exercise.comment}
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        </div>
      )}
    </AppDialog>
  )
}
