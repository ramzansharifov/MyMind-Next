import { Dumbbell } from 'lucide-react'
import { useEffect, useState } from 'react'

import type {
  CreateWorkoutExerciseInput,
  UpdateWorkoutExerciseInput,
  WorkoutExerciseRecord,
  WorkoutMuscleGroup
} from '../../../../../shared/contracts/workouts'
import { AppDialog } from '../../../shared/ui/AppDialog'
import { AppSelect } from '../../../shared/ui/AppSelect'
import { WORKOUT_MUSCLE_GROUP_OPTIONS } from '../workout-options'

const FORM_ID = 'workout-exercise-form'

interface WorkoutExerciseDialogProps {
  open: boolean
  exercise: WorkoutExerciseRecord | null
  busy: boolean
  onOpenChange: (open: boolean) => void
  onSave: (input: CreateWorkoutExerciseInput | UpdateWorkoutExerciseInput) => Promise<void>
}

export function WorkoutExerciseDialog({
  open,
  exercise,
  busy,
  onOpenChange,
  onSave
}: WorkoutExerciseDialogProps): React.JSX.Element {
  const [title, setTitle] = useState('')
  const [muscleGroup, setMuscleGroup] = useState<WorkoutMuscleGroup>('arms')
  const [description, setDescription] = useState('')
  const [archived, setArchived] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setTitle(exercise?.title ?? '')
    setMuscleGroup(exercise?.muscleGroup ?? 'arms')
    setDescription(exercise?.description ?? '')
    setArchived(exercise?.status === 'archived')
    setError(null)
  }, [exercise, open])

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (!title.trim() || busy) return
    const payload: CreateWorkoutExerciseInput = {
      title: title.trim(),
      muscleGroup,
      description,
      status: archived ? 'archived' : 'active'
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
      description="Упражнения — базовый справочник для программ, тренировок, прогресса и отчётов."
      icon={<Dumbbell />}
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
            form={FORM_ID}
            disabled={busy || !title.trim()}
            className="h-10 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {busy ? 'Сохраняем…' : exercise ? 'Сохранить' : 'Добавить упражнение'}
          </button>
        </>
      }
    >
      <form id={FORM_ID} className="space-y-4" onSubmit={(event) => void submit(event)}>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-[var(--app-muted)]">Название</span>
          <input
            autoFocus
            value={title}
            maxLength={160}
            placeholder="Например, Сгибания на бицепс с гантелями"
            className="h-11 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3.5 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60 focus:border-violet-500/45 focus:ring-2 focus:ring-violet-500/15"
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>

        <div className="space-y-1.5">
          <span className="text-xs font-medium text-[var(--app-muted)]">Основная группа мышц</span>
          <AppSelect
            ariaLabel="Группа мышц"
            value={muscleGroup}
            options={WORKOUT_MUSCLE_GROUP_OPTIONS.map(({ value, label }) => ({ value, label }))}
            onValueChange={(value) => setMuscleGroup(value as WorkoutMuscleGroup)}
          />
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-[var(--app-muted)]">Описание / техника</span>
          <textarea
            value={description}
            rows={5}
            maxLength={10000}
            placeholder="Техника выполнения, особенности хвата, амплитуда и другие заметки…"
            className="w-full resize-y rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3.5 py-3 text-sm leading-6 text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60 focus:border-violet-500/45 focus:ring-2 focus:ring-violet-500/15"
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>

        {exercise && (
          <label className="flex items-center justify-between gap-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-4 py-3">
            <span>
              <span className="block text-sm font-medium text-[var(--app-text)]">Архивировать</span>
              <span className="mt-0.5 block text-xs text-[var(--app-muted)]">
                История сохранится, но упражнение исчезнет из обычного выбора.
              </span>
            </span>
            <input
              type="checkbox"
              checked={archived}
              className="size-4 accent-violet-500"
              onChange={(event) => setArchived(event.target.checked)}
            />
          </label>
        )}

        {error && (
          <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}
      </form>
    </AppDialog>
  )
}
