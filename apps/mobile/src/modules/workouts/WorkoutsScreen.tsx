import { useCallback, useState } from 'react'
import { FlatList, View } from 'react-native'
import type {
  WorkoutExerciseRecord,
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
import { WorkoutProgressSheet } from './WorkoutProgressSheet'
import { WorkoutProgressView } from './WorkoutProgressView'
import { WorkoutSessionSheet } from './WorkoutSessionSheet'
import { WorkoutReportsView } from './WorkoutReportsView'

type Tab = 'journal' | 'exercises' | 'programs' | 'progress' | 'reports'

type WorkoutListItem =
  | { kind: 'session'; value: WorkoutSessionRecord }
  | { kind: 'exercise'; value: WorkoutExerciseRecord }
  | { kind: 'program'; value: WorkoutProgramRecord }

const muscleLabels: Record<(typeof WORKOUT_MUSCLE_ZONES)[number], string> = {
  shoulders: 'Плечи',
  biceps: 'Бицепс',
  triceps: 'Трицепс',
  forearms: 'Предплечья',
  lats: 'Широчайшие',
  traps: 'Трапеции',
  lower_back: 'Поясница',
  chest: 'Грудь',
  abs: 'Пресс',
  glutes: 'Ягодицы',
  quadriceps: 'Квадрицепс',
  hamstrings: 'Бицепс бедра',
  calves: 'Икры'
}

function multiField(
  key: string,
  label: string,
  choices: readonly { value: string; label: string }[]
): FormField {
  return { key, label, kind: 'multiple', choices }
}

function formatMuscles(exercise: WorkoutExerciseRecord): string {
  return exercise.muscleGroups
    .map((group) => muscleLabels[group as keyof typeof muscleLabels] ?? group)
    .join(' · ')
}

export function WorkoutsScreen(): React.JSX.Element {
  const { workouts: api } = useServices()
  const overview = useCollection(useCallback(() => api.listOverview(), [api]))
  const [tab, setTab] = useState<Tab>('journal')
  const [query, setQuery] = useState('')
  const [form, setForm] = useState<FormSpec | null>(null)
  const [sessionEditor, setSessionEditor] = useState<WorkoutSessionRecord | 'new' | null>(null)
  const [progressEditor, setProgressEditor] = useState<WorkoutProgressEntryRecord | 'new' | null>(
    null
  )

  const exercises = overview.data?.exercises ?? []
  const programs = overview.data?.programs ?? []
  const sessions = overview.data?.sessions ?? []
  const progressEntries = overview.data?.progressEntries ?? []
  const normalizedQuery = query.trim().toLocaleLowerCase('ru-RU')

  const filteredExercises = exercises.filter((exercise) =>
    `${exercise.title} ${formatMuscles(exercise)}`
      .toLocaleLowerCase('ru-RU')
      .includes(normalizedQuery)
  )
  const filteredPrograms = programs.filter((program) =>
    `${program.name} ${program.description}`.toLocaleLowerCase('ru-RU').includes(normalizedQuery)
  )
  const filteredSessions = sessions.filter((session) =>
    `${session.programName ?? 'Свободная тренировка'} ${session.comment} ${session.exercises
      .map((exercise) => exercise.exerciseTitle)
      .join(' ')}`
      .toLocaleLowerCase('ru-RU')
      .includes(normalizedQuery)
  )

  const muscleChoices = WORKOUT_MUSCLE_ZONES.map((group) => ({
    value: group,
    label: muscleLabels[group]
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
        usesExternalWeight: exercise?.usesExternalWeight ?? true,
        status: exercise?.status ?? 'active'
      },
      fields: [
        textField('title', 'Название'),
        multiField('muscleGroups', 'Мышечные зоны', muscleChoices),
        { key: 'usesExternalWeight', label: 'Используется внешний вес', kind: 'boolean' },
        choiceField('status', 'Статус', [
          { value: 'active', label: 'Активно' },
          { value: 'archived', label: 'Архив' }
        ])
      ],
      save: (values) => {
        if (exercise) {
          api.updateExercise(
            workoutsValidation.updateWorkoutExerciseInputSchema.parse({
              id: exercise.id,
              title: values.title,
              muscleGroups: values.muscleGroups,
              usesExternalWeight: values.usesExternalWeight,
              status: values.status
            })
          )
        } else {
          api.createExercise(
            workoutsValidation.createWorkoutExerciseInputSchema.parse({
              title: values.title,
              muscleGroups: values.muscleGroups,
              usesExternalWeight: values.usesExternalWeight,
              status: values.status
            })
          )
        }
        overview.refresh()
      }
    })
  }

  const editProgram = (program?: WorkoutProgramRecord): void => {
    setForm({
      title: program ? 'Изменить программу' : 'Новая программа',
      initial: {
        name: program?.name ?? '',
        description: program?.description ?? '',
        status: program?.status ?? 'active',
        exerciseIds: program?.exercises.map((item) => item.exerciseId) ?? []
      },
      fields: [
        textField('name', 'Название'),
        textField('description', 'Описание', 'multiline'),
        choiceField('status', 'Статус', [
          { value: 'active', label: 'Активно' },
          { value: 'archived', label: 'Архив' }
        ]),
        multiField('exerciseIds', 'Упражнения', exerciseChoices)
      ],
      save: (values) => {
        const payload = {
          name: values.name,
          description: values.description,
          status: values.status,
          exercises: (values.exerciseIds as string[]).map((exerciseId) => ({ exerciseId }))
        }
        if (program) {
          api.updateProgram(
            workoutsValidation.updateWorkoutProgramInputSchema.parse({ id: program.id, ...payload })
          )
        } else {
          api.createProgram(workoutsValidation.createWorkoutProgramInputSchema.parse(payload))
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
      <ModuleTabs
        items={tabs}
        value={tab}
        onChange={(next) => {
          setTab(next)
          setQuery('')
        }}
      />
      {tab !== 'reports' && tab !== 'progress' ? (
        <SearchField value={query} onChangeText={setQuery} />
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
              />
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
              onPress={() => editProgram(program)}
              onLongPress={() =>
                overview.confirmDelete('Удалить программу?', () =>
                  api.deleteProgram({ id: program.id })
                )
              }
            />
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
                  onPress: () => editProgram()
                }
        ]}
      />
      {form && <FormSheet spec={form} close={() => setForm(null)} />}
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
