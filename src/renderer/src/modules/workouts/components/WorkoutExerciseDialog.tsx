import { Dumbbell } from 'lucide-react'
import { useEffect, useState } from 'react'

import type {
  CreateWorkoutExerciseInput,
  UpdateWorkoutExerciseInput,
  WorkoutExerciseRecord,
  WorkoutMuscleGroup
} from '../../../../../shared/contracts/workouts'
import { AppDialog } from '../../../shared/ui/AppDialog'
import { WorkoutMuscleMapPicker } from './WorkoutMuscleMapPicker'

const FORM_ID = 'workout-exercise-form'

interface WorkoutExerciseDialogProps {
  open: boolean
  exercise: WorkoutExerciseRecord | null
  busy: boolean
  onOpenChange: (open: boolean) => void
  onSave: (input: CreateWorkoutExerciseInput | UpdateWorkoutExerciseInput) => Promise<void>
}

function legacyGroups(group: WorkoutMuscleGroup): WorkoutMuscleGroup[] {
  if (group === 'arms') return ['shoulders', 'biceps', 'triceps', 'forearms']
  if (group === 'back') return ['lats', 'traps', 'lower_back']
  if (group === 'legs') return ['glutes', 'quadriceps', 'hamstrings', 'calves']
  return [group]
}

export function WorkoutExerciseDialog({
  open,
  exercise,
  busy,
  onOpenChange,
  onSave
}: WorkoutExerciseDialogProps): React.JSX.Element {
  const [title, setTitle] = useState('')
  const [muscleGroups, setMuscleGroups] = useState<WorkoutMuscleGroup[]>([])
  const [usesExternalWeight, setUsesExternalWeight] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setTitle(exercise?.title ?? '')
    setMuscleGroups(
      exercise
        ? exercise.muscleGroups?.length
          ? exercise.muscleGroups
          : legacyGroups(exercise.muscleGroup)
        : []
    )
    setUsesExternalWeight(exercise?.usesExternalWeight ?? true)
    setError(null)
  }, [exercise, open])

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (!title.trim() || muscleGroups.length === 0 || busy) return
    const payload: CreateWorkoutExerciseInput = {
      title: title.trim(),
      muscleGroups,
      usesExternalWeight,
      status: 'active'
    }
    try {
      await onSave(exercise ? { ...payload, id: exercise.id } : payload)
      onOpenChange(false)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось сохранить упражнение')
    }
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={exercise ? 'Изменить упражнение' : 'Новое упражнение'}
      description="Назовите упражнение и отметьте все мышечные зоны, которые участвуют в движении."
      icon={<Dumbbell />}
      size="xl"
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
            form={FORM_ID}
            disabled={busy || !title.trim() || muscleGroups.length === 0}
            className="bg-accent-500 hover:bg-accent-400 h-10 rounded-xl px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
          >
            {busy ? 'Сохраняем…' : exercise ? 'Сохранить' : 'Добавить упражнение'}
          </button>
        </>
      }
    >
      <form id={FORM_ID} className="space-y-5" onSubmit={(event) => void submit(event)}>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-[var(--app-muted)]">Название</span>
          <input
            autoFocus
            value={title}
            maxLength={160}
            placeholder="Например, Сгибания на бицепс с гантелями"
            className="focus:border-accent-500/45 focus:ring-accent-500/15 h-11 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3.5 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60 focus:ring-2"
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>

        <fieldset className="space-y-2">
          <legend className="text-xs font-medium text-[var(--app-muted)]">
            Дополнительный вес
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              aria-pressed={usesExternalWeight}
              className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                usesExternalWeight
                  ? 'border-accent-400/35 bg-accent-500/10'
                  : 'border-[var(--app-border)] bg-[var(--app-workspace)] hover:bg-[var(--app-control-hover)]'
              }`}
              onClick={() => setUsesExternalWeight(true)}
            >
              <span className="block text-sm font-semibold text-[var(--app-text)]">
                С дополнительным весом
              </span>
              <span className="mt-1 block text-xs leading-5 text-[var(--app-muted)]">
                Гантели, штанга, тренажёр или другой внешний вес.
              </span>
            </button>
            <button
              type="button"
              aria-pressed={!usesExternalWeight}
              className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                !usesExternalWeight
                  ? 'border-accent-400/35 bg-accent-500/10'
                  : 'border-[var(--app-border)] bg-[var(--app-workspace)] hover:bg-[var(--app-control-hover)]'
              }`}
              onClick={() => setUsesExternalWeight(false)}
            >
              <span className="block text-sm font-semibold text-[var(--app-text)]">
                Без дополнительного веса
              </span>
              <span className="mt-1 block text-xs leading-5 text-[var(--app-muted)]">
                При записи тренировки указываются только подходы и повторения.
              </span>
            </button>
          </div>
        </fieldset>

        <WorkoutMuscleMapPicker value={muscleGroups} onChange={setMuscleGroups} />

        {muscleGroups.length === 0 && (
          <p className="text-xs text-amber-300/90">Выберите хотя бы одну активную мышечную зону.</p>
        )}

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
