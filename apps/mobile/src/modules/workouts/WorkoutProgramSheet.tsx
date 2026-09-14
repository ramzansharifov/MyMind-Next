import { useMemo, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import type {
  CreateWorkoutProgramInput,
  UpdateWorkoutProgramInput,
  WorkoutExerciseRecord,
  WorkoutProgramRecord
} from '@mymind/contracts/workouts'
import {
  createWorkoutProgramInputSchema,
  updateWorkoutProgramInputSchema
} from '@mymind/core/validation/workouts'

import { AppDialog } from '../../shared/ui/AppDialog'
import { AppSelect, AppTextField } from '../../shared/ui/FormControls'
import { Button, EmptyState, IconButton, Label } from '../../shared/ui/primitives'
import { useTheme } from '../../shared/ui/theme'
import { WorkoutMuscleMapSheet } from './WorkoutMuscleMapSheet'

export function WorkoutProgramSheet({
  program,
  exercises,
  save,
  close
}: {
  program?: WorkoutProgramRecord
  exercises: WorkoutExerciseRecord[]
  save(input: CreateWorkoutProgramInput | UpdateWorkoutProgramInput): void | Promise<void>
  close(): void
}): React.JSX.Element {
  const theme = useTheme()
  const [name, setName] = useState(program?.name ?? '')
  const [description, setDescription] = useState(program?.description ?? '')
  const [items, setItems] = useState<string[]>(() => program?.exercises.map((item) => item.exerciseId) ?? [])
  const [exerciseToAdd, setExerciseToAdd] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [muscleMapOpen, setMuscleMapOpen] = useState(false)

  const exerciseById = useMemo(
    () => new Map(exercises.map((exercise) => [exercise.id, exercise])),
    [exercises]
  )
  const available = exercises.filter(
    (exercise) => exercise.status === 'active' && !items.includes(exercise.id)
  )
  const muscleMapExercises = items
    .map((exerciseId) => exerciseById.get(exerciseId))
    .filter((exercise): exercise is WorkoutExerciseRecord => exercise !== undefined)
    .map((exercise) => ({ title: exercise.title, muscleGroups: exercise.muscleGroups }))

  const add = (): void => {
    if (!exerciseToAdd) return
    setItems((current) => [...current, exerciseToAdd])
    setExerciseToAdd(null)
  }

  const move = (index: number, direction: -1 | 1): void => {
    const target = index + direction
    if (target < 0 || target >= items.length) return
    setItems((current) => {
      const next = [...current]
      const [item] = next.splice(index, 1)
      if (item) next.splice(target, 0, item)
      return next
    })
  }

  const submit = async (): Promise<void> => {
    if (!name.trim() || items.length === 0 || pending) return
    setPending(true)
    setError('')
    try {
      const payload = {
        name: name.trim(),
        description,
        status: 'active' as const,
        exercises: items.map((exerciseId) => ({ exerciseId }))
      }
      const input = program
        ? updateWorkoutProgramInputSchema.parse({ id: program.id, ...payload })
        : createWorkoutProgramInputSchema.parse(payload)
      await save(input)
      close()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось сохранить программу')
    } finally {
      setPending(false)
    }
  }

  return (
    <AppDialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) close()
      }}
      title={program ? 'Изменить программу' : 'Новая программа'}
      description="Состав и порядок упражнений. Подходы, повторения и вес задаются в тренировке."
      icon="workouts"
      presentation="sheet"
      busy={pending}
      footer={
        <>
          <Button label="Отмена" disabled={pending} onPress={close} />
          <Button
            label={program ? 'Сохранить' : 'Создать программу'}
            primary
            disabled={pending || !name.trim() || items.length === 0}
            onPress={() => void submit()}
          />
        </>
      }
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: 28, gap: 18 }}
      >
        {error ? (
          <Text style={{ color: theme.error, fontSize: 13, lineHeight: 20 }}>{error}</Text>
        ) : null}

        <View style={{ gap: 8 }}>
          <Label>Название программы</Label>
          <AppTextField
            value={name}
            onChangeText={setName}
            disabled={pending}
            placeholder="Например, Push / Pull / Legs — День 1"
            maxLength={160}
          />
        </View>

        <View style={{ gap: 8 }}>
          <Label>Описание</Label>
          <AppTextField
            value={description}
            onChangeText={setDescription}
            disabled={pending}
            multiline
            placeholder="Необязательно — цель или особенности программы"
            maxLength={10000}
            style={{ minHeight: 92 }}
          />
        </View>

        <View
          style={{
            padding: 12,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 16,
            backgroundColor: theme.background,
            gap: 10
          }}
        >
          <Label>Добавить упражнение</Label>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
            <View style={{ flex: 1 }}>
              <AppSelect
                label="Упражнение для программы"
                value={exerciseToAdd}
                choices={[
                  { value: null, label: available.length ? 'Выберите упражнение' : 'Все упражнения добавлены' },
                  ...available.map((exercise) => ({ value: exercise.id, label: exercise.title }))
                ]}
                onChange={setExerciseToAdd}
                disabled={pending || available.length === 0}
              />
            </View>
            <Button
              label="Добавить"
              icon="add"
              disabled={pending || !exerciseToAdd}
              onPress={add}
            />
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10
            }}
          >
            <Label title>Порядок упражнений</Label>
            <Button
              label="Карта мышц"
              disabled={items.length === 0}
              onPress={() => setMuscleMapOpen(true)}
            />
          </View>
          {items.length === 0 ? (
            <EmptyState text="Сначала добавьте упражнения в программу." />
          ) : (
            items.map((exerciseId, index) => {
              const exercise = exerciseById.get(exerciseId)
              return (
                <View
                  key={exerciseId}
                  style={{
                    minHeight: 62,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 9,
                    borderWidth: 1,
                    borderColor: theme.border,
                    borderRadius: 16,
                    backgroundColor: theme.surface
                  }}
                >
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 10,
                      backgroundColor: theme.accent + '14'
                    }}
                  >
                    <Text style={{ color: theme.accent, fontSize: 12, fontWeight: '700' }}>
                      {index + 1}
                    </Text>
                  </View>
                  <View style={{ minWidth: 0, flex: 1 }}>
                    <Text numberOfLines={1} style={{ color: theme.text, fontSize: 14, fontWeight: '700' }}>
                      {exercise?.title ?? 'Удалённое упражнение'}
                    </Text>
                    {exercise ? (
                      <Text numberOfLines={1} style={{ marginTop: 2, color: theme.muted, fontSize: 11 }}>
                        {exercise.muscleGroups.join(' · ')}
                      </Text>
                    ) : null}
                  </View>
                  <IconButton
                    label="Поднять упражнение"
                    icon="up"
                    compact
                    disabled={pending || index === 0}
                    onPress={() => move(index, -1)}
                  />
                  <IconButton
                    label="Опустить упражнение"
                    icon="down"
                    compact
                    disabled={pending || index === items.length - 1}
                    onPress={() => move(index, 1)}
                  />
                  <IconButton
                    label="Удалить упражнение из программы"
                    icon="delete"
                    compact
                    disabled={pending}
                    onPress={() =>
                      setItems((current) => current.filter((id) => id !== exerciseId))
                    }
                  />
                </View>
              )
            })
          )}
        </View>
      </ScrollView>
      {muscleMapOpen ? (
        <WorkoutMuscleMapSheet
          title={`Карта мышц · ${name.trim() || 'Программа'}`}
          description="Посмотрите, какие мышечные зоны задействованы упражнениями программы."
          exercises={muscleMapExercises}
          close={() => setMuscleMapOpen(false)}
        />
      ) : null}
    </AppDialog>
  )
}
