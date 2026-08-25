from pathlib import Path

ROOT = Path('.')


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding='utf-8')


def write(path: str, content: str) -> None:
    (ROOT / path).write_text(content, encoding='utf-8')


def replace_once(content: str, old: str, new: str, label: str) -> str:
    count = content.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected exactly one match, got {count}')
    return content.replace(old, new, 1)


# Contracts: make weighted/bodyweight report semantics explicit.
path = 'src/shared/contracts/workouts.ts'
s = read(path)
s = replace_once(
    s,
    "  sets: number\n  reps: number\n  volumeKg: number\n",
    "  sets: number\n  reps: number\n  externalWeightSets: number\n  externalWeightReps: number\n  bodyweightSets: number\n  bodyweightReps: number\n  volumeKg: number\n",
    'report summary load-mode counters',
)
s = replace_once(
    s,
    "  muscleGroups: WorkoutMuscleGroup[]\n  sessions: number\n  sets: number\n  reps: number\n  volumeKg: number\n  averageWeightKg: number\n",
    "  muscleGroups: WorkoutMuscleGroup[]\n  usesExternalWeight: boolean\n  sessions: number\n  sets: number\n  reps: number\n  volumeKg: number\n  averageWeightKg: number\n",
    'report exercise weight mode',
)
s = replace_once(
    s,
    "  firstBestWeightKg: number\n  lastBestWeightKg: number\n  weightChangeKg: number\n}\n\nexport interface WorkoutReportProgram",
    "  firstBestWeightKg: number\n  lastBestWeightKg: number\n  weightChangeKg: number\n  bestSetReps: number\n  firstBestReps: number\n  lastBestReps: number\n  repsChange: number\n}\n\nexport interface WorkoutReportProgram",
    'report exercise repetition progress',
)
s = replace_once(
    s,
    "  sets: number\n  reps: number\n  volumeKg: number\n  durationMinutes: number\n}\n\nexport interface WorkoutReportDay",
    "  sets: number\n  reps: number\n  externalWeightSets: number\n  bodyweightSets: number\n  volumeKg: number\n  durationMinutes: number\n}\n\nexport interface WorkoutReportDay",
    'report program mode counters',
)
s = replace_once(
    s,
    "  sets: number\n  reps: number\n  volumeKg: number\n  durationMinutes: number\n}\n\nexport interface WorkoutPersonalRecord",
    "  sets: number\n  reps: number\n  externalWeightSets: number\n  bodyweightSets: number\n  volumeKg: number\n  durationMinutes: number\n}\n\nexport interface WorkoutPersonalRecord",
    'report day mode counters',
)
insert_after = "export interface WorkoutPersonalRecord {\n  exerciseId: string | null\n  title: string\n  muscleGroup: WorkoutMuscleGroup\n  muscleGroups: WorkoutMuscleGroup[]\n  date: string\n  weightKg: number\n  reps: number\n  estimatedOneRepMax: number\n}\n"
bodyweight_contract = insert_after + "\nexport interface WorkoutBodyweightRecord {\n  exerciseId: string | null\n  title: string\n  muscleGroup: WorkoutMuscleGroup\n  muscleGroups: WorkoutMuscleGroup[]\n  date: string\n  reps: number\n}\n"
s = replace_once(s, insert_after, bodyweight_contract, 'bodyweight record contract')
s = replace_once(
    s,
    "  timeline: WorkoutReportDay[]\n  personalRecords: WorkoutPersonalRecord[]\n}",
    "  timeline: WorkoutReportDay[]\n  personalRecords: WorkoutPersonalRecord[]\n  bodyweightRecords: WorkoutBodyweightRecord[]\n}",
    'report bodyweight records field',
)
write(path, s)

# Validation: reports can explicitly select free workouts.
path = 'src/shared/validation/workouts.ts'
s = read(path)
s = replace_once(
    s,
    "    programId: idSchema.nullable(),\n    exerciseId: idSchema.nullable(),\n",
    "    programId: z.union([idSchema, z.literal('custom')]).nullable(),\n    exerciseId: idSchema.nullable(),\n",
    'report custom workout filter validation',
)
write(path, s)

# Repository: calculate bodyweight progress without corrupting weighted metrics.
path = 'src/main/repositories/workouts.repository.ts'
s = read(path)
s = replace_once(
    s,
    "  WorkoutEntityStatus,\n",
    "  WorkoutBodyweightRecord,\n  WorkoutEntityStatus,\n",
    'bodyweight record import',
)
s = replace_once(
    s,
    "function estimatedOneRepMax(weightKg: number, reps: number): number {\n  if (weightKg <= 0 || reps <= 0) return 0\n  return round2(weightKg * (1 + reps / 30))\n}\n",
    "function estimatedOneRepMax(weightKg: number, reps: number): number {\n  if (weightKg <= 0 || reps <= 0) return 0\n  return round2(weightKg * (1 + reps / 30))\n}\n\nfunction reportExerciseIdentity(exercise: WorkoutSessionExerciseRecord): string {\n  return exercise.exerciseId ?? `${exercise.exerciseTitle}:${exercise.muscleGroups.join(',')}`\n}\n",
    'report exercise identity helper',
)
s = replace_once(
    s,
    "  muscleGroups: WorkoutMuscleGroup[]\n  sessionIds: Set<string>\n",
    "  muscleGroups: WorkoutMuscleGroup[]\n  usesExternalWeight: boolean\n  sessionIds: Set<string>\n",
    'accumulator weight mode',
)
s = replace_once(
    s,
    "    .filter((session) => input.programId === null || session.programId === input.programId)\n",
    "    .filter((session) =>\n      input.programId === null\n        ? true\n        : input.programId === 'custom'\n          ? session.programId === null\n          : session.programId === input.programId\n    )\n",
    'custom workout report filter',
)
s = replace_once(
    s,
    "  let totalWeight = 0\n  let totalSetCountForWeight = 0\n  let maxWeightKg = 0\n",
    "  let totalWeight = 0\n  let totalSetCountForWeight = 0\n  let maxWeightKg = 0\n  let externalWeightSets = 0\n  let externalWeightReps = 0\n  let bodyweightSets = 0\n  let bodyweightReps = 0\n",
    'report mode totals',
)
s = replace_once(
    s,
    "      reps: 0,\n      volumeKg: 0,\n      durationMinutes: 0\n",
    "      reps: 0,\n      externalWeightSets: 0,\n      bodyweightSets: 0,\n      volumeKg: 0,\n      durationMinutes: 0\n",
    'day mode totals',
)
s = replace_once(
    s,
    "      reps: 0,\n      volumeKg: 0,\n      durationMinutes: 0\n    }\n    program.sessions += 1\n",
    "      reps: 0,\n      externalWeightSets: 0,\n      bodyweightSets: 0,\n      volumeKg: 0,\n      durationMinutes: 0\n    }\n    program.sessions += 1\n",
    'program mode totals',
)
old_exercise_start = """    for (const exercise of session.exercises) {
      const exerciseKey =
        exercise.exerciseId ?? `${exercise.exerciseTitle}:${exercise.muscleGroups.join(',')}`
      const accumulator = exerciseMap.get(exerciseKey) ?? {
        exerciseId: exercise.exerciseId,
        title: exercise.exerciseTitle,
        muscleGroup: exercise.muscleGroup,
        muscleGroups: exercise.muscleGroups,
        sessionIds: new Set<string>(),
"""
new_exercise_start = """    for (const exercise of session.exercises) {
      const exerciseIdentity = reportExerciseIdentity(exercise)
      const exerciseKey = `${exerciseIdentity}:${exercise.usesExternalWeight ? 'external' : 'bodyweight'}`
      const accumulator = exerciseMap.get(exerciseKey) ?? {
        exerciseId: exercise.exerciseId,
        title: exercise.exerciseTitle,
        muscleGroup: exercise.muscleGroup,
        muscleGroups: exercise.muscleGroups,
        usesExternalWeight: exercise.usesExternalWeight,
        sessionIds: new Set<string>(),
"""
s = replace_once(s, old_exercise_start, new_exercise_start, 'mode-aware exercise accumulator')
s = replace_once(
    s,
    "      exercise.muscleGroups.forEach((group) => muscleExerciseIds.get(group)?.add(exerciseKey))\n",
    "      exercise.muscleGroups.forEach((group) => muscleExerciseIds.get(group)?.add(exerciseIdentity))\n",
    'unique muscle exercise identity',
)
old_set_loop = """      for (const set of exercise.sets) {
        const volume = set.reps * set.weightKg
        accumulator.sets += 1
        accumulator.reps += set.reps
        accumulator.volumeKg += volume
        accumulator.weightTotal += set.weightKg
        accumulator.maxWeightKg = Math.max(accumulator.maxWeightKg, set.weightKg)
        accumulator.estimatedOneRepMax = Math.max(
          accumulator.estimatedOneRepMax,
          estimatedOneRepMax(set.weightKg, set.reps)
        )
        accumulator.observations.push({
          date: session.date,
          weightKg: set.weightKg,
          reps: set.reps
        })
        for (const group of exercise.muscleGroups) {
          const muscle = muscleMap.get(group)
          if (!muscle) continue
          muscle.sets += 1
          muscle.reps += set.reps
          muscle.volumeKg += volume
        }
        program.sets += 1
        program.reps += set.reps
        program.volumeKg += volume
        day.sets += 1
        day.reps += set.reps
        day.volumeKg += volume
        totalWeight += set.weightKg
        totalSetCountForWeight += 1
        maxWeightKg = Math.max(maxWeightKg, set.weightKg)
      }
"""
new_set_loop = """      for (const set of exercise.sets) {
        const volume = exercise.usesExternalWeight ? set.reps * set.weightKg : 0
        accumulator.sets += 1
        accumulator.reps += set.reps
        accumulator.volumeKg += volume
        if (exercise.usesExternalWeight) {
          accumulator.weightTotal += set.weightKg
          accumulator.maxWeightKg = Math.max(accumulator.maxWeightKg, set.weightKg)
          accumulator.estimatedOneRepMax = Math.max(
            accumulator.estimatedOneRepMax,
            estimatedOneRepMax(set.weightKg, set.reps)
          )
          totalWeight += set.weightKg
          totalSetCountForWeight += 1
          maxWeightKg = Math.max(maxWeightKg, set.weightKg)
          externalWeightSets += 1
          externalWeightReps += set.reps
          program.externalWeightSets += 1
          day.externalWeightSets += 1
        } else {
          bodyweightSets += 1
          bodyweightReps += set.reps
          program.bodyweightSets += 1
          day.bodyweightSets += 1
        }
        accumulator.observations.push({
          date: session.date,
          weightKg: set.weightKg,
          reps: set.reps
        })
        for (const group of exercise.muscleGroups) {
          const muscle = muscleMap.get(group)
          if (!muscle) continue
          muscle.sets += 1
          muscle.reps += set.reps
          muscle.volumeKg += volume
        }
        program.sets += 1
        program.reps += set.reps
        program.volumeKg += volume
        day.sets += 1
        day.reps += set.reps
        day.volumeKg += volume
      }
"""
s = replace_once(s, old_set_loop, new_set_loop, 'mode-aware set aggregation')
old_report_exercise_return = """      return {
        exerciseId: exercise.exerciseId,
        title: exercise.title,
        muscleGroup: exercise.muscleGroup,
        muscleGroups: exercise.muscleGroups,
        sessions: exercise.sessionIds.size,
        sets: exercise.sets,
        reps: exercise.reps,
        volumeKg: round2(exercise.volumeKg),
        averageWeightKg: exercise.sets === 0 ? 0 : round2(exercise.weightTotal / exercise.sets),
        maxWeightKg: round2(exercise.maxWeightKg),
        estimatedOneRepMax: round2(exercise.estimatedOneRepMax),
        firstBestWeightKg: round2(firstBest),
        lastBestWeightKg: round2(lastBest),
        weightChangeKg: round2(lastBest - firstBest)
      }
"""
new_report_exercise_return = """      const firstBestReps = Math.max(
        0,
        ...sorted.filter((entry) => entry.date === firstDate).map((entry) => entry.reps)
      )
      const lastBestReps = Math.max(
        0,
        ...sorted.filter((entry) => entry.date === lastDate).map((entry) => entry.reps)
      )
      return {
        exerciseId: exercise.exerciseId,
        title: exercise.title,
        muscleGroup: exercise.muscleGroup,
        muscleGroups: exercise.muscleGroups,
        usesExternalWeight: exercise.usesExternalWeight,
        sessions: exercise.sessionIds.size,
        sets: exercise.sets,
        reps: exercise.reps,
        volumeKg: round2(exercise.volumeKg),
        averageWeightKg:
          !exercise.usesExternalWeight || exercise.sets === 0
            ? 0
            : round2(exercise.weightTotal / exercise.sets),
        maxWeightKg: round2(exercise.maxWeightKg),
        estimatedOneRepMax: round2(exercise.estimatedOneRepMax),
        firstBestWeightKg: round2(firstBest),
        lastBestWeightKg: round2(lastBest),
        weightChangeKg: round2(lastBest - firstBest),
        bestSetReps: Math.max(0, ...sorted.map((entry) => entry.reps)),
        firstBestReps,
        lastBestReps,
        repsChange: lastBestReps - firstBestReps
      }
"""
s = replace_once(s, old_report_exercise_return, new_report_exercise_return, 'report exercise mode metrics')
start = s.index('  const personalRecords: WorkoutPersonalRecord[] =')
end = s.index('\n  const sets = reportExercises.reduce', start)
records_block = """  const personalRecords: WorkoutPersonalRecord[] = [...exerciseMap.values()]
    .filter((exercise) => exercise.usesExternalWeight)
    .map((exercise) => {
      const best = exercise.observations.reduce<{
        date: string
        weightKg: number
        reps: number
        score: number
      } | null>((current, observation) => {
        const score = estimatedOneRepMax(observation.weightKg, observation.reps)
        if (!current || score > current.score) return { ...observation, score }
        return current
      }, null)
      if (!best || best.score <= 0) return null
      return {
        exerciseId: exercise.exerciseId,
        title: exercise.title,
        muscleGroup: exercise.muscleGroup,
        muscleGroups: exercise.muscleGroups,
        date: best.date,
        weightKg: best.weightKg,
        reps: best.reps,
        estimatedOneRepMax: best.score
      }
    })
    .filter((record): record is WorkoutPersonalRecord => record !== null)
    .sort((left, right) => right.estimatedOneRepMax - left.estimatedOneRepMax)

  const bodyweightRecords: WorkoutBodyweightRecord[] = [...exerciseMap.values()]
    .filter((exercise) => !exercise.usesExternalWeight)
    .map((exercise) => {
      const best = exercise.observations.reduce<{ date: string; reps: number } | null>(
        (current, observation) =>
          !current || observation.reps > current.reps
            ? { date: observation.date, reps: observation.reps }
            : current,
        null
      )
      if (!best) return null
      return {
        exerciseId: exercise.exerciseId,
        title: exercise.title,
        muscleGroup: exercise.muscleGroup,
        muscleGroups: exercise.muscleGroups,
        date: best.date,
        reps: best.reps
      }
    })
    .filter((record): record is WorkoutBodyweightRecord => record !== null)
    .sort((left, right) => right.reps - left.reps)
"""
s = s[:start] + records_block + s[end:]
s = replace_once(
    s,
    "  const sessionCount = filteredSessions.length\n\n  return {\n",
    "  const sessionCount = filteredSessions.length\n  const exerciseCount = new Set(\n    filteredSessions.flatMap((session) => session.exercises.map(reportExerciseIdentity))\n  ).size\n\n  return {\n",
    'unique report exercise count',
)
s = replace_once(
    s,
    "      exercises: reportExercises.length,\n      sets,\n      reps,\n      volumeKg,\n",
    "      exercises: exerciseCount,\n      sets,\n      reps,\n      externalWeightSets,\n      externalWeightReps,\n      bodyweightSets,\n      bodyweightReps,\n      volumeKg,\n",
    'summary mode metrics',
)
s = replace_once(
    s,
    "    personalRecords\n  }\n}",
    "    personalRecords,\n    bodyweightRecords\n  }\n}",
    'return bodyweight records',
)
write(path, s)

# Reports UI.
path = 'src/renderer/src/modules/workouts/WorkoutsPage.tsx'
s = read(path)
reports_index = s.index("      {tab === 'reports' && (")
s = s[:reports_index] + s[reports_index:].replace(
    "                    { value: 'all', label: 'Все программы' },\n                    ...programs.map((program) => ({ value: program.id, label: program.name }))\n",
    "                    { value: 'all', label: 'Все программы' },\n                    { value: 'custom', label: 'Свободные тренировки' },\n                    ...programs.map((program) => ({ value: program.id, label: program.name }))\n",
    1,
)
# Summary cards: clarify weighted-only metrics and show the split.
start = s.index("                  {[\n                    { label: 'Тренировки'", reports_index)
end = s.index("                  ].map((stat) => {", start)
summary_array = """                  {[
                    {
                      label: 'Тренировки',
                      value: report.summary.sessions,
                      icon: Dumbbell,
                      meta: `${report.summary.exercises} упражн.`
                    },
                    {
                      label: 'Активные дни',
                      value: report.summary.activeDays,
                      icon: CalendarDays,
                      meta: `${report.summary.durationMinutes} мин всего`
                    },
                    {
                      label: 'Подходы',
                      value: report.summary.sets,
                      icon: Sigma,
                      meta: `${report.summary.externalWeightSets} с весом · ${report.summary.bodyweightSets} без веса`
                    },
                    {
                      label: 'Повторения',
                      value: report.summary.reps,
                      icon: Activity,
                      meta: `${report.summary.externalWeightReps} с весом · ${report.summary.bodyweightReps} без веса`
                    },
                    {
                      label: 'Тоннаж с весом',
                      value: `${formatNumber(report.summary.volumeKg)} кг`,
                      icon: Scale,
                      meta: 'Без упражнений с собственным весом'
                    },
                    {
                      label: 'Среднее время',
                      value: `${formatNumber(report.summary.averageDurationMinutes, 0)} мин`,
                      icon: Clock3,
                      meta: 'На одну тренировку'
                    }
"""
s = s[:start] + summary_array + s[end:]
old_value = """                        <div className="mt-2 text-xl font-semibold text-[var(--app-text)]">
                          {stat.value}
                        </div>
"""
new_value = old_value + """                        <div className="mt-1 text-[10px] leading-4 text-[var(--app-muted)]">
                          {stat.meta}
                        </div>
"""
s = replace_once(s, old_value, new_value, 'report summary metadata')
# Muscle distribution: hide zero rows and use the anatomical artwork.
s = s[:reports_index] + s[reports_index:].replace(
    "                      {report.muscleGroups.map((item) => {\n",
    "                      {report.muscleGroups\n                        .filter((item) => item.sets > 0)\n                        .map((item) => {\n",
    1,
)
old_muscle_label = """                              <span
                                className={cn(
                                  'inline-flex items-center gap-1.5 font-semibold',
                                  classes.text
                                )}
                              >
                                <WorkoutMuscleGroupIcon
                                  group={item.muscleGroup}
                                  className="size-3.5"
                                />
                                {workoutMuscleGroupLabel(item.muscleGroup)}
                              </span>
"""
new_muscle_label = """                              <span
                                className={cn(
                                  'inline-flex items-center gap-2 font-semibold',
                                  classes.text
                                )}
                              >
                                <WorkoutMuscleArtwork
                                  groups={[item.muscleGroup]}
                                  className="size-8 shrink-0 rounded-lg border border-[var(--app-border)] bg-[var(--app-workspace)] p-0.5"
                                />
                                {workoutMuscleGroupLabel(item.muscleGroup)}
                              </span>
"""
s = replace_once(s, old_muscle_label, new_muscle_label, 'report muscle artwork')
# Timeline: sets are universal, volume is supplemental.
s = replace_once(
    s,
    "                          Тоннаж и объём по дням с тренировками.\n",
    "                          Подходы и повторения по дням; тоннаж показывается только для упражнений с весом.\n",
    'timeline description',
)
s = replace_once(
    s,
    "                          const maxVolume = Math.max(\n                            1,\n                            ...report.timeline.map((item) => item.volumeKg)\n                          )\n",
    "                          const maxSets = Math.max(\n                            1,\n                            ...report.timeline.map((item) => item.sets)\n                          )\n",
    'timeline max sets',
)
s = replace_once(
    s,
    "                                      day.volumeKg > 0 ? 8 : 0,\n                                      (day.volumeKg / maxVolume) * 100\n",
    "                                      day.sets > 0 ? 8 : 0,\n                                      (day.sets / maxSets) * 100\n",
    'timeline set width',
)
old_timeline_right = """                              <span className="text-right text-xs text-[var(--app-muted)]">
                                {formatNumber(day.volumeKg)} кг
                              </span>
"""
new_timeline_right = """                              <div className="text-right text-xs text-[var(--app-muted)]">
                                <div>{day.reps} повт.</div>
                                <div className="mt-0.5 text-[10px]">
                                  {day.externalWeightSets > 0 && `${formatNumber(day.volumeKg)} кг`}
                                  {day.externalWeightSets > 0 && day.bodyweightSets > 0 ? ' · ' : ''}
                                  {day.bodyweightSets > 0 && `${day.bodyweightSets} без веса`}
                                </div>
                              </div>
"""
s = replace_once(s, old_timeline_right, new_timeline_right, 'timeline mode details')
# Replace the wide weight-centric exercise table with mode-aware cards.
exercise_section_start = s.index(
    '                <section className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[var(--app-shadow-card)]">\n                  <div className="flex items-center gap-2 border-b border-[var(--app-border)] px-5 py-4">\n                    <Target',
    reports_index,
)
exercise_section_end = s.index('\n\n                <div className="grid gap-4 xl:grid-cols-2">', exercise_section_start)
exercise_section = """                <section className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[var(--app-shadow-card)]">
                  <div className="flex items-center gap-2 border-b border-[var(--app-border)] px-5 py-4">
                    <Target className="size-5 text-violet-300" />
                    <div>
                      <h2 className="text-sm font-semibold text-[var(--app-text)]">
                        По упражнениям
                      </h2>
                      <p className="mt-0.5 text-xs text-[var(--app-muted)]">
                        Для упражнений с весом — тоннаж и рабочий вес; без дополнительного веса — прогресс по повторениям.
                      </p>
                    </div>
                  </div>
                  {report.exercises.length === 0 ? (
                    <div className="flex min-h-48 items-center justify-center text-sm text-[var(--app-muted)]">
                      Нет упражнений за выбранный период
                    </div>
                  ) : (
                    <div className="grid gap-3 p-4 lg:grid-cols-2">
                      {report.exercises.map((item) => {
                        const change = item.usesExternalWeight
                          ? item.weightChangeKg
                          : item.repsChange
                        return (
                          <article
                            key={`${item.exerciseId}-${item.title}-${item.usesExternalWeight ? 'weight' : 'bodyweight'}`}
                            className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-workspace)] p-4"
                          >
                            <div className="flex items-start gap-3">
                              <WorkoutMuscleArtwork
                                groups={item.muscleGroups}
                                className="size-12 shrink-0 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-0.5"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="font-semibold text-[var(--app-text)]">{item.title}</h3>
                                  <span
                                    className={cn(
                                      'rounded-lg border px-2 py-0.5 text-[10px] font-semibold',
                                      item.usesExternalWeight
                                        ? 'border-violet-400/25 bg-violet-500/10 text-violet-200'
                                        : 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200'
                                    )}
                                  >
                                    {item.usesExternalWeight
                                      ? 'С дополнительным весом'
                                      : 'Без дополнительного веса'}
                                  </span>
                                </div>
                                <div className="mt-1 text-[11px] text-[var(--app-muted)]">
                                  {workoutMuscleGroupsLabel(item.muscleGroups)}
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 grid grid-cols-3 gap-2">
                              {[
                                ['Тренировки', item.sessions],
                                ['Подходы', item.sets],
                                ['Повторы', item.reps]
                              ].map(([label, value]) => (
                                <div key={String(label)} className="rounded-xl bg-[var(--app-surface)] p-2.5">
                                  <div className="text-[10px] text-[var(--app-muted)]">{label}</div>
                                  <div className="mt-1 text-sm font-semibold text-[var(--app-text)]">{value}</div>
                                </div>
                              ))}
                            </div>

                            {item.usesExternalWeight ? (
                              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
                                {[
                                  ['Тоннаж', `${formatNumber(item.volumeKg)} кг`],
                                  ['Средний вес', `${formatNumber(item.averageWeightKg)} кг`],
                                  ['Максимум', `${formatNumber(item.maxWeightKg)} кг`],
                                  ['Расч. 1ПМ', `${formatNumber(item.estimatedOneRepMax)} кг`],
                                  [
                                    'Изменение',
                                    `${item.weightChangeKg > 0 ? '+' : ''}${formatNumber(item.weightChangeKg)} кг`
                                  ]
                                ].map(([label, value]) => (
                                  <div key={String(label)} className="rounded-xl bg-[var(--app-surface)] p-2.5">
                                    <div className="text-[10px] text-[var(--app-muted)]">{label}</div>
                                    <div
                                      className={cn(
                                        'mt-1 text-xs font-semibold',
                                        label === 'Изменение'
                                          ? change > 0
                                            ? 'text-emerald-300'
                                            : change < 0
                                              ? 'text-rose-300'
                                              : 'text-[var(--app-muted)]'
                                          : 'text-[var(--app-text)]'
                                      )}
                                    >
                                      {value}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                {[
                                  ['Лучший подход', `${item.bestSetReps} повт.`],
                                  ['Первая трен.', `${item.firstBestReps} повт.`],
                                  ['Последняя трен.', `${item.lastBestReps} повт.`],
                                  [
                                    'Изменение',
                                    `${item.repsChange > 0 ? '+' : ''}${item.repsChange} повт.`
                                  ]
                                ].map(([label, value]) => (
                                  <div key={String(label)} className="rounded-xl bg-[var(--app-surface)] p-2.5">
                                    <div className="text-[10px] text-[var(--app-muted)]">{label}</div>
                                    <div
                                      className={cn(
                                        'mt-1 text-xs font-semibold',
                                        label === 'Изменение'
                                          ? change > 0
                                            ? 'text-emerald-300'
                                            : change < 0
                                              ? 'text-rose-300'
                                              : 'text-[var(--app-muted)]'
                                          : 'text-[var(--app-text)]'
                                      )}
                                    >
                                      {value}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </article>
                        )
                      })}
                    </div>
                  )}
                </section>"""
s = s[:exercise_section_start] + exercise_section + s[exercise_section_end:]
# Program rows should not display meaningless 0 kg for bodyweight-only work.
old_program_value = """                            <span className="text-xs font-medium text-[var(--app-muted)]">
                              {formatNumber(item.volumeKg)} кг
                            </span>
"""
new_program_value = """                            <div className="shrink-0 text-right text-xs font-medium text-[var(--app-muted)]">
                              {item.externalWeightSets > 0 && (
                                <div>{formatNumber(item.volumeKg)} кг</div>
                              )}
                              {item.bodyweightSets > 0 && (
                                <div className="mt-0.5 text-[10px]">
                                  {item.bodyweightSets} подх. без веса
                                </div>
                              )}
                            </div>
"""
s = replace_once(s, old_program_value, new_program_value, 'program report mode value')
# Record section: separate incomparable weighted 1RM and bodyweight repetition records.
record_section_start = s.index(
    '                  <section className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[var(--app-shadow-card)]">\n                    <div className="flex items-center gap-2 border-b border-[var(--app-border)] px-5 py-4">\n                      <Trophy',
    reports_index,
)
record_section_end = s.index('\n                  </section>', record_section_start) + len('\n                  </section>')
record_section = """                  <section className="overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-[var(--app-shadow-card)]">
                    <div className="flex items-center gap-2 border-b border-[var(--app-border)] px-5 py-4">
                      <Trophy className="size-5 text-amber-300" />
                      <div>
                        <h2 className="text-sm font-semibold text-[var(--app-text)]">
                          Лучшие показатели
                        </h2>
                        <p className="mt-0.5 text-xs text-[var(--app-muted)]">
                          Силовые рекорды и лучшие подходы без дополнительного веса считаются отдельно.
                        </p>
                      </div>
                    </div>
                    {report.personalRecords.length === 0 && report.bodyweightRecords.length === 0 ? (
                      <div className="px-5 py-10 text-center text-sm text-[var(--app-muted)]">
                        Добавьте тренировки, чтобы появились рекорды
                      </div>
                    ) : (
                      <div>
                        {report.personalRecords.length > 0 && (
                          <div>
                            <div className="border-b border-[var(--app-border)] px-5 py-2 text-[10px] font-semibold tracking-[0.08em] text-[var(--app-muted)] uppercase">
                              С дополнительным весом
                            </div>
                            <div className="divide-y divide-[var(--app-border)]">
                              {report.personalRecords.slice(0, 8).map((record, index) => (
                                <div
                                  key={`${record.exerciseId}-${record.title}`}
                                  className="flex items-center gap-3 px-5 py-3.5"
                                >
                                  <WorkoutMuscleArtwork
                                    groups={record.muscleGroups}
                                    className="size-9 shrink-0 rounded-lg border border-[var(--app-border)] bg-[var(--app-workspace)] p-0.5"
                                  />
                                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-[10px] font-bold text-amber-300">
                                    {index + 1}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-semibold text-[var(--app-text)]">
                                      {record.title}
                                    </div>
                                    <div className="mt-0.5 text-xs text-[var(--app-muted)]">
                                      {record.weightKg} кг × {record.reps} · {formatDate(record.date)}
                                    </div>
                                  </div>
                                  <span className="text-sm font-semibold text-amber-200">
                                    ≈ {formatNumber(record.estimatedOneRepMax)} кг
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {report.bodyweightRecords.length > 0 && (
                          <div>
                            <div className="border-y border-[var(--app-border)] px-5 py-2 text-[10px] font-semibold tracking-[0.08em] text-[var(--app-muted)] uppercase">
                              Без дополнительного веса
                            </div>
                            <div className="divide-y divide-[var(--app-border)]">
                              {report.bodyweightRecords.slice(0, 8).map((record) => (
                                <div
                                  key={`${record.exerciseId}-${record.title}`}
                                  className="flex items-center gap-3 px-5 py-3.5"
                                >
                                  <WorkoutMuscleArtwork
                                    groups={record.muscleGroups}
                                    className="size-9 shrink-0 rounded-lg border border-[var(--app-border)] bg-[var(--app-workspace)] p-0.5"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-semibold text-[var(--app-text)]">
                                      {record.title}
                                    </div>
                                    <div className="mt-0.5 text-xs text-[var(--app-muted)]">
                                      Лучший подход · {formatDate(record.date)}
                                    </div>
                                  </div>
                                  <span className="text-sm font-semibold text-emerald-200">
                                    {record.reps} повт.
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </section>"""
s = s[:record_section_start] + record_section + s[record_section_end:]
# Average period metrics: weight averages apply only to weighted sets.
s = replace_once(
    s,
    "                      ['Средний вес подхода', `${formatNumber(report.summary.averageWeightKg)} кг`],\n                      ['Максимальный вес', `${formatNumber(report.summary.maxWeightKg)} кг`],\n                      ['Упражнений', report.summary.exercises]\n",
    "                      [\n                        'Средний вес (с весом)',\n                        `${formatNumber(report.summary.averageWeightKg)} кг`\n                      ],\n                      ['Подходов с весом', report.summary.externalWeightSets],\n                      ['Без доп. веса', report.summary.bodyweightSets]\n",
    'average report metrics',
)
write(path, s)

# Repository regression tests.
path = 'src/main/repositories/workouts.repository.test.ts'
s = read(path)
bodyweight_anchor = """    expect(session.totalVolumeKg).toBe(0)

    updateWorkoutExercise({
"""
bodyweight_assertions = """    expect(session.totalVolumeKg).toBe(0)

    const bodyweightReport = getWorkoutReport({
      dateFrom: '2026-08-01',
      dateTo: '2026-08-31',
      programId: null,
      exerciseId: null,
      muscleGroup: null
    })
    expect(bodyweightReport.summary).toMatchObject({
      externalWeightSets: 0,
      bodyweightSets: 2,
      bodyweightReps: 18,
      averageWeightKg: 0,
      volumeKg: 0
    })
    expect(bodyweightReport.exercises[0]).toMatchObject({
      usesExternalWeight: false,
      bestSetReps: 10,
      firstBestReps: 10,
      lastBestReps: 10,
      repsChange: 0
    })
    expect(bodyweightReport.personalRecords).toEqual([])
    expect(bodyweightReport.bodyweightRecords[0]).toMatchObject({
      exerciseId: pullUp.id,
      reps: 10
    })

    updateWorkoutExercise({
"""
s = replace_once(s, bodyweight_anchor, bodyweight_assertions, 'bodyweight report regression')
s = replace_once(
    s,
    "      sets: 8,\n      durationMinutes: 130\n",
    "      sets: 8,\n      externalWeightSets: 8,\n      bodyweightSets: 0,\n      durationMinutes: 130\n",
    'weighted report summary regression',
)
s = replace_once(
    s,
    "      muscleGroups: ['chest'],\n      sessions: 2,\n",
    "      muscleGroups: ['chest'],\n      usesExternalWeight: true,\n      sessions: 2,\n",
    'weighted report exercise mode regression',
)
write(path, s)

# UI report fixture and regression assertions.
path = 'src/renderer/src/modules/workouts/WorkoutsPage.test.tsx'
s = read(path)
s = replace_once(
    s,
    "      sets: 2,\n      reps: 22,\n      volumeKg: 328,\n",
    "      sets: 2,\n      reps: 22,\n      externalWeightSets: 2,\n      externalWeightReps: 22,\n      bodyweightSets: 0,\n      bodyweightReps: 0,\n      volumeKg: 328,\n",
    'UI report summary fixture',
)
s = replace_once(
    s,
    "        muscleGroups: ['biceps'],\n        sessions: 1,\n",
    "        muscleGroups: ['biceps'],\n        usesExternalWeight: true,\n        sessions: 1,\n",
    'UI report exercise mode fixture',
)
s = replace_once(
    s,
    "        weightChangeKg: 0\n",
    "        weightChangeKg: 0,\n        bestSetReps: 12,\n        firstBestReps: 12,\n        lastBestReps: 12,\n        repsChange: 0\n",
    'UI report exercise reps fixture',
)
s = replace_once(
    s,
    "        sets: 2,\n        reps: 22,\n        volumeKg: 328,\n        durationMinutes: 60\n",
    "        sets: 2,\n        reps: 22,\n        externalWeightSets: 2,\n        bodyweightSets: 0,\n        volumeKg: 328,\n        durationMinutes: 60\n",
    'UI program report mode fixture',
)
s = replace_once(
    s,
    "        sets: 2,\n        reps: 22,\n        volumeKg: 328,\n        durationMinutes: 60\n      }\n    ],\n    personalRecords:",
    "        sets: 2,\n        reps: 22,\n        externalWeightSets: 2,\n        bodyweightSets: 0,\n        volumeKg: 328,\n        durationMinutes: 60\n      }\n    ],\n    personalRecords:",
    'UI timeline mode fixture',
)
s = replace_once(
    s,
    "    ]\n  })\n})\n\ndescribe('WorkoutsPage'",
    "    ],\n    bodyweightRecords: []\n  })\n})\n\ndescribe('WorkoutsPage'",
    'UI bodyweight records fixture',
)
s = replace_once(
    s,
    "    expect(screen.getByText('100% · 2 подх. · 22 повт.')).toBeInTheDocument()\n",
    "    expect(screen.getByText('2 с весом · 0 без веса')).toBeInTheDocument()\n    expect(screen.getByText('Тоннаж с весом')).toBeInTheDocument()\n    expect(screen.getByText('С дополнительным весом')).toBeInTheDocument()\n",
    'UI report semantics assertions',
)
write(path, s)

print('Workout reports patch applied successfully.')
