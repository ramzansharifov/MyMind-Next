import { useMemo, useRef, useState } from 'react'
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  TextInput,
  View
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type {
  CreateWorkoutProgressEntryInput,
  UpdateWorkoutProgressEntryInput,
  WorkoutExerciseRecord,
  WorkoutProgressEntryRecord,
  WorkoutProgressPhotoRecord,
  WorkoutProgressPhotoView
} from '@mymind/contracts/workouts'
import {
  createWorkoutProgressEntryInputSchema,
  updateWorkoutProgressEntryInputSchema
} from '@mymind/core/validation/workouts'
import { Button, ErrorState, Label } from '../../shared/ui/primitives'
import { messageFor, nullableNumeric, numeric } from '../../shared/ui/form-model'
import { useTheme } from '../../shared/ui/theme'

interface DraftMetric {
  key: string
  exerciseId: string
  weightKg: string
  reps: string
  comment: string
}

function localDateKey(): string {
  const date = new Date()
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

export function WorkoutProgressSheet({
  entry,
  exercises,
  save,
  importPhoto,
  deletePhoto,
  close
}: {
  entry?: WorkoutProgressEntryRecord
  exercises: WorkoutExerciseRecord[]
  save(
    input: CreateWorkoutProgressEntryInput | UpdateWorkoutProgressEntryInput
  ): void | Promise<void>
  importPhoto?(view: WorkoutProgressPhotoView): Promise<WorkoutProgressPhotoRecord | null>
  deletePhoto?(photo: WorkoutProgressPhotoRecord): Promise<void>
  close(): void
}): React.JSX.Element {
  const theme = useTheme()
  const counter = useRef(0)
  const selectableExercises = useMemo(
    () =>
      exercises.filter(
        (exercise) =>
          exercise.status === 'active' ||
          entry?.metrics.some((metric) => metric.exerciseId === exercise.id)
      ),
    [entry, exercises]
  )
  const [date, setDate] = useState(entry?.date ?? localDateKey())
  const [bodyWeightKg, setBodyWeightKg] = useState(
    entry?.bodyWeightKg === null || entry?.bodyWeightKg === undefined
      ? ''
      : String(entry.bodyWeightKg)
  )
  const [wellbeing, setWellbeing] = useState(entry?.wellbeing ?? '')
  const [notes, setNotes] = useState(entry?.notes ?? '')
  const [metrics, setMetrics] = useState<DraftMetric[]>(
    () =>
      entry?.metrics
        .filter(
          (metric): metric is typeof metric & { exerciseId: string } => metric.exerciseId !== null
        )
        .map((metric) => ({
          key: metric.id,
          exerciseId: metric.exerciseId,
          weightKg: String(metric.weightKg),
          reps: String(metric.reps),
          comment: metric.comment
        })) ?? []
  )
  const [pending, setPending] = useState(false)
  const [photos, setPhotos] = useState(entry?.photos ?? [])
  const [error, setError] = useState('')

  const nextKey = (): string => `metric-${++counter.current}`
  const exerciseById = (id: string): WorkoutExerciseRecord | undefined =>
    exercises.find((exercise) => exercise.id === id)
  const requestClose = (): void => {
    if (pending) return
    Alert.alert('Закрыть запись прогресса?', 'Несохранённые изменения будут потеряны.', [
      { text: 'Продолжить', style: 'cancel' },
      { text: 'Не сохранять', style: 'destructive', onPress: close }
    ])
  }
  const addMetric = (): void => {
    const used = new Set(metrics.map((metric) => metric.exerciseId))
    const exercise = selectableExercises.find((candidate) => !used.has(candidate.id))
    if (!exercise) {
      setError('Все доступные упражнения уже добавлены в показатели.')
      return
    }
    setMetrics((current) => [
      ...current,
      {
        key: nextKey(),
        exerciseId: exercise.id,
        weightKg: '0',
        reps: '1',
        comment: ''
      }
    ])
  }

  const addPhoto = async (view: WorkoutProgressPhotoView): Promise<void> => {
    if (!importPhoto || pending) return
    setPending(true)
    setError('')
    try {
      const photo = await importPhoto(view)
      if (!photo) return
      setPhotos((current) =>
        view === 'custom'
          ? [...current, photo]
          : [...current.filter((item) => item.view !== view), photo]
      )
    } catch (reason) {
      setError(messageFor(reason))
    } finally {
      setPending(false)
    }
  }

  const removePhoto = (photo: WorkoutProgressPhotoRecord): void => {
    if (!deletePhoto || pending) return
    Alert.alert('Удалить фотографию?', 'Файл будет удалён с этого устройства.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => {
          setPending(true)
          setError('')
          void deletePhoto(photo)
            .then(() => setPhotos((current) => current.filter((item) => item.id !== photo.id)))
            .catch((reason: unknown) => setError(messageFor(reason)))
            .finally(() => setPending(false))
        }
      }
    ])
  }

  const submit = async (): Promise<void> => {
    if (pending) return
    setPending(true)
    setError('')
    try {
      const payload = {
        date,
        bodyWeightKg: nullableNumeric(bodyWeightKg),
        wellbeing,
        notes,
        metrics: metrics.map((metric) => {
          const exercise = exerciseById(metric.exerciseId)
          return {
            exerciseId: metric.exerciseId,
            weightKg: exercise?.usesExternalWeight ? numeric(metric.weightKg) : 0,
            reps: numeric(metric.reps),
            comment: metric.comment
          }
        })
      }
      const input = entry
        ? updateWorkoutProgressEntryInputSchema.parse({ id: entry.id, ...payload })
        : createWorkoutProgressEntryInputSchema.parse(payload)
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
            <Label title>{entry ? 'Изменить прогресс' : 'Новая запись прогресса'}</Label>
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
              <Label>Дата</Label>
              <TextInput
                accessibilityLabel="Дата прогресса"
                editable={!pending}
                value={date}
                onChangeText={setDate}
                placeholder="ГГГГ-ММ-ДД"
                placeholderTextColor={theme.muted}
                style={inputStyle}
              />
            </View>
            <View style={{ gap: 8 }}>
              <Label>Вес тела, кг</Label>
              <TextInput
                accessibilityLabel="Вес тела"
                editable={!pending}
                value={bodyWeightKg}
                onChangeText={setBodyWeightKg}
                keyboardType="decimal-pad"
                placeholder="Не указано"
                placeholderTextColor={theme.muted}
                style={inputStyle}
              />
            </View>
            <View style={{ gap: 8 }}>
              <Label>Самочувствие</Label>
              <TextInput
                accessibilityLabel="Самочувствие"
                editable={!pending}
                value={wellbeing}
                onChangeText={setWellbeing}
                multiline
                textAlignVertical="top"
                style={{ ...inputStyle, minHeight: 90 }}
              />
            </View>
            <View style={{ gap: 8 }}>
              <Label>Заметки</Label>
              <TextInput
                accessibilityLabel="Заметки прогресса"
                editable={!pending}
                value={notes}
                onChangeText={setNotes}
                multiline
                textAlignVertical="top"
                style={{ ...inputStyle, minHeight: 90 }}
              />
            </View>

            {entry ? (
              <View style={{ gap: 12 }}>
                <Label title>Фотографии прогресса</Label>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8 }}
                >
                  {(
                    [
                      ['front', 'Спереди'],
                      ['left', 'Слева'],
                      ['right', 'Справа'],
                      ['back', 'Сзади'],
                      ['custom', 'Другое']
                    ] as const
                  ).map(([view, label]) => (
                    <Button
                      key={view}
                      label={`+ ${label}`}
                      disabled={pending}
                      onPress={() => void addPhoto(view)}
                    />
                  ))}
                </ScrollView>
                {photos.length ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 10 }}
                  >
                    {photos.map((photo) => (
                      <View
                        key={photo.id}
                        style={{
                          width: 132,
                          gap: 8,
                          padding: 8,
                          borderWidth: 1,
                          borderColor: theme.border,
                          borderRadius: 14,
                          backgroundColor: theme.surface
                        }}
                      >
                        <Image
                          accessibilityLabel={`Фотография прогресса: ${photo.view}`}
                          source={{ uri: photo.url }}
                          resizeMode="cover"
                          style={{ width: 114, height: 142, borderRadius: 10 }}
                        />
                        <Button
                          label="Удалить"
                          danger
                          disabled={pending}
                          onPress={() => removePhoto(photo)}
                        />
                      </View>
                    ))}
                  </ScrollView>
                ) : (
                  <Label muted>Фотографий пока нет. Они хранятся только на этом устройстве.</Label>
                )}
              </View>
            ) : (
              <Label muted>
                Сохраните запись, затем откройте её снова, чтобы добавить фотографии.
              </Label>
            )}

            <View style={{ gap: 12 }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                <Label title>Показатели</Label>
                <Button label="+ Показатель" disabled={pending} onPress={addMetric} />
              </View>
              {metrics.map((metric, index) => {
                const exercise = exerciseById(metric.exerciseId)
                const usedByOthers = new Set(
                  metrics
                    .filter((candidate) => candidate.key !== metric.key)
                    .map((candidate) => candidate.exerciseId)
                )
                return (
                  <View
                    key={metric.key}
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
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 8
                      }}
                    >
                      <Label>{`Показатель ${index + 1}`}</Label>
                      <Button
                        label="Удалить"
                        danger
                        disabled={pending}
                        onPress={() =>
                          setMetrics((current) =>
                            current.filter((candidate) => candidate.key !== metric.key)
                          )
                        }
                      />
                    </View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 8 }}
                    >
                      {selectableExercises.map((candidate) => (
                        <Button
                          key={candidate.id}
                          label={candidate.title}
                          selected={candidate.id === metric.exerciseId}
                          disabled={pending || usedByOthers.has(candidate.id)}
                          onPress={() =>
                            setMetrics((current) =>
                              current.map((currentMetric) =>
                                currentMetric.key === metric.key
                                  ? { ...currentMetric, exerciseId: candidate.id }
                                  : currentMetric
                              )
                            )
                          }
                        />
                      ))}
                    </ScrollView>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {exercise?.usesExternalWeight ? (
                        <TextInput
                          accessibilityLabel={`Вес показателя ${index + 1}`}
                          editable={!pending}
                          value={metric.weightKg}
                          onChangeText={(value) =>
                            setMetrics((current) =>
                              current.map((currentMetric) =>
                                currentMetric.key === metric.key
                                  ? { ...currentMetric, weightKg: value }
                                  : currentMetric
                              )
                            )
                          }
                          keyboardType="decimal-pad"
                          placeholder="Вес, кг"
                          placeholderTextColor={theme.muted}
                          style={{ ...inputStyle, flex: 1 }}
                        />
                      ) : null}
                      <TextInput
                        accessibilityLabel={`Повторения показателя ${index + 1}`}
                        editable={!pending}
                        value={metric.reps}
                        onChangeText={(value) =>
                          setMetrics((current) =>
                            current.map((currentMetric) =>
                              currentMetric.key === metric.key
                                ? { ...currentMetric, reps: value }
                                : currentMetric
                            )
                          )
                        }
                        keyboardType="number-pad"
                        placeholder="Повторы"
                        placeholderTextColor={theme.muted}
                        style={{ ...inputStyle, flex: 1 }}
                      />
                    </View>
                    <TextInput
                      accessibilityLabel={`Комментарий показателя ${index + 1}`}
                      editable={!pending}
                      value={metric.comment}
                      onChangeText={(value) =>
                        setMetrics((current) =>
                          current.map((currentMetric) =>
                            currentMetric.key === metric.key
                              ? { ...currentMetric, comment: value }
                              : currentMetric
                          )
                        )
                      }
                      placeholder="Комментарий"
                      placeholderTextColor={theme.muted}
                      style={inputStyle}
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
