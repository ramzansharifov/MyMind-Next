import { Tooltip } from '../../../shared/ui/tooltip'
import { ArrowDown, ArrowUp, ListPlus, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import type {
  CreateWorkoutProgramInput,
  UpdateWorkoutProgramInput,
  WorkoutExerciseRecord,
  WorkoutProgramRecord
} from '../../../../../shared/contracts/workouts'
import { AppDialog } from '../../../shared/ui/AppDialog'
import { AppSelect } from '../../../shared/ui/AppSelect'
import { workoutMuscleGroupsLabel } from '../workout-options'
import { WorkoutMuscleArtwork } from './WorkoutMuscleArtwork'

const FORM_ID = 'workout-program-form'
const NONE = '__none__'

interface EditableProgramExercise {
  exerciseId: string
}

interface WorkoutProgramDialogProps {
  open: boolean
  program: WorkoutProgramRecord | null
  exercises: WorkoutExerciseRecord[]
  busy: boolean
  onOpenChange: (open: boolean) => void
  onSave: (input: CreateWorkoutProgramInput | UpdateWorkoutProgramInput) => Promise<void>
}

export function WorkoutProgramDialog({
  open,
  program,
  exercises,
  busy,
  onOpenChange,
  onSave
}: WorkoutProgramDialogProps): React.JSX.Element {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [items, setItems] = useState<EditableProgramExercise[]>([])
  const [exerciseToAdd, setExerciseToAdd] = useState(NONE)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName(program?.name ?? '')
    setDescription(program?.description ?? '')
    setItems(program?.exercises.map((item) => ({ exerciseId: item.exerciseId })) ?? [])
    setExerciseToAdd(NONE)
    setError(null)
  }, [open, program])

  const exerciseMap = useMemo(
    () => new Map(exercises.map((exercise) => [exercise.id, exercise])),
    [exercises]
  )
  const availableExercises = exercises.filter(
    (exercise) => !items.some((item) => item.exerciseId === exercise.id)
  )

  function addExercise(): void {
    if (exerciseToAdd === NONE) return
    setItems((current) => [...current, { exerciseId: exerciseToAdd }])
    setExerciseToAdd(NONE)
  }

  function move(index: number, direction: -1 | 1): void {
    const target = index + direction
    if (target < 0 || target >= items.length) return
    setItems((current) => {
      const next = [...current]
      const [item] = next.splice(index, 1)
      if (item) next.splice(target, 0, item)
      return next
    })
  }

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (!name.trim() || items.length === 0 || busy) return
    const payload: CreateWorkoutProgramInput = {
      name: name.trim(),
      description,
      status: 'active',
      exercises: items.map((item) => ({ exerciseId: item.exerciseId }))
    }
    try {
      await onSave(program ? { ...payload, id: program.id } : payload)
      onOpenChange(false)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось сохранить программу')
    }
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={program ? 'Изменить программу' : 'Новая программа'}
      description="Программа хранит только состав и порядок упражнений. Подходы, повторения и вес фиксируются уже в конкретной тренировке."
      icon={<ListPlus />}
      size="lg"
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
            disabled={busy || !name.trim() || items.length === 0}
            className="h-10 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {busy ? 'Сохраняем…' : program ? 'Сохранить' : 'Создать программу'}
          </button>
        </>
      }
    >
      <form id={FORM_ID} className="space-y-5" onSubmit={(event) => void submit(event)}>
        <div className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-[var(--app-muted)]">Название программы</span>
            <input
              autoFocus
              value={name}
              maxLength={160}
              placeholder="Например, Push / Pull / Legs — День 1"
              className="h-11 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3.5 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60 focus:border-violet-500/45 focus:ring-2 focus:ring-violet-500/15"
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-[var(--app-muted)]">Описание</span>
            <textarea
              value={description}
              rows={2}
              maxLength={10000}
              placeholder="Необязательно — цель или особенности программы"
              className="w-full resize-y rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3.5 py-3 text-sm leading-6 text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60 focus:border-violet-500/45 focus:ring-2 focus:ring-violet-500/15"
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
        </div>

        <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-3.5">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[260px] flex-1 space-y-1.5">
              <span className="text-xs font-medium text-[var(--app-muted)]">
                Добавить упражнение
              </span>
              <AppSelect
                ariaLabel="Упражнение для программы"
                value={exerciseToAdd}
                options={[
                  {
                    value: NONE,
                    label: availableExercises.length
                      ? 'Выберите упражнение'
                      : 'Все упражнения добавлены'
                  },
                  ...availableExercises.map((exercise) => ({
                    value: exercise.id,
                    label: `${exercise.title} · ${workoutMuscleGroupsLabel(exercise.muscleGroups)}`
                  }))
                ]}
                onValueChange={setExerciseToAdd}
              />
            </div>
            <button
              type="button"
              disabled={exerciseToAdd === NONE}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-500/10 px-3.5 text-sm font-semibold text-violet-200 hover:bg-violet-500/15 disabled:opacity-40"
              onClick={addExercise}
            >
              <Plus className="size-4" /> Добавить
            </button>
          </div>
        </section>

        <div className="space-y-2">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--app-border)] px-5 py-8 text-center text-sm text-[var(--app-muted)]">
              Сначала добавьте упражнения в программу.
            </div>
          ) : (
            items.map((item, index) => {
              const exercise = exerciseMap.get(item.exerciseId)
              return (
                <article
                  key={item.exerciseId}
                  className="flex items-center gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-xs font-semibold text-violet-300">
                    {index + 1}
                  </span>
                  {exercise && (
                    <WorkoutMuscleArtwork
                      groups={exercise.muscleGroups}
                      className="size-10 shrink-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-0.5"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-[var(--app-text)]">
                      {exercise?.title ?? 'Удалённое упражнение'}
                    </div>
                    {exercise && (
                      <div className="mt-0.5 truncate text-xs text-[var(--app-muted)]">
                        {workoutMuscleGroupsLabel(exercise.muscleGroups)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Tooltip content="Поднять упражнение" side="top">
                      <button
                        type="button"
                        aria-label="Поднять упражнение"
                        disabled={index === 0}
                        className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] disabled:opacity-25"
                        onClick={() => move(index, -1)}
                      >
                        <ArrowUp className="size-4" />
                      </button>
                    </Tooltip>
                    <Tooltip content="Опустить упражнение" side="top">
                      <button
                        type="button"
                        aria-label="Опустить упражнение"
                        disabled={index === items.length - 1}
                        className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)] disabled:opacity-25"
                        onClick={() => move(index, 1)}
                      >
                        <ArrowDown className="size-4" />
                      </button>
                    </Tooltip>
                    <Tooltip content="Удалить упражнение из программы" side="top">
                      <button
                        type="button"
                        aria-label="Удалить упражнение из программы"
                        className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-red-500/10 hover:text-red-300"
                        onClick={() =>
                          setItems((current) =>
                            current.filter((_, itemIndex) => itemIndex !== index)
                          )
                        }
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </Tooltip>
                  </div>
                </article>
              )
            })
          )}
        </div>

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
