from pathlib import Path
import re

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


# Shared contracts
path = 'src/shared/contracts/workouts.ts'
s = read(path)
s = replace_once(
    s,
    "  muscleGroups: WorkoutMuscleGroup[]\n  status: WorkoutEntityStatus\n",
    "  muscleGroups: WorkoutMuscleGroup[]\n  usesExternalWeight: boolean\n  status: WorkoutEntityStatus\n",
    'exercise record weight mode',
)
s = replace_once(
    s,
    "  muscleGroups: WorkoutMuscleGroup[]\n  position: number\n  comment: string\n  sets: WorkoutSetRecord[]\n",
    "  muscleGroups: WorkoutMuscleGroup[]\n  usesExternalWeight: boolean\n  position: number\n  comment: string\n  sets: WorkoutSetRecord[]\n",
    'session exercise snapshot weight mode',
)
s = replace_once(
    s,
    "  programName: string | null\n  title: string\n  date: string\n",
    "  programName: string | null\n  date: string\n",
    'remove session record title',
)
s = replace_once(
    s,
    "export interface CreateWorkoutExerciseInput {\n  title: string\n  muscleGroups: WorkoutMuscleGroup[]\n  status: WorkoutEntityStatus\n",
    "export interface CreateWorkoutExerciseInput {\n  title: string\n  muscleGroups: WorkoutMuscleGroup[]\n  usesExternalWeight: boolean\n  status: WorkoutEntityStatus\n",
    'exercise input weight mode',
)
s = replace_once(
    s,
    "export interface CreateWorkoutSessionInput {\n  programId: string | null\n  title: string\n  date: string\n",
    "export interface CreateWorkoutSessionInput {\n  programId: string | null\n  date: string\n",
    'remove session input title',
)
write(path, s)

# Shared validation
path = 'src/shared/validation/workouts.ts'
s = read(path)
s = replace_once(
    s,
    "  muscleGroups: muscleGroupsSchema,\n  status: z.enum(WORKOUT_ENTITY_STATUSES)\n",
    "  muscleGroups: muscleGroupsSchema,\n  usesExternalWeight: z.boolean(),\n  status: z.enum(WORKOUT_ENTITY_STATUSES)\n",
    'exercise validation weight mode',
)
s = replace_once(
    s,
    "    programId: idSchema.nullable(),\n    title: z.string().trim().max(160, 'Название слишком длинное'),\n    date: dateSchema,\n",
    "    programId: idSchema.nullable(),\n    date: dateSchema,\n",
    'remove session title validation',
)
write(path, s)

# Drizzle schema
path = 'src/main/database/schema/workouts.ts'
s = read(path)
s = replace_once(
    s,
    "    muscleGroup: text('muscle_group').$type<WorkoutMuscleGroup>().notNull(),\n    description: text('description').notNull().default(''),\n",
    "    muscleGroup: text('muscle_group').$type<WorkoutMuscleGroup>().notNull(),\n    usesExternalWeight: integer('uses_external_weight', { mode: 'boolean' })\n      .notNull()\n      .default(true),\n    description: text('description').notNull().default(''),\n",
    'exercise schema weight mode',
)
s = replace_once(
    s,
    "    muscleGroupSnapshot: text('muscle_group_snapshot').$type<WorkoutMuscleGroup>().notNull(),\n    position: integer('position').notNull(),\n",
    "    muscleGroupSnapshot: text('muscle_group_snapshot').$type<WorkoutMuscleGroup>().notNull(),\n    usesExternalWeightSnapshot: integer('uses_external_weight_snapshot', { mode: 'boolean' })\n      .notNull()\n      .default(true),\n    position: integer('position').notNull(),\n",
    'session snapshot schema weight mode',
)
write(path, s)

# Repository
path = 'src/main/repositories/workouts.repository.ts'
s = read(path)
s = replace_once(
    s,
    "  muscle_group: string\n  description: string\n",
    "  muscle_group: string\n  uses_external_weight: number\n  description: string\n",
    'exercise row weight mode',
)
s = replace_once(
    s,
    "  program_name_snapshot: string | null\n  title: string\n  date: string\n",
    "  program_name_snapshot: string | null\n  date: string\n",
    'remove session row title',
)
s = replace_once(
    s,
    "  muscle_group_snapshot: string\n  position: number\n",
    "  muscle_group_snapshot: string\n  uses_external_weight_snapshot: number\n  position: number\n",
    'session exercise row weight snapshot',
)
s = replace_once(
    s,
    "const EXERCISE_SELECT = `SELECT id, title, muscle_group, description, status, created_at, updated_at FROM workout_exercises`",
    "const EXERCISE_SELECT = `SELECT id, title, muscle_group, uses_external_weight, description, status, created_at, updated_at FROM workout_exercises`",
    'exercise select weight mode',
)
s = replace_once(
    s,
    "const SESSION_SELECT = `SELECT id, program_id, program_name_snapshot, title, date, duration_minutes, comment, created_at, updated_at FROM workout_sessions`",
    "const SESSION_SELECT = `SELECT id, program_id, program_name_snapshot, date, duration_minutes, comment, created_at, updated_at FROM workout_sessions`",
    'session select title cleanup',
)
s = replace_once(
    s,
    "const SESSION_EXERCISE_SELECT = `SELECT id, session_id, exercise_id, exercise_title_snapshot, muscle_group_snapshot, position, comment FROM workout_session_exercises`",
    "const SESSION_EXERCISE_SELECT = `SELECT id, session_id, exercise_id, exercise_title_snapshot, muscle_group_snapshot, uses_external_weight_snapshot, position, comment FROM workout_session_exercises`",
    'session exercise select weight snapshot',
)
s = replace_once(
    s,
    "    muscleGroup: primaryMuscleGroup(muscleGroups),\n    muscleGroups,\n    status: row.status,\n",
    "    muscleGroup: primaryMuscleGroup(muscleGroups),\n    muscleGroups,\n    usesExternalWeight: Boolean(row.uses_external_weight),\n    status: row.status,\n",
    'map exercise weight mode',
)
s = replace_once(
    s,
    "      muscleGroups: parseMuscleGroups(row.muscle_group_snapshot),\n      position: row.position,\n",
    "      muscleGroups: parseMuscleGroups(row.muscle_group_snapshot),\n      usesExternalWeight: Boolean(row.uses_external_weight_snapshot),\n      position: row.position,\n",
    'map session snapshot weight mode',
)
s = replace_once(
    s,
    "      programName: row.program_name_snapshot,\n      title: row.title,\n      date: row.date,\n",
    "      programName: row.program_name_snapshot,\n      date: row.date,\n",
    'remove session mapped title',
)
s = replace_once(
    s,
    "      `INSERT INTO workout_exercises (id, title, muscle_group, description, status, created_at, updated_at)\n       VALUES (?, ?, ?, ?, ?, ?, ?)`\n",
    "      `INSERT INTO workout_exercises (id, title, muscle_group, uses_external_weight, description, status, created_at, updated_at)\n       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`\n",
    'exercise insert columns',
)
s = replace_once(
    s,
    "      serializeMuscleGroups(input.muscleGroups),\n      '',\n      input.status,\n",
    "      serializeMuscleGroups(input.muscleGroups),\n      input.usesExternalWeight ? 1 : 0,\n      '',\n      input.status,\n",
    'exercise insert weight value',
)
s = replace_once(
    s,
    "       SET title = ?, muscle_group = ?, description = ?, status = ?, updated_at = ?\n",
    "       SET title = ?, muscle_group = ?, uses_external_weight = ?, description = ?, status = ?, updated_at = ?\n",
    'exercise update columns',
)
s = replace_once(
    s,
    "      serializeMuscleGroups(input.muscleGroups),\n      '',\n      input.status,\n      Date.now(),\n      input.id\n",
    "      serializeMuscleGroups(input.muscleGroups),\n      input.usesExternalWeight ? 1 : 0,\n      '',\n      input.status,\n      Date.now(),\n      input.id\n",
    'exercise update weight value',
)
s = replace_once(
    s,
    "      (id, session_id, exercise_id, exercise_title_snapshot, muscle_group_snapshot, position, comment)\n     VALUES (?, ?, ?, ?, ?, ?, ?)`\n",
    "      (id, session_id, exercise_id, exercise_title_snapshot, muscle_group_snapshot, uses_external_weight_snapshot, position, comment)\n     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`\n",
    'session exercise snapshot insert columns',
)
s = replace_once(
    s,
    "      serializeMuscleGroups(exercise.muscleGroups),\n      exerciseIndex,\n      item.comment\n",
    "      serializeMuscleGroups(exercise.muscleGroups),\n      exercise.usesExternalWeight ? 1 : 0,\n      exerciseIndex,\n      item.comment\n",
    'session exercise snapshot insert value',
)
s = replace_once(
    s,
    "      setStatement.run(randomUUID(), sessionExerciseId, setIndex, set.reps, toMilliKg(set.weightKg))\n",
    "      const weightKg = exercise.usesExternalWeight ? set.weightKg : 0\n      setStatement.run(randomUUID(), sessionExerciseId, setIndex, set.reps, toMilliKg(weightKg))\n",
    'normalize bodyweight set weight',
)
s = replace_once(
    s,
    "        programName,\n        input.title.trim(),\n        input.date,\n",
    "        programName,\n        '',\n        input.date,\n",
    'create session legacy empty title',
)
s = replace_once(
    s,
    "        input.programId,\n        programName,\n        input.title.trim(),\n        input.date,\n",
    "        input.programId,\n        programName,\n        '',\n        input.date,\n",
    'update session legacy empty title',
)
write(path, s)

# Exercise dialog
path = 'src/renderer/src/modules/workouts/components/WorkoutExerciseDialog.tsx'
s = read(path)
s = replace_once(
    s,
    "  const [muscleGroups, setMuscleGroups] = useState<WorkoutMuscleGroup[]>([])\n  const [error, setError] = useState<string | null>(null)\n",
    "  const [muscleGroups, setMuscleGroups] = useState<WorkoutMuscleGroup[]>([])\n  const [usesExternalWeight, setUsesExternalWeight] = useState(true)\n  const [error, setError] = useState<string | null>(null)\n",
    'exercise dialog weight state',
)
s = replace_once(
    s,
    "    setMuscleGroups(\n      exercise\n        ? exercise.muscleGroups?.length\n          ? exercise.muscleGroups\n          : legacyGroups(exercise.muscleGroup)\n        : []\n    )\n    setError(null)\n",
    "    setMuscleGroups(\n      exercise\n        ? exercise.muscleGroups?.length\n          ? exercise.muscleGroups\n          : legacyGroups(exercise.muscleGroup)\n        : []\n    )\n    setUsesExternalWeight(exercise?.usesExternalWeight ?? true)\n    setError(null)\n",
    'exercise dialog initialize weight state',
)
s = replace_once(
    s,
    "      title: title.trim(),\n      muscleGroups,\n      status: 'active'\n",
    "      title: title.trim(),\n      muscleGroups,\n      usesExternalWeight,\n      status: 'active'\n",
    'exercise dialog payload weight mode',
)
anchor = "        <WorkoutMuscleMapPicker value={muscleGroups} onChange={setMuscleGroups} />\n"
weight_ui = '''        <fieldset className="space-y-2">
          <legend className="text-xs font-medium text-[var(--app-muted)]">Дополнительный вес</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              aria-pressed={usesExternalWeight}
              className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                usesExternalWeight
                  ? 'border-violet-400/35 bg-violet-500/10'
                  : 'border-[var(--app-border)] bg-[var(--app-workspace)] hover:bg-[var(--app-control-hover)]'
              }`}
              onClick={() => setUsesExternalWeight(true)}
            >
              <span className="block text-sm font-semibold text-[var(--app-text)]">
                С дополнительным весом
              </span>
              <span className="mt-1 block text-xs leading-5 text-[var(--app-muted)]">
                Гантели, штанга, тренажёр или другой внешний вес.
              </span>
            </button>
            <button
              type="button"
              aria-pressed={!usesExternalWeight}
              className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                !usesExternalWeight
                  ? 'border-violet-400/35 bg-violet-500/10'
                  : 'border-[var(--app-border)] bg-[var(--app-workspace)] hover:bg-[var(--app-control-hover)]'
              }`}
              onClick={() => setUsesExternalWeight(false)}
            >
              <span className="block text-sm font-semibold text-[var(--app-text)]">
                Без дополнительного веса
              </span>
              <span className="mt-1 block text-xs leading-5 text-[var(--app-muted)]">
                При записи тренировки указываются только подходы и повторения.
              </span>
            </button>
          </div>
        </fieldset>

'''
s = replace_once(s, anchor, weight_ui + anchor, 'exercise dialog weight mode UI')
write(path, s)

# Session dialog: remove title and adapt set UI
path = 'src/renderer/src/modules/workouts/components/WorkoutSessionDialog.tsx'
s = read(path)
s = replace_once(s, "  const [title, setTitle] = useState('')\n", '', 'remove session title state')
s = replace_once(s, "    setTitle(session?.title ?? '')\n", '', 'remove session title initialization')
s = replace_once(s, "      title: title.trim(),\n", '', 'remove session title payload')
s = replace_once(
    s,
    '''          <label className="space-y-1.5 sm:col-span-2">
            <span className="text-xs font-medium text-[var(--app-muted)]">Название записи</span>
            <input
              value={title}
              maxLength={160}
              placeholder="Необязательно — например, Тяжёлая тренировка ног"
              className="h-10 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-workspace)] px-3 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60 focus:border-violet-500/45"
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
''',
    '',
    'remove session title field',
)
s = replace_once(
    s,
    '          <label className="space-y-1.5 sm:col-span-2">\n            <span className="text-xs font-medium text-[var(--app-muted)]">Общий комментарий</span>',
    '          <label className="space-y-1.5 sm:col-span-2 lg:col-span-4">\n            <span className="text-xs font-medium text-[var(--app-muted)]">Комментарий</span>',
    'expand session comment',
)
old_valid = '''  const valid =
    items.length > 0 &&
    items.every(
      (item) =>
        item.exerciseId &&
        item.sets.length > 0 &&
        item.sets.every((set) => Number(set.reps) >= 1 && Number(set.weightKg || 0) >= 0)
    )
'''
new_valid = '''  const valid =
    items.length > 0 &&
    items.every((item) => {
      const exercise = exerciseMap.get(item.exerciseId)
      return (
        Boolean(exercise) &&
        item.sets.length > 0 &&
        item.sets.every(
          (set) =>
            Number(set.reps) >= 1 &&
            (!exercise.usesExternalWeight || Number(set.weightKg || 0) >= 0)
        )
      )
    })
'''
s = replace_once(s, old_valid, new_valid, 'session validation by weight mode')
old_sets_payload = '''        sets: item.sets.map((set) => ({
          reps: Number(set.reps),
          weightKg: Number(set.weightKg || 0)
        }))
'''
new_sets_payload = '''        sets: item.sets.map((set) => ({
          reps: Number(set.reps),
          weightKg: exerciseMap.get(item.exerciseId)?.usesExternalWeight
            ? Number(set.weightKg || 0)
            : 0
        }))
'''
s = replace_once(s, old_sets_payload, new_sets_payload, 'session payload bodyweight normalization')
# Add weight mode to metadata
s = replace_once(
    s,
    "                          {workoutMuscleGroupsLabel(exercise.muscleGroups)} · {item.sets.length}{' '}\n                          {item.sets.length === 1 ? 'подход' : 'подходов'}\n",
    "                          {workoutMuscleGroupsLabel(exercise.muscleGroups)} ·{' '}\n                          {exercise.usesExternalWeight ? 'С доп. весом' : 'Без доп. веса'} ·{' '}\n                          {item.sets.length} {item.sets.length === 1 ? 'подход' : 'подходов'}\n",
    'session exercise metadata weight mode',
)
# Replace set table block with conditional columns
start = s.index('                  <div className="mt-4 overflow-hidden rounded-xl border border-[var(--app-border)]">')
end_marker = '                  </div>\n\n                  <label className="mt-3 block space-y-1.5">'
end = s.index(end_marker, start)
old_block = s[start:end]
new_block = '''                  <div className="mt-4 overflow-hidden rounded-xl border border-[var(--app-border)]">
                    <div
                      className={`grid gap-2 bg-[var(--app-workspace)] px-3 py-2 text-[11px] font-semibold tracking-[0.08em] text-[var(--app-muted)] uppercase ${
                        exercise?.usesExternalWeight
                          ? 'grid-cols-[52px_minmax(100px,1fr)_minmax(100px,1fr)_42px]'
                          : 'grid-cols-[52px_minmax(100px,1fr)_42px]'
                      }`}
                    >
                      <span>№</span>
                      <span>Повторы</span>
                      {exercise?.usesExternalWeight && <span>Вес, кг</span>}
                      <span />
                    </div>
                    <div className="divide-y divide-[var(--app-border)]">
                      {item.sets.map((set, setIndex) => (
                        <div
                          key={setIndex}
                          className={`grid items-center gap-2 px-3 py-2.5 ${
                            exercise?.usesExternalWeight
                              ? 'grid-cols-[52px_minmax(100px,1fr)_minmax(100px,1fr)_42px]'
                              : 'grid-cols-[52px_minmax(100px,1fr)_42px]'
                          }`}
                        >
                          <span className="text-xs font-semibold text-[var(--app-muted)]">
                            {setIndex + 1}
                          </span>
                          <input
                            type="number"
                            min={1}
                            value={set.reps}
                            aria-label={`Повторения, подход ${setIndex + 1}`}
                            className="h-9 rounded-lg border border-[var(--app-border)] bg-[var(--app-workspace)] px-2.5 text-sm text-[var(--app-text)] outline-none focus:border-violet-500/45"
                            onChange={(event) =>
                              updateSet(exerciseIndex, setIndex, { reps: event.target.value })
                            }
                          />
                          {exercise?.usesExternalWeight && (
                            <input
                              type="number"
                              min={0}
                              step="0.25"
                              value={set.weightKg}
                              placeholder="0"
                              aria-label={`Вес, подход ${setIndex + 1}`}
                              className="h-9 rounded-lg border border-[var(--app-border)] bg-[var(--app-workspace)] px-2.5 text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]/60 focus:border-violet-500/45"
                              onChange={(event) =>
                                updateSet(exerciseIndex, setIndex, { weightKg: event.target.value })
                              }
                            />
                          )}
                          <button
                            type="button"
                            aria-label={`Удалить подход ${setIndex + 1}`}
                            disabled={item.sets.length === 1}
                            className="flex size-8 items-center justify-center rounded-lg text-[var(--app-muted)] hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-30"
                            onClick={() =>
                              updateExercise(exerciseIndex, {
                                sets: item.sets.filter((_, index) => index !== setIndex)
                              })
                            }
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
'''
s = s[:start] + new_block + s[end:]
write(path, s)

# Session detail dialog
path = 'src/renderer/src/modules/workouts/components/WorkoutSessionDetailDialog.tsx'
s = read(path)
s = replace_once(
    s,
    "}: WorkoutSessionDetailDialogProps): React.JSX.Element {\n  return (\n",
    "}: WorkoutSessionDetailDialogProps): React.JSX.Element {\n  const hasExternalWeight = session?.exercises.some((exercise) => exercise.usesExternalWeight) ?? false\n\n  return (\n",
    'session detail weighted summary state',
)
s = replace_once(
    s,
    "      title={session?.title || session?.programName || 'Тренировка'}\n",
    "      title={session?.programName || 'Тренировка'}\n",
    'session detail title cleanup',
)
s = replace_once(
    s,
    "                {session.totalVolumeKg.toLocaleString('ru-RU')} кг\n",
    "                {hasExternalWeight ? `${session.totalVolumeKg.toLocaleString('ru-RU')} кг` : 'Не используется'}\n",
    'session detail total volume for bodyweight',
)
old_article = '''                      <div className="mt-0.5 text-xs text-[var(--app-muted)]">
                        {workoutMuscleGroupLabel(exercise.muscleGroup)} · {exercise.sets.length}{' '}
                        подх. · {Math.round(volume * 100) / 100} кг объёма
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-[52px_1fr_1fr_1fr] bg-[var(--app-workspace)] px-4 py-2 text-[11px] font-semibold tracking-[0.08em] text-[var(--app-muted)] uppercase">
                    <span>№</span>
                    <span>Повторы</span>
                    <span>Вес</span>
                    <span>Объём</span>
                  </div>
                  <div className="divide-y divide-[var(--app-border)]">
                    {exercise.sets.map((set) => (
                      <div
                        key={set.id}
                        className="grid grid-cols-[52px_1fr_1fr_1fr] px-4 py-2.5 text-sm"
                      >
                        <span className="text-[var(--app-muted)]">{set.position + 1}</span>
                        <span className="font-medium text-[var(--app-text)]">{set.reps}</span>
                        <span className="text-[var(--app-text)]">{set.weightKg} кг</span>
                        <span className="text-[var(--app-muted)]">
                          {Math.round(set.reps * set.weightKg * 100) / 100} кг
                        </span>
                      </div>
                    ))}
                  </div>
'''
new_article = '''                      <div className="mt-0.5 text-xs text-[var(--app-muted)]">
                        {workoutMuscleGroupLabel(exercise.muscleGroup)} · {exercise.sets.length} подх.
                        {exercise.usesExternalWeight
                          ? ` · ${Math.round(volume * 100) / 100} кг объёма`
                          : ' · Без доп. веса'}
                      </div>
                    </div>
                  </div>
                  <div
                    className={`grid bg-[var(--app-workspace)] px-4 py-2 text-[11px] font-semibold tracking-[0.08em] text-[var(--app-muted)] uppercase ${
                      exercise.usesExternalWeight
                        ? 'grid-cols-[52px_1fr_1fr_1fr]'
                        : 'grid-cols-[52px_1fr]'
                    }`}
                  >
                    <span>№</span>
                    <span>Повторы</span>
                    {exercise.usesExternalWeight && <span>Вес</span>}
                    {exercise.usesExternalWeight && <span>Объём</span>}
                  </div>
                  <div className="divide-y divide-[var(--app-border)]">
                    {exercise.sets.map((set) => (
                      <div
                        key={set.id}
                        className={`grid px-4 py-2.5 text-sm ${
                          exercise.usesExternalWeight
                            ? 'grid-cols-[52px_1fr_1fr_1fr]'
                            : 'grid-cols-[52px_1fr]'
                        }`}
                      >
                        <span className="text-[var(--app-muted)]">{set.position + 1}</span>
                        <span className="font-medium text-[var(--app-text)]">{set.reps}</span>
                        {exercise.usesExternalWeight && (
                          <span className="text-[var(--app-text)]">{set.weightKg} кг</span>
                        )}
                        {exercise.usesExternalWeight && (
                          <span className="text-[var(--app-muted)]">
                            {Math.round(set.reps * set.weightKg * 100) / 100} кг
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
'''
s = replace_once(s, old_article, new_article, 'session detail conditional weight table')
write(path, s)

# Workouts page: session title removal and no duplicated program badge
path = 'src/renderer/src/modules/workouts/WorkoutsPage.tsx'
s = read(path)
s = replace_once(
    s,
    "      return `${session.title} ${session.programName ?? ''} ${session.comment} ${exerciseNames}`\n",
    "      return `${session.programName ?? ''} ${session.comment} ${exerciseNames}`\n",
    'session search title cleanup',
)
s = replace_once(
    s,
    "                            {session.title || session.programName || 'Свободная тренировка'}\n",
    "                            {session.programName || 'Свободная тренировка'}\n",
    'journal session title cleanup',
)
program_badge = '''                          {session.programName && (
                            <span className="rounded-lg border border-violet-400/15 bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium text-violet-300">
                              {session.programName}
                            </span>
                          )}
'''
if program_badge in s:
    s = s.replace(program_badge, '', 1)
write(path, s)

# Repository tests: add new field everywhere, remove session titles and add dedicated bodyweight behavior test
path = 'src/main/repositories/workouts.repository.test.ts'
s = read(path)
s = re.sub(
    r"(\s+muscleGroups: \[[^\n]+\],\n)(\s+status: 'active')",
    r"\1\2".replace("status", "usesExternalWeight: true,\n      status"),
    s,
)
# The regex replacement above preserves common indentation only approximately; normalize generated field indentation below.
s = s.replace("      usesExternalWeight: true,\n      status", "      usesExternalWeight: true,\n      status")
s = re.sub(r"\n\s+title: (?:''|'Грудь'),\n\s+date:", "\n      date:", s)
# updateWorkoutExercise objects also got field through regex if same shape.
legacy_expect = '''    expect(legacy).toMatchObject({
      muscleGroup: 'shoulders',
      muscleGroups: ['shoulders', 'biceps', 'triceps', 'forearms']
    })
'''
legacy_new = '''    expect(legacy).toMatchObject({
      muscleGroup: 'shoulders',
      muscleGroups: ['shoulders', 'biceps', 'triceps', 'forearms'],
      usesExternalWeight: true
    })
'''
s = replace_once(s, legacy_expect, legacy_new, 'legacy exercise default weight mode test')
insert_before = "  it('stores progress indicators independently from workout sessions', () => {"
bodyweight_test = '''  it('keeps bodyweight exercises free of additional weight and snapshots the mode', () => {
    const pullUp = createWorkoutExercise({
      title: 'Подтягивания',
      muscleGroups: ['lats', 'biceps'],
      usesExternalWeight: false,
      status: 'active'
    })

    const session = createWorkoutSession({
      programId: null,
      date: '2026-08-12',
      durationMinutes: 45,
      comment: 'Работа с собственным весом',
      exercises: [
        {
          exerciseId: pullUp.id,
          comment: '',
          sets: [
            { reps: 10, weightKg: 25 },
            { reps: 8, weightKg: 25 }
          ]
        }
      ]
    })

    expect(pullUp.usesExternalWeight).toBe(false)
    expect(session).not.toHaveProperty('title')
    expect(session.exercises[0]).toMatchObject({
      usesExternalWeight: false,
      sets: [
        expect.objectContaining({ reps: 10, weightKg: 0 }),
        expect.objectContaining({ reps: 8, weightKg: 0 })
      ]
    })
    expect(session.totalVolumeKg).toBe(0)

    updateWorkoutExercise({
      id: pullUp.id,
      title: 'Подтягивания',
      muscleGroups: ['lats', 'biceps'],
      usesExternalWeight: true,
      status: 'active'
    })

    expect(listWorkoutsOverview().sessions[0]?.exercises[0]?.usesExternalWeight).toBe(false)
  })

'''
if insert_before not in s:
    raise RuntimeError('bodyweight test insertion anchor missing')
s = s.replace(insert_before, bodyweight_test + insert_before, 1)
write(path, s)

# Workouts renderer test fixture compatibility
path = 'src/renderer/src/modules/workouts/WorkoutsPage.test.tsx'
s = read(path)
s = replace_once(
    s,
    "  muscleGroups: ['biceps'],\n  status: 'active',\n",
    "  muscleGroups: ['biceps'],\n  usesExternalWeight: true,\n  status: 'active',\n",
    'renderer exercise fixture weight mode',
)
s = s.replace("        title: '',\n", '')
s = replace_once(
    s,
    "            muscleGroups: curl.muscleGroups,\n            position: 0,\n",
    "            muscleGroups: curl.muscleGroups,\n            usesExternalWeight: curl.usesExternalWeight,\n            position: 0,\n",
    'renderer session fixture weight snapshot',
)
write(path, s)

# Focused session dialog regression test
path = 'src/renderer/src/modules/workouts/components/WorkoutSessionDialog.test.tsx'
write(path, '''import { render, screen } from '@testing-library/react'\nimport { describe, expect, it, vi } from 'vitest'\n\nimport type { WorkoutExerciseRecord, WorkoutSessionRecord } from '../../../../../shared/contracts/workouts'\nimport { WorkoutSessionDialog } from './WorkoutSessionDialog'\n\nconst pullUp: WorkoutExerciseRecord = {\n  id: 'exercise-pull-up',\n  title: 'Подтягивания',\n  muscleGroup: 'lats',\n  muscleGroups: ['lats', 'biceps'],\n  usesExternalWeight: false,\n  status: 'active',\n  createdAt: 1,\n  updatedAt: 1\n}\n\nconst session: WorkoutSessionRecord = {\n  id: 'session-bodyweight',\n  programId: null,\n  programName: null,\n  date: '2026-08-25',\n  durationMinutes: 45,\n  comment: 'Собственный вес',\n  exercises: [\n    {\n      id: 'session-exercise-pull-up',\n      exerciseId: pullUp.id,\n      exerciseTitle: pullUp.title,\n      muscleGroup: pullUp.muscleGroup,\n      muscleGroups: pullUp.muscleGroups,\n      usesExternalWeight: false,\n      position: 0,\n      comment: '',\n      sets: [{ id: 'set-1', position: 0, reps: 10, weightKg: 0 }]\n    }\n  ],\n  totalSets: 1,\n  totalReps: 10,\n  totalVolumeKg: 0,\n  createdAt: 1,\n  updatedAt: 1\n}\n\ndescribe('WorkoutSessionDialog', () => {\n  it('does not ask for a workout title or weight for a bodyweight exercise', () => {\n    render(\n      <WorkoutSessionDialog\n        open\n        session={session}\n        exercises={[pullUp]}\n        programs={[]}\n        busy={false}\n        onOpenChange={vi.fn()}\n        onSave={vi.fn().mockResolvedValue(undefined)}\n      />\n    )\n\n    expect(screen.queryByText('Название записи')).not.toBeInTheDocument()\n    expect(screen.queryByRole('textbox', { name: /Название записи/i })).not.toBeInTheDocument()\n    expect(screen.getByText('Без доп. веса')).toBeInTheDocument()\n    expect(screen.getByRole('spinbutton', { name: 'Повторения, подход 1' })).toBeInTheDocument()\n    expect(screen.queryByRole('spinbutton', { name: 'Вес, подход 1' })).not.toBeInTheDocument()\n  })\n})\n''')

print('Workout bodyweight patch applied successfully.')
