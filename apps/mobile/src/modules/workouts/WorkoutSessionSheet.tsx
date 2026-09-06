import { useMemo, useRef, useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  TextInput,
  View
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
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
import { Button, ErrorState, Label } from '../../shared/ui/primitives'
import { messageFor, nullableNumeric, numeric } from '../../shared/ui/form-model'
import { useTheme } from '../../shared/ui/theme'

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
  const counter = useRef(0)
  const activeExercises = useMemo(
    () => exercises.filter((exercise) => exercise.status === 'active' || session?.exercises.some((item) => item.exerciseId === exercise.id)),
    [exercises, session]
  )
  const [programId, setProgramId] = useState<string | null>(session?.programId ?? null)
  const [date, setDate] = useState(session?.date ?? localDateKey())
  const [durationMinutes, setDurationMinutes] = useState(
    session?.durationMinutes === null || session?.durationMinutes === undefined
      ? ''
      : String(session.durationMinutes)
  )
  const [comment, setComment] = useState(session?.comment ?? '')
  const [items, setItems] = useState<DraftExercise[]>(() => {
    if (session) {
      return session.exercises
        .filter((exercise): exercise is typeof exercise & { exerciseId: string } => exercise.exerciseId !== null)
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
    }
    const first = activeExercises[0]
    return first
      ? [
          {
            key: 'initial-exercise',
            exerciseId: first.id,
            comment: '',
            sets: [{ key: 'initial-set', reps: '10', weightKg: '0' }]
          }
        ]
      : []
  })
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  const nextKey = (prefix: string): string => `${prefix}-${++counter.current}`
  const requestClose = (): void => {
    if (pending) return
    Alert.alert('Закрыть тренировку?', 'Несохранённые изменения будут потеряны.', [
      { text: 'Продолжить', style: 'cancel' },
      { text: 'Не сохранять', style: 'destructive', onPress: close }
    ])
  }
  const selectedExercise = (exerciseId: string): WorkoutExerciseRecord | undefined =>
    exercises.find((exercise) => exercise.id === exerciseId)

  const addExercise = (): void => {
    const used = new Set(items.map((item) => item.exerciseId))
    const exercise = activeExercises.find((candidate) => !used.has(candidate.id))
    if (!exercise) {
      setError('Все доступные упражнения уже добавлены.')
      return
    }
    setItems((current) => [
      ...current,
      {
        key: nextKey('exercise'),
        exerciseId: exercise.id,
        comment: '',
        sets: [{ key: nextKey('set'), reps: '10', weightKg: '0' }]
      }
    ])
  }

  const submit = async (): Promise<void> => {
    if (pending) return
    setPending(true)
    setError('')
    try {
      const payload = {
        programId,
        date,
        durationMinutes: nullableNumeric(durationMinutes),
        comment,
        exercises: items.map((item) => {
          const exercise = selectedExercise(item.exerciseId)
          return {
            exerciseId: item.exerciseId,
            comment: item.comment,
            sets: item.sets.map((set) => ({
              reps: numeric(set.reps),
              weightKg: exercise?.usesExternalWeight ? numeric(set.weightKg) : 0
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
    <Modal animationType="slide" onRequestClose={requestClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={{ padding: 16, gap: 12 }}>
            <Label title>{session ? 'Изменить тренировку' : 'Новая тренировка'}</Label>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <Button label="Отмена" disabled={pending} onPress={requestClose} />
              <Button
                label={pending ? 'Сохранение…' : 'Сохранить'}
                selected
                disabled={pending}
                onPress={() => void submit()}
              />
            </View>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 18 }}
          >
            {error ? <ErrorState message={error} /> : null}
            <View style={{ gap: 8 }}>
              <Label>Программа</Label>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                <Button
                  label="Свободная"
                  selected={programId === null}
                  disabled={pending}
                  onPress={() => setProgramId(null)}
                />
                {programs
                  .filter((program) => program.status === 'active' || program.id === programId)
                  .map((program) => (
                    <Button
                      key={program.id}
                      label={program.name}
                      selected={program.id === programId}
                      disabled={pending}
                      onPress={() => setProgramId(program.id)}
                    />
                  ))}
              </ScrollView>
            </View>
            <View style={{ gap: 8 }}>
              <Label>Дата</Label>
              <TextInput
                accessibilityLabel="Дата тренировки"
                editable={!pending}
                value={date}
                onChangeText={setDate}
                placeholder="ГГГГ-ММ-ДД"
                placeholderTextColor={theme.muted}
                style={inputStyle}
              />
            </View>
            <View style={{ gap: 8 }}>
              <Label>Длительность, мин</Label>
              <TextInput
                accessibilityLabel="Длительность тренировки"
                editable={!pending}
                value={durationMinutes}
                onChangeText={setDurationMinutes}
                keyboardType="number-pad"
                placeholder="Не указано"
                placeholderTextColor={theme.muted}
                style={inputStyle}
              />
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
                style={{ ...inputStyle, minHeight: 90 }}
              />
            </View>

            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <Label title>Упражнения</Label>
                <Button label="+ Упражнение" disabled={pending} onPress={addExercise} />
              </View>
              {items.length === 0 ? <ErrorState message="Добавьте хотя бы одно упражнение." /> : null}
              {items.map((item, exerciseIndex) => {
                const exercise = selectedExercise(item.exerciseId)
                const usedByOthers = new Set(
                  items.filter((candidate) => candidate.key !== item.key).map((candidate) => candidate.exerciseId)
                )
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
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <Label>{`Упражнение ${exerciseIndex + 1}`}</Label>
                      {items.length > 1 ? (
                        <Button
                          label="Удалить"
                          danger
                          disabled={pending}
                          onPress={() => setItems((current) => current.filter((candidate) => candidate.key !== item.key))}
                        />
                      ) : null}
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                      {activeExercises.map((candidate) => (
                        <Button
                          key={candidate.id}
                          label={candidate.title}
                          selected={candidate.id === item.exerciseId}
                          disabled={pending || usedByOthers.has(candidate.id)}
                          onPress={() =>
                            setItems((current) =>
                              current.map((currentItem) =>
                                currentItem.key === item.key
                                  ? { ...currentItem, exerciseId: candidate.id }
                                  : currentItem
                              )
                            )
                          }
                        />
                      ))}
                    </ScrollView>
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
                      placeholder="Комментарий"
                      placeholderTextColor={theme.muted}
                      style={inputStyle}
                    />
                    {item.sets.map((set, setIndex) => (
                      <View key={set.key} style={{ gap: 8 }}>
                        <Label muted>{`Подход ${setIndex + 1}`}</Label>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
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
                          {item.sets.length > 1 ? (
                            <Button
                              label="−"
                              danger
                              disabled={pending}
                              onPress={() =>
                                setItems((current) =>
                                  current.map((currentItem) =>
                                    currentItem.key === item.key
                                      ? {
                                          ...currentItem,
                                          sets: currentItem.sets.filter((currentSet) => currentSet.key !== set.key)
                                        }
                                      : currentItem
                                  )
                                )
                              }
                            />
                          ) : null}
                        </View>
                      </View>
                    ))}
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
                                      reps: currentItem.sets.at(-1)?.reps ?? '10',
                                      weightKg: currentItem.sets.at(-1)?.weightKg ?? '0'
                                    }
                                  ]
                                }
                              : currentItem
                          )
                        )
                      }
                    />
                  </View>
                )
              })}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  )
}
