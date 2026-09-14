import { useMemo, useRef, useState } from 'react'
import { ScrollView, Text, TextInput, View } from 'react-native'
import type {
  CreateWorkoutSessionInput,
  UpdateWorkoutSessionInput,
  WorkoutExerciseRecord,
  WorkoutProgramRecord,
  WorkoutSessionRecord
} from '@mymind/contracts/workouts'
import {
  createWorkoutSessionInputSchema,
  updateWorkoutSessionInputSchema
} from '@mymind/core/validation/workouts'
import { AppDialog } from '../../shared/ui/AppDialog'
import { AppDateField, AppSelect } from '../../shared/ui/FormControls'
import { Button, EmptyState, ErrorState, IconButton, Label } from '../../shared/ui/primitives'
import { messageFor, nullableNumeric, numeric } from '../../shared/ui/form-model'
import { useConfirmation } from '../../shared/ui/ConfirmationProvider'
import { useTheme } from '../../shared/ui/theme'
import { WorkoutMuscleMapSheet } from './WorkoutMuscleMapSheet'

interface DraftSet {
  key: string
  reps: string
  weightKg: string
}

interface DraftExercise {
  key: string
  exerciseId: string
  comment: string
  sets: DraftSet[]
}

function localDateKey(): string {
  const date = new Date()
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

export function WorkoutSessionSheet({
  session,
  exercises,
  programs,
  save,
  close
}: {
  session?: WorkoutSessionRecord
  exercises: WorkoutExerciseRecord[]
  programs: WorkoutProgramRecord[]
  save(input: CreateWorkoutSessionInput | UpdateWorkoutSessionInput): void | Promise<void>
  close(): void
}): React.JSX.Element {
  const theme = useTheme()
  const confirm = useConfirmation()
  const counter = useRef(0)
  const activeExercises = useMemo(
    () =>
      exercises.filter(
        (exercise) =>
          exercise.status === 'active' ||
          session?.exercises.some((item) => item.exerciseId === exercise.id)
      ),
    [exercises, session]
  )
  const exerciseById = useMemo(
    () => new Map(exercises.map((exercise) => [exercise.id, exercise])),
    [exercises]
  )
  const [programId, setProgramId] = useState<string | null>(session?.programId ?? null)
  const [date, setDate] = useState(session?.date ?? localDateKey())
  const [durationMinutes, setDurationMinutes] = useState(
    session?.durationMinutes === null || session?.durationMinutes === undefined
      ? ''
      : String(session.durationMinutes)
  )
  const [comment, setComment] = useState(session?.comment ?? '')
  const [items, setItems] = useState<DraftExercise[]>(() =>
    session
      ? session.exercises
          .filter(
            (exercise): exercise is typeof exercise & { exerciseId: string } =>
              exercise.exerciseId !== null
          )
          .map((exercise) => ({
            key: exercise.id,
            exerciseId: exercise.exerciseId,
            comment: exercise.comment,
            sets: exercise.sets.map((set) => ({
              key: set.id,
              reps: String(set.reps),
              weightKg: String(set.weightKg)
            }))
          }))
      : []
  )
  const [exerciseToAdd, setExerciseToAdd] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [muscleMapOpen, setMuscleMapOpen] = useState(false)

  const nextKey = (prefix: string): string => `${prefix}-${++counter.current}`
  const requestClose = (): void => {
    if (pending) return
    void confirm({
      title: 'Закрыть тренировку?',
      description: 'Несохранённые изменения будут потеряны.',
      confirmLabel: 'Не сохранять',
      tone: 'warning',
      notice: null,
      onConfirm: close
    })
  }

  const chooseProgram = (value: string | null): void => {
    setProgramId(value)
    setExerciseToAdd(null)
    setError('')
    if (!value) {
      setItems([])
      return
    }
    const program = programs.find((candidate) => candidate.id === value)
    if (!program) return
    setItems(
      program.exercises.map((programExercise) => ({
        key: nextKey('program-exercise'),
        exerciseId: programExercise.exerciseId,
        comment: '',
        sets: [{ key: nextKey('set'), reps: '', weightKg: '' }]
      }))
    )
  }

  const availableExercises = activeExercises.filter(
    (exercise) => !items.some((item) => item.exerciseId === exercise.id)
  )

  const addExercise = (): void => {
    if (!exerciseToAdd) return
    setItems((current) => [
      ...current,
      {
        key: nextKey('exercise'),
        exerciseId: exerciseToAdd,
        comment: '',
        sets: [{ key: nextKey('set'), reps: '', weightKg: '' }]
      }
    ])
    setExerciseToAdd(null)
    setError('')
  }

  const muscleMapExercises = items
    .map((item) => exerciseById.get(item.exerciseId))
    .filter((exercise): exercise is WorkoutExerciseRecord => exercise !== undefined)
    .map((exercise) => ({ title: exercise.title, muscleGroups: exercise.muscleGroups }))

  const valid =
    Boolean(date) &&
    items.length > 0 &&
    items.every((item) => {
      const exercise = exerciseById.get(item.exerciseId)
      return (
        exercise !== undefined &&
        item.sets.length > 0 &&
        item.sets.every((set) => {
          const reps = Number(set.reps)
          const weight = Number(set.weightKg || 0)
          return (
            Number.isFinite(reps) &&
            reps >= 1 &&
            (!exercise.usesExternalWeight || (Number.isFinite(weight) && weight >= 0))
          )
        })
      )
    })

  const submit = async (): Promise<void> => {
    if (pending || !valid) return
    setPending(true)
    setError('')
    try {
      const payload = {
        programId,
        date,
        durationMinutes: nullableNumeric(durationMinutes),
        comment,
        exercises: items.map((item) => {
          const exercise = exerciseById.get(item.exerciseId)
          return {
            exerciseId: item.exerciseId,
            comment: item.comment,
            sets: item.sets.map((set) => ({
              reps: numeric(set.reps),
              weightKg: exercise?.usesExternalWeight ? numeric(set.weightKg || 0) : 0
            }))
          }
        })
      }
      const input = session
        ? updateWorkoutSessionInputSchema.parse({ id: session.id, ...payload })
        : createWorkoutSessionInputSchema.parse(payload)
      await save(input)
      close()
    } catch (reason) {
      setError(messageFor(reason))
    } finally {
      setPending(false)
    }
  }

  const inputStyle = {
    color: theme.text,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16
  } as const

  return (
    <AppDialog
      open
      onOpenChange={(open) => {
        if (!open) requestClose()
      }}
      title={session ? 'Изменить тренировку' : 'Записать тренировку'}
      description="Выберите программу или соберите свободную тренировку из своей библиотеки упражнений."
      icon="workouts"
      presentation="sheet"
      busy={pending}
      footer={
        <>
          <Button label="Отмена" disabled={pending} onPress={requestClose} />
          <Button
            label={pending ? 'Сохранение…' : session ? 'Сохранить' : 'Добавить тренировку'}
            primary
            disabled={pending || !valid}
            onPress={() => void submit()}
          />
        </>
      }
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: 28, gap: 18 }}
      >
        {error ? <ErrorState message={error} /> : null}

        <View style={{ gap: 8 }}>
          <Label>Основа тренировки</Label>
          <AppSelect
            label="Программа тренировки"
            value={programId}
            choices={[
              { value: null, label: 'Свободная тренировка' },
              ...programs
                .filter((program) => program.status === 'active' || program.id === programId)
                .map((program) => ({ value: program.id, label: program.name }))
            ]}
            onChange={chooseProgram}
            disabled={pending}
          />
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <View style={{ minWidth: 180, flex: 1, gap: 8 }}>
            <Label>Дата</Label>
            <AppDateField
              label="Дата тренировки"
              value={date}
              onChangeText={setDate}
              disabled={pending}
            />
          </View>
          <View style={{ minWidth: 150, flex: 1, gap: 8 }}>
            <Label>Длительность, мин</Label>
            <TextInput
              accessibilityLabel="Длительность тренировки"
              editable={!pending}
              value={durationMinutes}
              onChangeText={setDurationMinutes}
              keyboardType="number-pad"
              placeholder="Например, 70"
              placeholderTextColor={theme.muted}
              style={inputStyle}
            />
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <Label>Комментарий</Label>
          <TextInput
            accessibilityLabel="Комментарий тренировки"
            editable={!pending}
            value={comment}
            onChangeText={setComment}
            multiline
            textAlignVertical="top"
            placeholder="Самочувствие во время тренировки, заметки…"
            placeholderTextColor={theme.muted}
            style={{ ...inputStyle, minHeight: 90 }}
          />
        </View>

        <View
          style={{
            gap: 10,
            padding: 12,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 16,
            backgroundColor: theme.background
          }}
        >
          <Label>Добавить упражнение</Label>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
            <View style={{ flex: 1 }}>
              <AppSelect
                label="Упражнение"
                value={exerciseToAdd}
                choices={[
                  {
                    value: null,
                    label: availableExercises.length
                      ? 'Выберите упражнение'
                      : 'Нет доступных упражнений'
                  },
                  ...availableExercises.map((exercise) => ({
                    value: exercise.id,
                    label: exercise.title
                  }))
                ]}
                onChange={setExerciseToAdd}
                disabled={pending || availableExercises.length === 0}
              />
            </View>
            <Button
              label="Добавить"
              icon="add"
              disabled={pending || !exerciseToAdd}
              onPress={addExercise}
            />
          </View>
        </View>

        <View style={{ gap: 12 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10
            }}
          >
            <Label title>Упражнения</Label>
            <Button
              label="Карта мышц"
              disabled={items.length === 0}
              onPress={() => setMuscleMapOpen(true)}
            />
          </View>
          {items.length === 0 ? (
            <EmptyState text="Добавьте упражнения или выберите программу." />
          ) : (
            items.map((item, exerciseIndex) => {
              const exercise = exerciseById.get(item.exerciseId)
              return (
                <View
                  key={item.key}
                  style={{
                    gap: 12,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 16,
                    backgroundColor: theme.surface
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10
                    }}
                  >
                    <View style={{ minWidth: 0, flex: 1 }}>
                      <Text
                        numberOfLines={1}
                        style={{ color: theme.text, fontSize: 15, fontWeight: '700' }}
                      >
                        {exercise?.title ?? 'Упражнение недоступно'}
                      </Text>
                      <Text style={{ marginTop: 3, color: theme.muted, fontSize: 11 }}>
                        {exercise?.usesExternalWeight ? 'С дополнительным весом' : 'Без дополнительного веса'} · {item.sets.length} подходов
                      </Text>
                    </View>
                    <IconButton
                      label="Удалить упражнение из тренировки"
                      icon="delete"
                      compact
                      disabled={pending}
                      onPress={() =>
                        setItems((current) => current.filter((candidate) => candidate.key !== item.key))
                      }
                    />
                  </View>

                  <TextInput
                    accessibilityLabel={`Комментарий упражнения ${exerciseIndex + 1}`}
                    editable={!pending}
                    value={item.comment}
                    onChangeText={(value) =>
                      setItems((current) =>
                        current.map((currentItem) =>
                          currentItem.key === item.key
                            ? { ...currentItem, comment: value }
                            : currentItem
                        )
                      )
                    }
                    placeholder="Комментарий к упражнению"
                    placeholderTextColor={theme.muted}
                    style={inputStyle}
                  />

                  {item.sets.map((set, setIndex) => (
                    <View key={set.key} style={{ gap: 7 }}>
                      <Label muted>{`Подход ${setIndex + 1}`}</Label>
                      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                        <TextInput
                          accessibilityLabel={`Повторения, подход ${setIndex + 1}`}
                          editable={!pending}
                          value={set.reps}
                          onChangeText={(value) =>
                            setItems((current) =>
                              current.map((currentItem) =>
                                currentItem.key === item.key
                                  ? {
                                      ...currentItem,
                                      sets: currentItem.sets.map((currentSet) =>
                                        currentSet.key === set.key
                                          ? { ...currentSet, reps: value }
                                          : currentSet
                                      )
                                    }
                                  : currentItem
                              )
                            )
                          }
                          keyboardType="number-pad"
                          placeholder="Повторы"
                          placeholderTextColor={theme.muted}
                          style={{ ...inputStyle, flex: 1 }}
                        />
                        {exercise?.usesExternalWeight ? (
                          <TextInput
                            accessibilityLabel={`Вес, подход ${setIndex + 1}`}
                            editable={!pending}
                            value={set.weightKg}
                            onChangeText={(value) =>
                              setItems((current) =>
                                current.map((currentItem) =>
                                  currentItem.key === item.key
                                    ? {
                                        ...currentItem,
                                        sets: currentItem.sets.map((currentSet) =>
                                          currentSet.key === set.key
                                            ? { ...currentSet, weightKg: value }
                                            : currentSet
                                        )
                                      }
                                    : currentItem
                                )
                              )
                            }
                            keyboardType="decimal-pad"
                            placeholder="Вес, кг"
                            placeholderTextColor={theme.muted}
                            style={{ ...inputStyle, flex: 1 }}
                          />
                        ) : null}
                        <IconButton
                          label="Удалить подход"
                          icon="delete"
                          compact
                          disabled={pending || item.sets.length <= 1}
                          onPress={() =>
                            setItems((current) =>
                              current.map((currentItem) =>
                                currentItem.key === item.key
                                  ? {
                                      ...currentItem,
                                      sets: currentItem.sets.filter(
                                        (currentSet) => currentSet.key !== set.key
                                      )
                                    }
                                  : currentItem
                              )
                            )
                          }
                        />
                      </View>
                    </View>
                  ))}

                  <View style={{ alignItems: 'flex-start' }}>
                    <Button
                      label="+ Подход"
                      disabled={pending}
                      onPress={() =>
                        setItems((current) =>
                          current.map((currentItem) =>
                            currentItem.key === item.key
                              ? {
                                  ...currentItem,
                                  sets: [
                                    ...currentItem.sets,
                                    {
                                      key: nextKey('set'),
                                      reps: currentItem.sets.at(-1)?.reps ?? '',
                                      weightKg: currentItem.sets.at(-1)?.weightKg ?? ''
                                    }
                                  ]
                                }
                              : currentItem
                          )
                        )
                      }
                    />
                  </View>
                </View>
              )
            })
          )}
        </View>
      </ScrollView>
      {muscleMapOpen ? (
        <WorkoutMuscleMapSheet
          title={`Модель мышц · ${session?.programName || 'Тренировка'}`}
          description="Посмотрите, какие мышцы задействованы в текущем составе тренировки."
          exercises={muscleMapExercises}
          close={() => setMuscleMapOpen(false)}
        />
      ) : null}
    </AppDialog>
  )
}
