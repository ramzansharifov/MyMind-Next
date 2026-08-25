import { Plus, TrendingUp, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import type {
  CreateWorkoutProgressEntryInput,
  UpdateWorkoutProgressEntryInput,
  WorkoutExerciseRecord,
  WorkoutProgressEntryRecord
} from '../../../../../shared/contracts/workouts'
import { AppDateField } from '../../../shared/ui/AppDateField'
import { AppDialog } from '../../../shared/ui/AppDialog'
import { AppSelect } from '../../../shared/ui/AppSelect'
import { workoutMuscleGroupLabel } from '../workout-options'
import { WorkoutMuscleArtwork } from './WorkoutMuscleArtwork'

const FORM_ID = 'workout-progress-form'
const NONE = '__none__'

interface EditableMetric {
  exerciseId: string
  weightKg: string
  reps: string
  comment: string
}

interface WorkoutProgressDialogProps {
  open: boolean
  entry: WorkoutProgressEntryRecord | null
  exercises: WorkoutExerciseRecord[]
  busy: boolean
  onOpenChange: (open: boolean) => void
  onSave: (
    input: CreateWorkoutProgressEntryInput | UpdateWorkoutProgressEntryInput
  ) => Promise<void>
}

function todayKey(): string {
  const date = new Date()
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

export function WorkoutProgressDialog({
  open,
  entry,
  exercises,
  busy,
  onOpenChange,
  onSave
}: WorkoutProgressDialogProps): React.JSX.Element {
  const [date, setDate] = useState(todayKey())
  const [bodyWeight, setBodyWeight] = useState('')
  const [wellbeing, setWellbeing] = useState('')
  const [notes, setNotes] = useState('')
  const [metrics, setMetrics] = useState<EditableMetric[]>([])
  const [exerciseToAdd, setExerciseToAdd] = useState(NONE)
  const [error, setError] = useState<string | null>(null)

  const exerciseMap = useMemo(
    () => new Map(exercises.map((exercise) => [exercise.id, exercise])),
    [exercises]
  )

  useEffect(() => {
    if (!open) return
    setDate(entry?.date ?? todayKey())
    setBodyWeight(entry?.bodyWeightKg === null || !entry ? '' : String(entry.bodyWeightKg))
    setWellbeing(entry?.wellbeing ?? '')
    setNotes(entry?.notes ?? '')
    setMetrics(
      entry?.metrics.map((metric) => ({
        exerciseId: metric.exerciseId ?? '',
        weightKg: String(metric.weightKg),
        reps: String(metric.reps),
        comment: metric.comment
      })) ?? []
    )
    setExerciseToAdd(NONE)
    setError(null)
  }, [entry, open])

  const availableExercises = exercises.filter(
    (exercise) => !metrics.some((metric) => metric.exerciseId === exercise.id)
  )

  function addMetric(): void {
    if (exerciseToAdd === NONE) return
    setMetrics((current) => [
      ...current,
      { exerciseId: exerciseToAdd, weightKg: '', reps: '', comment: '' }
    ])
    setExerciseToAdd(NONE)
  }

  function updateMetric(index: number, patch: Partial<EditableMetric>): void {
    setMetrics((current) =>
      current.map((metric, metricIndex) =>
        metricIndex === index ? { ...metric, ...patch } : metric
      )
    )
  }

  const metricsValid = metrics.every(
    (metric) =>
      Boolean(metric.exerciseId) && Number(metric.reps) >= 1 && Number(metric.weightKg || 0) >= 0
  )

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (!date || !metricsValid || busy) return
    const payload: CreateWorkoutProgressEntryInput = {
      date,
      bodyWeightKg: bodyWeight.trim() ? Number(bodyWeight) : null,
      wellbeing,
      notes,
      metrics: metrics.map((metric) => ({
        exerciseId: metric.exerciseId,
        weightKg: exerciseMap.get(metric.exerciseId)?.usesExternalWeight
          ? Number(metric.weightKg || 0)
          : 0,
        reps: Number(metric.reps),
        comment: metric.comment
      }))
    }
    try {
      await onSave(entry ? { ...payload, id: entry.id } : payload)
      onOpenChange(false)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось сохранить прогресс')
    }
  }

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title={entry ? 'Изменить запись прогресса' : 'Новая запись прогресса'}
      description="Зафиксируйте вес, самочувствие и контрольные показатели. После сохранения добавьте фотографии формы по стандартным ракурсам для визуального сравнения."
      icon={<TrendingUp />}
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
            disabled={busy || !date || !metricsValid}
            className="h-10 rounded-xl bg-violet-500 px-4 text-sm font-semibold text-white hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {busy ? 'Сохраняем…' : entry ? 'Сохранить' : 'Добавить запись'}
          </button>
        </>
      }
    >
      <form id={FORM_ID} className="space-y-5" onSubmit={(event) => void submit(event)}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-[var(--app-muted)]">Дата</span>
            <AppDateField value={date} ariaLabel="Дата прогресса" onChange={setDate} />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-[var(--app-muted)]">Вес тела, кг</span>
            <input
              type="number"
              min={1}
              max={500}
              step="0.1"
              value={bodyWeight}
              placeholder="Необязательно"
              className="h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60 focus:border-violet-500/45"
              onChange={(event) => setBodyWeight(event.target.value)}
            />
          </label>
          <label className="space-y-1.5 sm:col-span-2">
            <span className="text-xs font-medium text-[var(--app-muted)]">Самочувствие</span>
            <textarea
              value={wellbeing}
              rows={3}
              maxLength={10000}
              placeholder="Энергия, сон, восстановление, боли, общее состояние…"
              className="w-full resize-y rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3.5 py-3 text-sm leading-6 text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60 focus:border-violet-500/45 focus:ring-2 focus:ring-violet-500/15"
              onChange={(event) => setWellbeing(event.target.value)}
            />
          </label>
          <label className="space-y-1.5 sm:col-span-2">
            <span className="text-xs font-medium text-[var(--app-muted)]">
              Дополнительные заметки
            </span>
            <textarea
              value={notes}
              rows={2}
              maxLength={10000}
              placeholder="Изменения формы, питания, режима и другие наблюдения…"
              className="w-full resize-y rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3.5 py-3 text-sm leading-6 text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60 focus:border-violet-500/45 focus:ring-2 focus:ring-violet-500/15"
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
        </div>

        <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-3.5">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-[var(--app-text)]">Текущие показатели</h3>
            <p className="mt-1 text-xs text-[var(--app-muted)]">
              Для упражнений с дополнительным весом фиксируются вес и повторения, для упражнений с
              собственным весом — повторения.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[240px] flex-1">
              <AppSelect
                ariaLabel="Добавить показатель упражнения"
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
                    label: `${exercise.title} · ${workoutMuscleGroupLabel(exercise.muscleGroup)}`
                  }))
                ]}
                onValueChange={setExerciseToAdd}
              />
            </div>
            <button
              type="button"
              disabled={exerciseToAdd === NONE}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-500/10 px-3.5 text-sm font-semibold text-violet-200 hover:bg-violet-500/15 disabled:opacity-40"
              onClick={addMetric}
            >
              <Plus className="size-4" /> Добавить
            </button>
          </div>
        </section>

        <div className="space-y-2.5">
          {metrics.map((metric, index) => {
            const exercise = exerciseMap.get(metric.exerciseId)
            return (
              <article
                key={metric.exerciseId || index}
                className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    {exercise && (
                      <WorkoutMuscleArtwork
                        groups={exercise.muscleGroups}
                        className="size-11 shrink-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-0.5"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="font-semibold text-[var(--app-text)]">
                        {exercise?.title ?? 'Упражнение недоступно'}
                      </div>
                      {exercise && (
                        <div className="mt-0.5 text-xs text-[var(--app-muted)]">
                          {workoutMuscleGroupLabel(exercise.muscleGroup)}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label="Удалить показатель"
                    className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-red-500/10 hover:text-red-300"
                    onClick={() =>
                      setMetrics((current) =>
                        current.filter((_, metricIndex) => metricIndex !== index)
                      )
                    }
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div
                  className={`mt-3 grid gap-3 ${
                    exercise?.usesExternalWeight
                      ? 'sm:grid-cols-[140px_140px_minmax(0,1fr)]'
                      : 'sm:grid-cols-[140px_minmax(0,1fr)]'
                  }`}
                >
                  {exercise?.usesExternalWeight && (
                    <label className="space-y-1.5">
                      <span className="text-xs text-[var(--app-muted)]">Вес, кг</span>
                      <input
                        type="number"
                        min={0}
                        step="0.25"
                        value={metric.weightKg}
                        placeholder="0"
                        className="h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60 focus:border-violet-500/45"
                        onChange={(event) => updateMetric(index, { weightKg: event.target.value })}
                      />
                    </label>
                  )}
                  <label className="space-y-1.5">
                    <span className="text-xs text-[var(--app-muted)]">Повторения</span>
                    <input
                      type="number"
                      min={1}
                      value={metric.reps}
                      className="h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm text-[var(--app-text)] outline-none focus:border-violet-500/45"
                      onChange={(event) => updateMetric(index, { reps: event.target.value })}
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs text-[var(--app-muted)]">Комментарий</span>
                    <input
                      value={metric.comment}
                      maxLength={4000}
                      placeholder="Техника, RPE, ощущения…"
                      className="h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60 focus:border-violet-500/45"
                      onChange={(event) => updateMetric(index, { comment: event.target.value })}
                    />
                  </label>
                </div>
              </article>
            )
          })}
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
