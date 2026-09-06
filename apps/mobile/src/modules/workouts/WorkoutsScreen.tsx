import { useCallback, useMemo, useState } from 'react'
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

type Tab = 'journal' | 'exercises' | 'programs' | 'progress' | 'reports'

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

  const exercises = overview.data?.exercises ?? []
  const programs = overview.data?.programs ?? []
  const sessions = overview.data?.sessions ?? []
  const progressEntries = overview.data?.progressEntries ?? []
  const normalizedQuery = query.trim().toLocaleLowerCase('ru-RU')

  const filteredExercises = useMemo(
    () =>
      exercises.filter((exercise) =>
        `${exercise.title} ${formatMuscles(exercise)}`
          .toLocaleLowerCase('ru-RU')
          .includes(normalizedQuery)
      ),
    [exercises, normalizedQuery]
  )
  const filteredPrograms = useMemo(
    () =>
      programs.filter((program) =>
        `${program.name} ${program.description}`
          .toLocaleLowerCase('ru-RU')
          .includes(normalizedQuery)
      ),
    [programs, normalizedQuery]
  )
  const filteredSessions = useMemo(
    () =>
      sessions.filter((session) =>
        `${session.programName ?? 'Свободная тренировка'} ${session.comment} ${session.exercises
          .map((exercise) => exercise.exerciseTitle)
          .join(' ')}`
          .toLocaleLowerCase('ru-RU')
          .includes(normalizedQuery)
      ),
    [normalizedQuery, sessions]
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

  const editSession = (session?: WorkoutSessionRecord): void => {
    const firstExercise = session?.exercises[0]
    const firstSet = firstExercise?.sets[0]
    setForm({
      title: session ? 'Изменить тренировку' : 'Новая тренировка',
      initial: {
        programId: session?.programId ?? null,
        date: session?.date ?? localDateKey(),
        durationMinutes: session?.durationMinutes ?? '',
        exerciseId: firstExercise?.exerciseId ?? exerciseChoices[0]?.value ?? null,
        reps: firstSet?.reps ?? 10,
        weightKg: firstSet?.weightKg ?? 0,
        comment: session?.comment ?? ''
      },
      fields: [
        choiceField('programId', 'Программа', [
          { value: null, label: 'Свободная тренировка' },
          ...programs
            .filter((program) => program.status === 'active')
            .map((program) => ({ value: program.id, label: program.name }))
        ]),
        textField('date', 'Дата'),
        { key: 'durationMinutes', label: 'Длительность, мин', kind: 'nullableNumber' },
        choiceField('exerciseId', 'Упражнение', exerciseChoices),
        { key: 'reps', label: 'Повторения', kind: 'number' },
        { key: 'weightKg', label: 'Вес, кг', kind: 'number' },
        textField('comment', 'Комментарий', 'multiline')
      ],
      save: (values) => {
        const exerciseId = values.exerciseId
        if (typeof exerciseId !== 'string') throw new Error('Выберите упражнение')
        const payload = {
          programId: values.programId,
          date: values.date,
          durationMinutes: values.durationMinutes,
          comment: values.comment,
          exercises: [
            {
              exerciseId,
              comment: '',
              sets: [{ reps: values.reps, weightKg: values.weightKg }]
            }
          ]
        }
        if (session) {
          api.updateSession(
            workoutsValidation.updateWorkoutSessionInputSchema.parse({ id: session.id, ...payload })
          )
        } else {
          api.createSession(workoutsValidation.createWorkoutSessionInputSchema.parse(payload))
        }
        overview.refresh()
      }
    })
  }

  const editProgress = (entry?: WorkoutProgressEntryRecord): void => {
    setForm({
      title: entry ? 'Изменить прогресс' : 'Новая запись прогресса',
      initial: {
        date: entry?.date ?? localDateKey(),
        bodyWeightKg: entry?.bodyWeightKg ?? '',
        wellbeing: entry?.wellbeing ?? '',
        notes: entry?.notes ?? ''
      },
      fields: [
        textField('date', 'Дата'),
        { key: 'bodyWeightKg', label: 'Вес тела, кг', kind: 'nullableNumber' },
        textField('wellbeing', 'Самочувствие', 'multiline'),
        textField('notes', 'Заметки', 'multiline')
      ],
      save: (values) => {
        const metrics =
          entry?.metrics
            .filter((metric) => metric.exerciseId !== null)
            .map((metric) => ({
              exerciseId: metric.exerciseId as string,
              weightKg: metric.weightKg,
              reps: metric.reps,
              comment: metric.comment
            })) ?? []
        const payload = {
          date: values.date,
          bodyWeightKg: values.bodyWeightKg,
          wellbeing: values.wellbeing,
          notes: values.notes,
          metrics
        }
        if (entry) {
          api.updateProgressEntry(
            workoutsValidation.updateWorkoutProgressEntryInputSchema.parse({ id: entry.id, ...payload })
          )
        } else {
          api.createProgressEntry(workoutsValidation.createWorkoutProgressEntryInputSchema.parse(payload))
        }
        overview.refresh()
      }
    })
  }

  const reportResult = useMemo(() => {
    try {
      return {
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
      return { report: null, error: messageFor(reason) }
    }
  }, [api, overview.data])

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
        <Button label="+ Тренировка" selected onPress={() => editSession()} />
      ) : null}
      {tab === 'exercises' ? (
        <Button label="+ Упражнение" selected onPress={() => editExercise()} />
      ) : null}
      {tab === 'programs' ? (
        <Button label="+ Программа" selected onPress={() => editProgram()} />
      ) : null}
      {tab === 'progress' ? (
        <Button label="+ Запись прогресса" selected onPress={() => editProgress()} />
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

  const data =
    tab === 'journal'
      ? filteredSessions
      : tab === 'exercises'
        ? filteredExercises
        : tab === 'programs'
          ? filteredPrograms
          : progressEntries

  return (
    <View style={{ flex: 1 }}>
      {header}
      {overview.error ? <ErrorState message={overview.error} retry={overview.refresh} /> : null}
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        refreshing={overview.loading}
        onRefresh={overview.refresh}
        ListEmptyComponent={<EmptyState />}
        renderItem={({ item }) => {
          if (tab === 'journal') {
            const session = item as WorkoutSessionRecord
            return (
              <Row
                title={`${session.date} · ${session.programName ?? 'Свободная тренировка'}`}
                subtitle={`${session.exercises.length} упражнений · ${session.totalSets} подходов · ${session.totalReps} повторений · ${session.totalVolumeKg} кг`}
                onPress={() => editSession(session)}
                onLongPress={() =>
                  overview.confirmDelete('Удалить тренировку?', () =>
                    api.deleteSession({ id: session.id })
                  )
                }
              />
            )
          }
          if (tab === 'exercises') {
            const exercise = item as WorkoutExerciseRecord
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
          if (tab === 'programs') {
            const program = item as WorkoutProgramRecord
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
          const entry = item as WorkoutProgressEntryRecord
          return (
            <Row
              title={`${entry.date}${entry.bodyWeightKg === null ? '' : ` · ${entry.bodyWeightKg} кг`}`}
              subtitle={[entry.wellbeing, entry.notes, `${entry.metrics.length} показателей`]
                .filter(Boolean)
                .join(' · ')}
              onPress={() => editProgress(entry)}
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
    </View>
  )
}
