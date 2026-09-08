import { useCallback, useMemo, useState } from 'react'
import { FlatList, Text, View } from 'react-native'
import {
  WORKOUT_MUSCLE_GROUPS,
  type WorkoutExerciseRecord,
  type WorkoutMuscleGroup,
  type WorkoutProgramRecord,
  type WorkoutReport
} from '@mymind/contracts/workouts'
import { workoutReportInputSchema } from '@mymind/core/validation/workouts'
import { localDateKey } from '@mymind/core/habits'
import { useServices } from '../../app/context'
import { useCollection } from '../../shared/hooks/useCollection'
import { FormSheet } from '../../shared/ui/FormSheet'
import { choiceField, textField, type FormSpec } from '../../shared/ui/form-model'
import { Button, EmptyState, ErrorState, LoadingState, Row } from '../../shared/ui/primitives'
import { useTheme } from '../../shared/ui/theme'
import {
  mobileReportPeriodLabels,
  reportDateRange,
  type MobileReportPeriod
} from '../../shared/report-period'
import { WorkoutMuscleMap } from './WorkoutMuscleMap'

const PERIODS: MobileReportPeriod[] = ['7', '30', '90', '365', 'custom']

const muscleLabels: Record<WorkoutMuscleGroup, string> = {
  arms: 'Руки',
  shoulders: 'Плечи',
  biceps: 'Бицепс',
  triceps: 'Трицепс',
  forearms: 'Предплечья',
  back: 'Спина',
  lats: 'Широчайшие',
  traps: 'Трапеции',
  lower_back: 'Поясница',
  chest: 'Грудь',
  abs: 'Пресс',
  legs: 'Ноги',
  glutes: 'Ягодицы',
  quadriceps: 'Квадрицепс',
  hamstrings: 'Бицепс бедра',
  calves: 'Икры'
}

export function WorkoutReportsView({
  exercises,
  programs
}: {
  exercises: WorkoutExerciseRecord[]
  programs: WorkoutProgramRecord[]
}): React.JSX.Element {
  const { workouts: api } = useServices()
  const today = localDateKey()
  const defaults = useMemo(() => reportDateRange('30', '', '', today), [today])
  const [period, setPeriod] = useState<MobileReportPeriod>('30')
  const [customFrom, setCustomFrom] = useState(defaults.dateFrom)
  const [customTo, setCustomTo] = useState(defaults.dateTo)
  const [programId, setProgramId] = useState('all')
  const [exerciseId, setExerciseId] = useState('all')
  const [muscleGroup, setMuscleGroup] = useState<'all' | WorkoutMuscleGroup>('all')
  const [form, setForm] = useState<FormSpec | null>(null)

  const range = useMemo(
    () => reportDateRange(period, customFrom, customTo, today),
    [customFrom, customTo, period, today]
  )

  const state = useCollection(
    useCallback(
      () =>
        api.getReport(
          workoutReportInputSchema.parse({
            dateFrom: range.dateFrom,
            dateTo: range.dateTo,
            programId: programId === 'all' ? null : programId,
            exerciseId: exerciseId === 'all' ? null : exerciseId,
            muscleGroup: muscleGroup === 'all' ? null : muscleGroup
          })
        ),
      [api, exerciseId, muscleGroup, programId, range.dateFrom, range.dateTo]
    )
  )

  const chooseCustomPeriod = (): void => {
    setForm({
      title: 'Свой период отчёта',
      initial: { dateFrom: customFrom, dateTo: customTo },
      fields: [
        textField('dateFrom', 'С даты', 'text', 'ГГГГ-ММ-ДД'),
        textField('dateTo', 'По дату', 'text', 'ГГГГ-ММ-ДД')
      ],
      save: (values) => {
        const next = reportDateRange(
          'custom',
          String(values.dateFrom),
          String(values.dateTo),
          today
        )
        workoutReportInputSchema.parse({
          ...next,
          programId: programId === 'all' ? null : programId,
          exerciseId: exerciseId === 'all' ? null : exerciseId,
          muscleGroup: muscleGroup === 'all' ? null : muscleGroup
        })
        setCustomFrom(next.dateFrom)
        setCustomTo(next.dateTo)
        setPeriod('custom')
      }
    })
  }

  const editFilters = (): void => {
    setForm({
      title: 'Фильтры отчёта',
      initial: { programId, exerciseId, muscleGroup },
      fields: [
        choiceField('programId', 'Программа', [
          { value: 'all', label: 'Все программы' },
          { value: 'custom', label: 'Свободные тренировки' },
          ...programs.map((program) => ({ value: program.id, label: program.name }))
        ]),
        choiceField('exerciseId', 'Упражнение', [
          { value: 'all', label: 'Все упражнения' },
          ...exercises.map((exercise) => ({ value: exercise.id, label: exercise.title }))
        ]),
        choiceField('muscleGroup', 'Группа мышц', [
          { value: 'all', label: 'Все группы мышц' },
          ...WORKOUT_MUSCLE_GROUPS.map((value) => ({ value, label: muscleLabels[value] }))
        ])
      ],
      save: (values) => {
        const nextProgram = String(values.programId)
        const nextExercise = String(values.exerciseId)
        const nextMuscle = values.muscleGroup as 'all' | WorkoutMuscleGroup
        workoutReportInputSchema.parse({
          dateFrom: range.dateFrom,
          dateTo: range.dateTo,
          programId: nextProgram === 'all' ? null : nextProgram,
          exerciseId: nextExercise === 'all' ? null : nextExercise,
          muscleGroup: nextMuscle === 'all' ? null : nextMuscle
        })
        setProgramId(nextProgram)
        setExerciseId(nextExercise)
        setMuscleGroup(nextMuscle)
      }
    })
  }

  if (state.loading && !state.data) return <LoadingState />
  if (state.error && !state.data) return <ErrorState message={state.error} retry={state.refresh} />

  const report = state.data
  if (!report) return <EmptyState text="Отчёт пока недоступен." />

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={report.timeline}
        keyExtractor={(item) => item.date}
        contentContainerStyle={{ paddingBottom: 32 }}
        ListHeaderComponent={
          <WorkoutReportHeader
            report={report}
            period={period}
            customFrom={customFrom}
            customTo={customTo}
            programLabel={
              programId === 'all'
                ? 'Все программы'
                : programId === 'custom'
                  ? 'Свободные тренировки'
                  : (programs.find((program) => program.id === programId)?.name ?? 'Программа')
            }
            exerciseLabel={
              exerciseId === 'all'
                ? 'Все упражнения'
                : (exercises.find((exercise) => exercise.id === exerciseId)?.title ?? 'Упражнение')
            }
            muscleLabel={muscleGroup === 'all' ? 'Все мышцы' : muscleLabels[muscleGroup]}
            onPeriod={(next) => {
              if (next === 'custom') chooseCustomPeriod()
              else setPeriod(next)
            }}
            onFilters={editFilters}
          />
        }
        ListEmptyComponent={<EmptyState text="За выбранный период тренировок нет." />}
        renderItem={({ item }) => (
          <Row
            title={`${item.date} · ${item.sessions} тренировок`}
            subtitle={`${item.sets} подходов · ${item.reps} повторений · ${item.volumeKg} кг · ${item.durationMinutes} мин`}
          />
        )}
        ListFooterComponent={
          state.error ? <ErrorState message={state.error} retry={state.refresh} /> : null
        }
      />
      {form ? <FormSheet spec={form} close={() => setForm(null)} /> : null}
    </View>
  )
}

function WorkoutReportHeader({
  report,
  period,
  customFrom,
  customTo,
  programLabel,
  exerciseLabel,
  muscleLabel,
  onPeriod,
  onFilters
}: {
  report: WorkoutReport
  period: MobileReportPeriod
  customFrom: string
  customTo: string
  programLabel: string
  exerciseLabel: string
  muscleLabel: string
  onPeriod(value: MobileReportPeriod): void
  onFilters(): void
}): React.JSX.Element {
  const theme = useTheme()

  return (
    <View style={{ gap: 14, paddingBottom: 16 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {PERIODS.map((value) => (
          <Button
            key={value}
            label={mobileReportPeriodLabels[value]}
            selected={period === value}
            onPress={() => onPeriod(value)}
          />
        ))}
      </View>

      {period === 'custom' ? (
        <Text style={{ color: theme.muted, fontSize: 12 }}>
          {customFrom} → {customTo}
        </Text>
      ) : null}

      <View style={{ gap: 7 }}>
        <Button label="Фильтры" onPress={onFilters} />
        <Text style={{ color: theme.muted, fontSize: 11 }}>
          {programLabel} · {exerciseLabel} · {muscleLabel}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <Metric
          label="Тренировки"
          value={String(report.summary.sessions)}
          hint={`${report.summary.exercises} упражнений`}
        />
        <Metric
          label="Активные дни"
          value={String(report.summary.activeDays)}
          hint={`${report.summary.durationMinutes} мин всего`}
        />
        <Metric
          label="Подходы"
          value={String(report.summary.sets)}
          hint={`${report.summary.reps} повторений`}
        />
        <Metric
          label="Тоннаж"
          value={`${report.summary.volumeKg} кг`}
          hint={`макс. ${report.summary.maxWeightKg} кг`}
        />
      </View>

      <WorkoutMuscleMap groups={report.muscleGroups} />

      <Section title="Распределение нагрузки">
        {report.muscleGroups
          .filter((item) => item.sets > 0)
          .map((item) => (
            <ProgressLine
              key={item.muscleGroup}
              label={muscleLabels[item.muscleGroup]}
              percent={item.loadPercent}
              caption={`${item.sets} подх. · ${item.reps} повт.`}
            />
          ))}
      </Section>

      {report.exercises.length > 0 ? (
        <Section title="Упражнения">
          {report.exercises.slice(0, 10).map((exercise) => (
            <Text
              key={`${exercise.exerciseId ?? exercise.title}`}
              style={{ color: theme.muted, fontSize: 12 }}
            >
              {exercise.title} · {exercise.sessions} трен. · {exercise.sets} подх. · {exercise.reps}{' '}
              повт.
              {exercise.usesExternalWeight ? ` · максимум ${exercise.maxWeightKg} кг` : ''}
            </Text>
          ))}
        </Section>
      ) : null}

      {report.personalRecords.length > 0 || report.bodyweightRecords.length > 0 ? (
        <Section title="Рекорды">
          {report.personalRecords.slice(0, 5).map((record) => (
            <Text
              key={`weighted:${record.exerciseId}:${record.date}`}
              style={{ color: theme.muted, fontSize: 12 }}
            >
              {record.title} · {record.weightKg} кг × {record.reps} · {record.date}
            </Text>
          ))}
          {report.bodyweightRecords.slice(0, 5).map((record) => (
            <Text
              key={`body:${record.exerciseId}:${record.date}`}
              style={{ color: theme.muted, fontSize: 12 }}
            >
              {record.title} · {record.reps} повторений · {record.date}
            </Text>
          ))}
        </Section>
      ) : null}

      <Text style={{ color: theme.muted, fontSize: 12, fontWeight: '700' }}>Динамика по дням</Text>
    </View>
  )
}

function Metric({
  label,
  value,
  hint
}: {
  label: string
  value: string
  hint: string
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <View
      style={{
        minWidth: 145,
        flexGrow: 1,
        flexBasis: '46%',
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 15,
        backgroundColor: theme.surface,
        padding: 13,
        gap: 4
      }}
    >
      <Text style={{ color: theme.muted, fontSize: 11 }}>{label}</Text>
      <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>{value}</Text>
      <Text style={{ color: theme.muted, fontSize: 10 }}>{hint}</Text>
    </View>
  )
}

function Section({
  title,
  children
}: {
  title: string
  children: React.ReactNode
}): React.JSX.Element {
  const theme = useTheme()
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 16,
        backgroundColor: theme.surface,
        padding: 14,
        gap: 10
      }}
    >
      <Text style={{ color: theme.text, fontSize: 15, fontWeight: '800' }}>{title}</Text>
      {children}
    </View>
  )
}

function ProgressLine({
  label,
  percent,
  caption
}: {
  label: string
  percent: number
  caption: string
}): React.JSX.Element {
  const theme = useTheme()
  const width = Math.max(0, Math.min(100, percent))
  return (
    <View style={{ gap: 5 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
        <Text style={{ color: theme.text, fontSize: 12, fontWeight: '700' }}>{label}</Text>
        <Text style={{ color: theme.muted, fontSize: 11 }}>{caption}</Text>
      </View>
      <View
        style={{ height: 7, borderRadius: 99, overflow: 'hidden', backgroundColor: theme.raised }}
      >
        <View style={{ width: `${width}%`, height: '100%', backgroundColor: theme.accent }} />
      </View>
    </View>
  )
}
