import { useCallback, useState } from 'react'
import { FlatList, ScrollView, View } from 'react-native'
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
import {
  choiceField,
  messageFor,
  textField,
  type FormField,
  type FormSpec
} from '../../shared/ui/form-model'
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  Row,
  SearchField
} from '../../shared/ui/primitives'
import { WorkoutProgressSheet } from './WorkoutProgressSheet'
import { WorkoutSessionSheet } from './WorkoutSessionSheet'

type Tab = 'journal' | 'exercises' | 'programs' | 'progress' | 'reports'

type WorkoutListItem =
  | { kind: 'session'; value: WorkoutSessionRecord }
  | { kind: 'exercise'; value: WorkoutExerciseRecord }
  | { kind: 'program'; value: WorkoutProgramRecord }
  | { kind: 'progress'; value: WorkoutProgressEntryRecord }

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

function localDateKey(date = new Date()): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

function daysAgoKey(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return localDateKey(date)
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

  let reportResult: {
    report: ReturnType<typeof api.getReport> | null
    error: string
  }
  try {
    reportResult = {
      report: api.getReport({
        dateFrom: daysAgoKey(29),
        dateTo: localDateKey(),
        programId: null,
        exerciseId: null,
        muscleGroup: null
      }),
      error: ''
    }
  } catch (reason) {
    reportResult = { report: null, error: messageFor(reason) }
  }

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: 'journal', label: 'Журнал' },
    { key: 'exercises', label: 'Упражнения' },
    { key: 'programs', label: 'Программы' },
    { key: 'progress', label: 'Прогресс' },
    { key: 'reports', label: 'Отчёт' }
  ]

  const header = (
    <View style={{ gap: 10, paddingBottom: 12 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {tabs.map((item) => (
          <Button
            key={item.key}
            label={item.label}
            selected={tab === item.key}
            onPress={() => setTab(item.key)}
          />
        ))}
      </ScrollView>
      {tab !== 'reports' && tab !== 'progress' ? (
        <SearchField value={query} onChangeText={setQuery} />
      ) : null}
      {tab === 'journal' ? (
        <Button label="+ Тренировка" selected onPress={() => setSessionEditor('new')} />
      ) : null}
      {tab === 'exercises' ? (
        <Button label="+ Упражнение" selected onPress={() => editExercise()} />
      ) : null}
      {tab === 'programs' ? (
        <Button label="+ Программа" selected onPress={() => editProgram()} />
      ) : null}
      {tab === 'progress' ? (
        <Button label="+ Запись прогресса" selected onPress={() => setProgressEditor('new')} />
      ) : null}
    </View>
  )

  if (overview.loading) return <LoadingState />

  if (tab === 'reports') {
    const report = reportResult.report
    return (
      <View style={{ flex: 1 }}>
        {header}
        {overview.error ? <ErrorState message={overview.error} retry={overview.refresh} /> : null}
        {reportResult.error ? (
          <ErrorState message={reportResult.error} retry={overview.refresh} />
        ) : null}
        <ScrollView contentContainerStyle={{ paddingBottom: 32, gap: 10 }}>
          {!report ? (
            <EmptyState text="Отчёт пока недоступен." />
          ) : (
            <>
              <Row title="Последние 30 дней" subtitle={`${report.dateFrom} — ${report.dateTo}`} />
              <Row
                title={`${report.summary.sessions} тренировок · ${report.summary.activeDays} активных дней`}
                subtitle={`${report.summary.sets} подходов · ${report.summary.reps} повторений · ${report.summary.volumeKg} кг объёма`}
              />
              <Row
                title={`Средняя длительность: ${report.summary.averageDurationMinutes} мин`}
                subtitle={`Максимальный вес: ${report.summary.maxWeightKg} кг · средний: ${report.summary.averageWeightKg} кг`}
              />
              {report.muscleGroups.slice(0, 6).map((muscle) => (
                <Row
                  key={muscle.muscleGroup}
                  title={
                    muscleLabels[muscle.muscleGroup as keyof typeof muscleLabels] ??
                    muscle.muscleGroup
                  }
                  subtitle={`${muscle.sets} подходов · ${muscle.reps} повторений · ${muscle.loadPercent}% нагрузки`}
                />
              ))}
              {report.personalRecords.slice(0, 5).map((record) => (
                <Row
                  key={`weighted:${record.exerciseId}:${record.date}`}
                  title={`Рекорд · ${record.title}`}
                  subtitle={`${record.weightKg} кг × ${record.reps} · 1ПМ ≈ ${record.estimatedOneRepMax} кг · ${record.date}`}
                />
              ))}
              {report.bodyweightRecords.slice(0, 5).map((record) => (
                <Row
                  key={`body:${record.exerciseId}:${record.date}`}
                  title={`Рекорд · ${record.title}`}
                  subtitle={`${record.reps} повторений · ${record.date}`}
                />
              ))}
            </>
          )}
        </ScrollView>
      </View>
    )
  }

  const listItems: WorkoutListItem[] =
    tab === 'journal'
      ? filteredSessions.map((value) => ({ kind: 'session', value }))
      : tab === 'exercises'
        ? filteredExercises.map((value) => ({ kind: 'exercise', value }))
        : tab === 'programs'
          ? filteredPrograms.map((value) => ({ kind: 'program', value }))
          : progressEntries.map((value) => ({ kind: 'progress', value }))

  return (
    <View style={{ flex: 1 }}>
      {header}
      {overview.error ? <ErrorState message={overview.error} retry={overview.refresh} /> : null}
      <FlatList<WorkoutListItem>
        data={listItems}
        keyExtractor={(row) => `${row.kind}:${row.value.id}`}
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
          if (row.kind === 'program') {
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
          }
          const entry = row.value
          return (
            <Row
              title={`${entry.date}${entry.bodyWeightKg === null ? '' : ` · ${entry.bodyWeightKg} кг`}`}
              subtitle={[
                entry.wellbeing,
                entry.notes,
                `${entry.metrics.length} показателей`,
                `${entry.photos.length} фото`
              ]
                .filter(Boolean)
                .join(' · ')}
              onPress={() => setProgressEditor(entry)}
              onLongPress={() =>
                overview.confirmDelete('Удалить запись прогресса?', () =>
                  api.deleteProgressEntry({ id: entry.id })
                )
              }
            />
          )
        }}
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
                  const photo = await api.importProgressPhoto({ entryId: progressEditor.id, view })
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
