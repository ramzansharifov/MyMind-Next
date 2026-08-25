import { Dumbbell, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import type {
  CreateWorkoutSessionInput,
  UpdateWorkoutSessionInput,
  WorkoutExerciseRecord,
  WorkoutProgramRecord,
  WorkoutSessionRecord
} from '../../../../../shared/contracts/workouts'
import { AppDialog } from '../../../shared/ui/AppDialog'
import { AppSelect } from '../../../shared/ui/AppSelect'
import { workoutMuscleGroupsLabel } from '../workout-options'

const FORM_ID = 'workout-session-form'
const CUSTOM = '__custom__'
const NONE = '__none__'

interface EditableSet {
  reps: string
  weightKg: string
}

interface EditableExercise {
  exerciseId: string
  comment: string
  sets: EditableSet[]
}

interface WorkoutSessionDialogProps {
  open: boolean
  session: WorkoutSessionRecord | null
  exercises: WorkoutExerciseRecord[]
  programs: WorkoutProgramRecord[]
  busy: boolean
  onOpenChange: (open: boolean) => void
  onSave: (input: CreateWorkoutSessionInput | UpdateWorkoutSessionInput) => Promise<void>
}

function todayKey(): string {
  const date = new Date()
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

export function WorkoutSessionDialog({
  open,
  session,
  exercises,
  programs,
  busy,
  onOpenChange,
  onSave
}: WorkoutSessionDialogProps): React.JSX.Element {
  const [programId, setProgramId] = useState(CUSTOM)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(todayKey())
  const [duration, setDuration] = useState('')
  const [comment, setComment] = useState('')
  const [items, setItems] = useState<EditableExercise[]>([])
  const [exerciseToAdd, setExerciseToAdd] = useState(NONE)
  const [error, setError] = useState<string | null>(null)

  const exerciseMap = useMemo(
    () => new Map(exercises.map((exercise) => [exercise.id, exercise])),
    [exercises]
  )

  useEffect(() => {
    if (!open) return
    setProgramId(session?.programId ?? CUSTOM)
    setTitle(session?.title ?? '')
    setDate(session?.date ?? todayKey())
    setDuration(
      session?.durationMinutes === null || !session ? '' : String(session.durationMinutes)
    )
    setComment(session?.comment ?? '')
    setItems(
      session?.exercises.map((exercise) => ({
        exerciseId: exercise.exerciseId ?? '',
        comment: exercise.comment,
        sets: exercise.sets.map((set) => ({
          reps: String(set.reps),
          weightKg: String(set.weightKg)
        }))
      })) ?? []
    )
    setExerciseToAdd(NONE)
    setError(null)
  }, [open, session])

  const availableExercises = exercises.filter(
    (exercise) => !items.some((item) => item.exerciseId === exercise.id)
  )

  function chooseProgram(value: string): void {
    setProgramId(value)
    if (value === CUSTOM) {
      setItems([])
      return
    }
    const program = programs.find((candidate) => candidate.id === value)
    if (!program) return
    setItems(
      program.exercises.map((programExercise) => ({
        exerciseId: programExercise.exerciseId,
        comment: '',
        sets: [{ reps: '', weightKg: '' }]
      }))
    )
  }

  function addExercise(): void {
    if (exerciseToAdd === NONE) return
    setItems((current) => [
      ...current,
      { exerciseId: exerciseToAdd, comment: '', sets: [{ reps: '', weightKg: '' }] }
    ])
    setExerciseToAdd(NONE)
  }

  function updateExercise(index: number, patch: Partial<EditableExercise>): void {
    setItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item))
    )
  }

  function updateSet(exerciseIndex: number, setIndex: number, patch: Partial<EditableSet>): void {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === exerciseIndex
          ? {
              ...item,
              sets: item.sets.map((set, index) => (index === setIndex ? { ...set, ...patch } : set))
            }
          : item
      )
    )
  }

  const valid =
    items.length > 0 &&
    items.every(
      (item) =>
        item.exerciseId &&
        item.sets.length > 0 &&
        item.sets.every((set) => Number(set.reps) >= 1 && Number(set.weightKg || 0) >= 0)
    )

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (!valid || !date || busy) return
    const payload: CreateWorkoutSessionInput = {
      programId: programId === CUSTOM ? null : programId,
      title: title.trim(),
      date,
      durationMinutes: duration.trim() ? Number(duration) : null,
      comment,
      exercises: items.map((item) => ({
        exerciseId: item.exerciseId,
        comment: item.comment,
        sets: item.sets.map((set) => ({
          reps: Number(set.reps),
          weightKg: Number(set.weightKg || 0)
        }))
      }))
    }
    try {
      await onSave(session ? { ...payload, id: session.id } : payload)
      onOpenChange(false)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось сохранить тренировку')
    }
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={session ? 'Изменить тренировку' : 'Записать тренировку'}
      description="Выберите программу или соберите свободную тренировку из своей библиотеки упражнений."
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
            disabled={busy || !valid || !date}
            className="h-10 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {busy ? 'Сохраняем…' : session ? 'Сохранить' : 'Добавить тренировку'}
          </button>
        </>
      }
    >
      <form id={FORM_ID} className="space-y-5" onSubmit={(event) => void submit(event)}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5 sm:col-span-2">
            <span className="text-xs font-medium text-[var(--app-muted)]">Основа тренировки</span>
            <AppSelect
              ariaLabel="Программа тренировки"
              value={programId}
              options={[
                { value: CUSTOM, label: 'Свободная тренировка' },
                ...programs.map((program) => ({ value: program.id, label: program.name }))
              ]}
              onValueChange={chooseProgram}
            />
          </div>
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-[var(--app-muted)]">Дата</span>
            <input
              type="date"
              value={date}
              className="h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-violet-500/45"
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-[var(--app-muted)]">Длительность, мин</span>
            <input
              type="number"
              min={1}
              max={1440}
              value={duration}
              placeholder="Например, 70"
              className="h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60 focus:border-violet-500/45"
              onChange={(event) => setDuration(event.target.value)}
            />
          </label>
          <label className="space-y-1.5 sm:col-span-2">
            <span className="text-xs font-medium text-[var(--app-muted)]">Название записи</span>
            <input
              value={title}
              maxLength={160}
              placeholder="Необязательно — например, Тяжёлая тренировка ног"
              className="h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60 focus:border-violet-500/45"
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <label className="space-y-1.5 sm:col-span-2">
            <span className="text-xs font-medium text-[var(--app-muted)]">Общий комментарий</span>
            <input
              value={comment}
              maxLength={10000}
              placeholder="Самочувствие во время тренировки, заметки…"
              className="h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60 focus:border-violet-500/45"
              onChange={(event) => setComment(event.target.value)}
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
                ariaLabel="Добавить упражнение в тренировку"
                value={exerciseToAdd}
                options={[
                  {
                    value: NONE,
                    label: availableExercises.length
                      ? 'Выберите упражнение'
                      : 'Нет доступных упражнений'
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

        <div className="space-y-3">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--app-border)] px-5 py-8 text-center text-sm text-[var(--app-muted)]">
              Добавьте упражнения или выберите программу.
            </div>
          ) : (
            items.map((item, exerciseIndex) => {
              const exercise = exerciseMap.get(item.exerciseId)
              return (
                <article
                  key={item.exerciseId || exerciseIndex}
                  className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-violet-400/15 bg-violet-500/10 text-violet-300">
                      <Dumbbell className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-[var(--app-text)]">
                        {exercise?.title ?? 'Упражнение недоступно'}
                      </div>
                      {exercise && (
                        <div className="mt-0.5 text-xs text-[var(--app-muted)]">
                          {workoutMuscleGroupsLabel(exercise.muscleGroups)} · {item.sets.length}{' '}
                          {item.sets.length === 1 ? 'подход' : 'подходов'}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      aria-label="Удалить упражнение из тренировки"
                      className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-red-500/10 hover:text-red-300"
                      onClick={() =>
                        setItems((current) => current.filter((_, index) => index !== exerciseIndex))
                      }
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>

                  <div className="mt-4 overflow-hidden rounded-xl border border-[var(--app-border)]">
                    <div className="grid grid-cols-[52px_minmax(100px,1fr)_minmax(100px,1fr)_42px] gap-2 bg-[var(--app-workspace)] px-3 py-2 text-[11px] font-semibold tracking-[0.08em] text-[var(--app-muted)] uppercase">
                      <span>№</span>
                      <span>Повторы</span>
                      <span>Вес, кг</span>
                      <span />
                    </div>
                    <div className="divide-y divide-[var(--app-border)]">
                      {item.sets.map((set, setIndex) => (
                        <div
                          key={setIndex}
                          className="grid grid-cols-[52px_minmax(100px,1fr)_minmax(100px,1fr)_42px] items-center gap-2 px-3 py-2.5"
                        >
                          <span className="text-xs font-semibold text-[var(--app-muted)]">
                            {setIndex + 1}
                          </span>
                          <input
                            type="number"
                            min={1}
                            value={set.reps}
                            aria-label={`Повторения, подход ${setIndex + 1}`}
                            className="h-9 rounded-lg border border-[var(--app-border)] bg-[var(--app-workspace)] px-2.5 text-sm text-[var(--app-text)] outline-none focus:border-violet-500/45"
                            onChange={(event) =>
                              updateSet(exerciseIndex, setIndex, { reps: event.target.value })
                            }
                          />
                          <input
                            type="number"
                            min={0}
                            step="0.25"
                            value={set.weightKg}
                            placeholder="0"
                            aria-label={`Вес, подход ${setIndex + 1}`}
                            className="h-9 rounded-lg border border-[var(--app-border)] bg-[var(--app-workspace)] px-2.5 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60 focus:border-violet-500/45"
                            onChange={(event) =>
                              updateSet(exerciseIndex, setIndex, { weightKg: event.target.value })
                            }
                          />
                          <button
                            type="button"
                            aria-label={`Удалить подход ${setIndex + 1}`}
                            disabled={item.sets.length === 1}
                            className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-red-500/10 hover:text-red-300 disabled:opacity-20"
                            onClick={() =>
                              updateExercise(exerciseIndex, {
                                sets: item.sets.filter((_, index) => index !== setIndex)
                              })
                            }
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="inline-flex h-9 items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-xs font-medium text-[var(--app-muted)] hover:bg-[var(--app-control-hover)] hover:text-[var(--app-text)]"
                      onClick={() => {
                        const previous = item.sets.at(-1)
                        updateExercise(exerciseIndex, {
                          sets: [
                            ...item.sets,
                            {
                              reps: previous?.reps ?? '',
                              weightKg: previous?.weightKg ?? ''
                            }
                          ]
                        })
                      }}
                    >
                      <Plus className="size-3.5" /> Добавить подход
                    </button>
                    <input
                      value={item.comment}
                      maxLength={4000}
                      placeholder="Комментарий к упражнению…"
                      className="h-9 min-w-[220px] flex-1 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-xs text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60 focus:border-violet-500/45"
                      onChange={(event) =>
                        updateExercise(exerciseIndex, { comment: event.target.value })
                      }
                    />
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
