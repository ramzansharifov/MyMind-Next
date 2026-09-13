import { useCallback, useMemo, useState } from 'react'
import { FlatList, View } from 'react-native'
import type {
  WorkoutExerciseRecord,
  WorkoutMuscleGroup,
  WorkoutProgramRecord,
  WorkoutProgressEntryRecord,
  WorkoutSessionRecord
} from '@mymind/contracts/workouts'
import { WORKOUT_MUSCLE_ZONES } from '@mymind/contracts/workouts'
import * as workoutsValidation from '@mymind/core/validation/workouts'
import { useServices } from '../../app/context'
import { useCollection } from '../../shared/hooks/useCollection'
import { FormSheet } from '../../shared/ui/FormSheet'
import { MobileCreateAction } from '../../shared/ui/MobileCreateAction'
import { choiceField, textField, type FormField, type FormSpec } from '../../shared/ui/form-model'
import { EmptyState, ErrorState, LoadingState, Row, SearchField } from '../../shared/ui/primitives'
import { BarChart3, Dumbbell, FileText, ListChecks, TrendingUp } from 'lucide-react-native'
import { ModuleTabs } from '../../shared/ui/ModuleTabs'
import { AppSelect } from '../../shared/ui/FormControls'
import { WorkoutProgressSheet } from './WorkoutProgressSheet'
import { WorkoutProgramSheet } from './WorkoutProgramSheet'
import { WorkoutProgressView } from './WorkoutProgressView'
import { WorkoutSessionSheet } from './WorkoutSessionSheet'
import { WorkoutReportsView } from './WorkoutReportsView'
import {
  WorkoutMuscleMapSheet,
  type WorkoutMuscleMapExercise
} from './WorkoutMuscleMapSheet'
import {
  filterWorkoutExercises,
  filterWorkoutPrograms,
  filterWorkoutSessions,
  type WorkoutExerciseCategory,
  type WorkoutMuscleFilter,
  type WorkoutProgramFilter
} from './workout-filters'
import { workoutMuscleLabel } from './workout-muscles'

type Tab = 'journal' | 'exercises' | 'programs' | 'progress' | 'reports'

type WorkoutListItem =
  | { kind: 'session'; value: WorkoutSessionRecord }
  | { kind: 'exercise'; value: WorkoutExerciseRecord }
  | { kind: 'program'; value: WorkoutProgramRecord }

const exerciseCategoryOptions: Array<{ value: WorkoutExerciseCategory; label: string }> = [
  { value: 'arms', label: 'Руки' },
  { value: 'back', label: 'Спина' },
  { value: 'legs', label: 'Ноги' },
  { value: 'core', label: 'Корпус' }
]

function multiField(
  key: string,
  label: string,
  choices: readonly { value: string; label: string }[]
): FormField {
  return { key, label, kind: 'multiple', choices }
}

function formatMuscles(exercise: WorkoutExerciseRecord): string {
  return exercise.muscleGroups
    .map((group) => workoutMuscleLabel(group))
    .join(' · ')
}

export function WorkoutsScreen(): React.JSX.Element {
  const { workouts: api } = useServices()
  const overview = useCollection(useCallback(() => api.listOverview(), [api]))
  const [tab, setTab] = useState<Tab>('journal')
  const [query, setQuery] = useState('')
  const [programFilter, setProgramFilter] = useState<WorkoutProgramFilter>('all')
  const [muscleFilter, setMuscleFilter] = useState<WorkoutMuscleFilter>('all')
  const [exerciseCategoryFilter, setExerciseCategoryFilter] = useState<
    'all' | WorkoutExerciseCategory
  >('all')
  const [form, setForm] = useState<FormSpec | null>(null)
  const [sessionEditor, setSessionEditor] = useState<WorkoutSessionRecord | 'new' | null>(null)
  const [programEditor, setProgramEditor] = useState<WorkoutProgramRecord | 'new' | null>(null)
  const [progressEditor, setProgressEditor] = useState<WorkoutProgressEntryRecord | 'new' | null>(
    null
  )

  const exercises = overview.data?.exercises ?? []
  const programs = overview.data?.programs ?? []
  const sessions = overview.data?.sessions ?? []
  const progressEntries = overview.data?.progressEntries ?? []
  const exerciseMap = useMemo(
    () => new Map(exercises.map((exercise) => [exercise.id, exercise])),
    [exercises]
  )
  const filteredExercises = useMemo(
    () =>
      filterWorkoutExercises(
        exercises,
        query,
        exerciseCategoryFilter,
        workoutMuscleLabel
      ),
    [exerciseCategoryFilter, exercises, query]
  )
  const filteredPrograms = useMemo(
    () => filterWorkoutPrograms(programs, exerciseMap, query),
    [exerciseMap, programs, query]
  )
  const filteredSessions = useMemo(
    () => filterWorkoutSessions(sessions, query, programFilter, muscleFilter),
    [muscleFilter, programFilter, query, sessions]
  )

  const muscleChoices = WORKOUT_MUSCLE_ZONES.map((group) => ({
    value: group,
    label: workoutMuscleLabel(group)
  }))
  const exerciseChoices = exercises
    .filter((exercise) => exercise.status === 'active')
    .map((exercise) => ({ value: exercise.id, label: exercise.title }))

  const editExercise = (exercise?: WorkoutExerciseRecord): void => {
    setForm({
      title: exercise ? 'Изменить упражнение' : 'Новое упражнение',
      initial: {
        title: exercise?.title ?? '',
        muscleGroups: exercise?.muscleGroups ?? ['shoulders'],
        usesExternalWeight: exercise?.usesExternalWeight ?? true
      },
      fields: [
        textField('title', 'Название'),
        multiField('muscleGroups', 'Мышечные зоны', muscleChoices),
        { key: 'usesExternalWeight', label: 'Используется внешний вес', kind: 'boolean' }
      ],
      save: (values) => {
        if (exercise) {
          api.updateExercise(
            workoutsValidation.updateWorkoutExerciseInputSchema.parse({
              id: exercise.id,
              title: values.title,
              muscleGroups: values.muscleGroups,
              usesExternalWeight: values.usesExternalWeight,
              status: 'active'
            })
          )
        } else {
          api.createExercise(
            workoutsValidation.createWorkoutExerciseInputSchema.parse({
              title: values.title,
              muscleGroups: values.muscleGroups,
              usesExternalWeight: values.usesExternalWeight,
              status: 'active'
            })
          )
        }
        overview.refresh()
      }
    })
  }



  const tabs = [
    { id: 'journal' as const, label: 'Тренировки', icon: Dumbbell },
    { id: 'exercises' as const, label: 'Упражнения', icon: ListChecks },
    { id: 'programs' as const, label: 'Программы', icon: FileText },
    { id: 'progress' as const, label: 'Прогресс', icon: TrendingUp },
    { id: 'reports' as const, label: 'Отчёты', icon: BarChart3 }
  ]

  const header = (
    <View style={{ gap: 10, paddingBottom: 12 }}>
      <ModuleTabs<Tab>
        items={tabs}
        value={tab}
        onChange={(next) => {
          setTab(next)
          setQuery('')
          if (next !== 'journal') {
            setProgramFilter('all')
            setMuscleFilter('all')
          }
          if (next !== 'exercises') setExerciseCategoryFilter('all')
        }}
      />
      {tab !== 'reports' && tab !== 'progress' ? (
        <SearchField value={query} onChangeText={setQuery} />
      ) : null}
      {tab === 'journal' ? (
        <View style={{ gap: 8 }}>
          <AppSelect
            label="Фильтр по программе"
            value={programFilter}
            choices={[
              { value: 'all', label: 'Все программы' },
              { value: 'custom', label: 'Свободные тренировки' },
              ...programs.map((program) => ({ value: program.id, label: program.name }))
            ]}
            onChange={(value) => setProgramFilter(value ?? 'all')}
          />
          <AppSelect
            label="Фильтр по группе мышц"
            value={muscleFilter}
            choices={[
              { value: 'all', label: 'Все группы мышц' },
              ...WORKOUT_MUSCLE_ZONES.map((group) => ({
                value: group,
                label: workoutMuscleLabel(group)
              }))
            ]}
            onChange={(value) => setMuscleFilter((value ?? 'all') as WorkoutMuscleFilter)}
          />
        </View>
      ) : tab === 'exercises' ? (
        <AppSelect
          label="Раздел упражнений"
          value={exerciseCategoryFilter}
          choices={[
            { value: 'all', label: 'Все разделы' },
            ...exerciseCategoryOptions
          ]}
          onChange={(value) =>
            setExerciseCategoryFilter((value ?? 'all') as 'all' | WorkoutExerciseCategory)
          }
        />
      ) : null}
    </View>
  )

  if (overview.loading) return <LoadingState />

  if (tab === 'reports') {
    return (
      <View style={{ flex: 1 }}>
        {header}
        {overview.error ? <ErrorState message={overview.error} retry={overview.refresh} /> : null}
        <WorkoutReportsView exercises={exercises} programs={programs} />
      </View>
    )
  }

  if (tab === 'progress') {
    return (
      <View style={{ flex: 1 }}>
        {header}
        {overview.error ? <ErrorState message={overview.error} retry={overview.refresh} /> : null}
        <WorkoutProgressView
          entries={progressEntries}
          refreshing={overview.loading}
          refresh={overview.refresh}
          onEdit={setProgressEditor}
          onDelete={(entry) =>
            overview.confirmDelete('Удалить запись прогресса?', () =>
              api.deleteProgressEntry({ id: entry.id })
            )
          }
        />
        <MobileCreateAction
          actions={[
            {
              key: 'progress',
              label: 'Новая точка прогресса',
              description: 'Добавить вес, замеры и фотографии',
              icon: 'workouts',
              onPress: () => setProgressEditor('new')
            }
          ]}
        />
        {progressEditor ? (
          <WorkoutProgressSheet
            entry={progressEditor === 'new' ? undefined : progressEditor}
            exercises={exercises}
            save={(input) => {
              if ('id' in input) api.updateProgressEntry(input)
              else api.createProgressEntry(input)
              overview.refresh()
            }}
            importPhoto={
              progressEditor === 'new'
                ? undefined
                : async (view) => {
                    const photo = await api.importProgressPhoto({
                      entryId: progressEditor.id,
                      view
                    })
                    overview.refresh()
                    return photo
                  }
            }
            deletePhoto={
              progressEditor === 'new'
                ? undefined
                : async (photo) => {
                    await api.deleteProgressPhoto({ id: photo.id })
                    overview.refresh()
                  }
            }
            close={() => setProgressEditor(null)}
          />
        ) : null}
      </View>
    )
  }

  const listItems: WorkoutListItem[] =
    tab === 'journal'
      ? filteredSessions.map((value) => ({ kind: 'session', value }))
      : tab === 'exercises'
        ? filteredExercises.map((value) => ({ kind: 'exercise', value }))
        : filteredPrograms.map((value) => ({ kind: 'program', value }))

  return (
    <View style={{ flex: 1 }}>
      {header}
      {overview.error ? <ErrorState message={overview.error} retry={overview.refresh} /> : null}
      <FlatList<WorkoutListItem>
        data={listItems}
        keyExtractor={(row) => `${row.kind}:${row.value.id}`}
        contentContainerStyle={{ paddingBottom: 96 }}
        refreshing={overview.loading}
        onRefresh={overview.refresh}
        ListEmptyComponent={<EmptyState />}
        renderItem={({ item: row }) => {
          if (row.kind === 'session') {
            const session = row.value
            return (
              <Row
                title={`${session.date} · ${session.programName ?? 'Свободная тренировка'}`}
                subtitle={`${session.exercises.length} упражнений · ${session.totalSets} подходов · ${session.totalReps} повторений · ${session.totalVolumeKg} кг`}
                onPress={() => setSessionEditor(session)}
                onLongPress={() =>
                  overview.confirmDelete('Удалить тренировку?', () =>
                    api.deleteSession({ id: session.id })
                  )
                }
              >
                <Button
                  label="Карта мышц"
                  onPress={() =>
                    setMuscleMap({
                      title: `Модель мышц · ${session.programName ?? session.date}`,
                      description: 'Мышечные зоны, задействованные в этой тренировке.',
                      exercises: session.exercises.map((exercise) => ({
                        title: exercise.exerciseTitle,
                        muscleGroups: exercise.muscleGroups
                      }))
                    })
                  }
                />
              </Row>
            )
          }
          if (row.kind === 'exercise') {
            const exercise = row.value
            return (
              <Row
                title={exercise.title}
                subtitle={`${formatMuscles(exercise)} · ${exercise.usesExternalWeight ? 'с весом' : 'собственный вес'}${exercise.status === 'archived' ? ' · архив' : ''}`}
                onPress={() => editExercise(exercise)}
                onLongPress={() =>
                  overview.confirmDelete(
                    'Удалить упражнение?',
                    () => api.deleteExercise({ id: exercise.id }),
                    'Если упражнение уже используется в программе или истории, удаление будет запрещено.'
                  )
                }
              />
            )
          }
          const program = row.value
          return (
            <Row
              title={program.name}
              subtitle={`${program.exercises.length} упражнений${program.description ? ` · ${program.description}` : ''}${program.status === 'archived' ? ' · архив' : ''}`}
              onPress={() => setProgramEditor(program)}
              onLongPress={() =>
                overview.confirmDelete('Удалить программу?', () =>
                  api.deleteProgram({ id: program.id })
                )
              }
            >
              <Button
                label="Карта мышц"
                onPress={() =>
                  setMuscleMap({
                    title: `Карта мышц · ${program.name}`,
                    description: 'Мышечные зоны, задействованные упражнениями программы.',
                    exercises: program.exercises
                      .map((item) => exerciseMap.get(item.exerciseId))
                      .filter(
                        (exercise): exercise is WorkoutExerciseRecord => exercise !== undefined
                      )
                      .map((exercise) => ({
                        title: exercise.title,
                        muscleGroups: exercise.muscleGroups
                      }))
                  })
                }
              />
            </Row>
          )
        }}
      />
      <MobileCreateAction
        actions={[
          tab === 'journal'
            ? {
                key: 'session',
                label: 'Новая тренировка',
                description: 'Записать тренировку и выполненные подходы',
                icon: 'workouts',
                onPress: () => setSessionEditor('new')
              }
            : tab === 'exercises'
              ? {
                  key: 'exercise',
                  label: 'Новое упражнение',
                  description: 'Добавить упражнение в библиотеку',
                  icon: 'workouts',
                  onPress: () => editExercise()
                }
              : {
                  key: 'program',
                  label: 'Новая программа',
                  description: 'Собрать программу из упражнений',
                  icon: 'folder',
                  onPress: () => setProgramEditor('new')
                }
        ]}
      />
      {form && <FormSheet spec={form} close={() => setForm(null)} />}
      {programEditor ? (
        <WorkoutProgramSheet
          program={programEditor === 'new' ? undefined : programEditor}
          exercises={exercises}
          save={(input) => {
            if ('id' in input) api.updateProgram(input)
            else api.createProgram(input)
            overview.refresh()
          }}
          close={() => setProgramEditor(null)}
        />
      ) : null}
      {muscleMap ? (
        <WorkoutMuscleMapSheet
          title={muscleMap.title}
          description={muscleMap.description}
          exercises={muscleMap.exercises}
          close={() => setMuscleMap(null)}
        />
      ) : null}
      {sessionEditor ? (
        <WorkoutSessionSheet
          session={sessionEditor === 'new' ? undefined : sessionEditor}
          exercises={exercises}
          programs={programs}
          save={(input) => {
            if ('id' in input) api.updateSession(input)
            else api.createSession(input)
            overview.refresh()
          }}
          close={() => setSessionEditor(null)}
        />
      ) : null}
    </View>
  )
}
