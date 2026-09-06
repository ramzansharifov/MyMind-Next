import type { RepositoryRuntime } from '@mymind/contracts/storage'
import type {
  CreateWorkoutExerciseInput,
  CreateWorkoutProgramInput,
  CreateWorkoutProgressEntryInput,
  CreateWorkoutSessionInput,
  DeleteWorkoutExerciseInput,
  DeleteWorkoutProgramInput,
  DeleteWorkoutProgressEntryInput,
  DeleteWorkoutProgressPhotoInput,
  DeleteWorkoutSessionInput,
  ImportWorkoutProgressPhotoInput,
  UpdateWorkoutExerciseInput,
  UpdateWorkoutProgramInput,
  UpdateWorkoutProgressEntryInput,
  UpdateWorkoutSessionInput,
  WorkoutBodyweightRecord,
  WorkoutEntityStatus,
  WorkoutExerciseRecord,
  WorkoutMuscleGroup,
  WorkoutPersonalRecord,
  WorkoutProgramExerciseInput,
  WorkoutProgramExerciseRecord,
  WorkoutProgramRecord,
  WorkoutProgressEntryRecord,
  WorkoutProgressMetricInput,
  WorkoutProgressMetricRecord,
  WorkoutProgressPhotoRecord,
  WorkoutProgressPhotoView,
  WorkoutReport,
  WorkoutReportDay,
  WorkoutReportExercise,
  WorkoutReportInput,
  WorkoutReportMuscleGroup,
  WorkoutReportProgram,
  WorkoutSessionExerciseInput,
  WorkoutSessionExerciseRecord,
  WorkoutSessionRecord,
  WorkoutSetRecord,
  WorkoutsOverview
} from '@mymind/contracts/workouts'
import { WORKOUT_MUSCLE_GROUPS, WORKOUT_MUSCLE_ZONES } from '@mymind/contracts/workouts'

export interface WorkoutProgressAsset {
  id: string
  name: string
  mimeType: string
  size: number
  url: string
}

export interface WorkoutsPersistenceHooks {
  importProgressPhoto?(
    entryId: string,
    view: WorkoutProgressPhotoView
  ): Promise<WorkoutProgressAsset | null>
  deleteProgressPhotoAsset?(photo: WorkoutProgressPhotoRecord): Promise<void>
}

interface ExerciseRow {
  id: string
  title: string
  muscle_group: string
  uses_external_weight: number
  description: string
  status: WorkoutEntityStatus
  created_at: number
  updated_at: number
}
interface ProgramRow {
  id: string
  name: string
  description: string
  status: WorkoutEntityStatus
  created_at: number
  updated_at: number
}
interface ProgramExerciseRow {
  id: string
  program_id: string
  exercise_id: string
  position: number
}
interface SessionRow {
  id: string
  program_id: string | null
  program_name_snapshot: string | null
  date: string
  duration_minutes: number | null
  comment: string
  created_at: number
  updated_at: number
}
interface SessionExerciseRow {
  id: string
  session_id: string
  exercise_id: string | null
  exercise_title_snapshot: string
  muscle_group_snapshot: string
  uses_external_weight_snapshot: number
  position: number
  comment: string
}
interface SetRow {
  id: string
  session_exercise_id: string
  position: number
  reps: number
  weight_milli_kg: number
}
interface ProgressEntryRow {
  id: string
  date: string
  body_weight_milli_kg: number | null
  wellbeing: string
  notes: string
  created_at: number
  updated_at: number
}
interface ProgressMetricRow {
  id: string
  entry_id: string
  exercise_id: string | null
  exercise_title_snapshot: string
  muscle_group_snapshot: string
  uses_external_weight_snapshot: number
  weight_milli_kg: number
  reps: number
  comment: string
  position: number
}
interface ProgressPhotoRow {
  id: string
  entry_id: string
  asset_id: string
  file_name: string
  mime_type: string
  size: number
  url: string
  view: WorkoutProgressPhotoView
  created_at: number
}

const EXERCISE_SELECT =
  'SELECT id, title, muscle_group, uses_external_weight, description, status, created_at, updated_at FROM workout_exercises'
const PROGRAM_SELECT =
  'SELECT id, name, description, status, created_at, updated_at FROM workout_programs'
const PROGRAM_EXERCISE_SELECT =
  'SELECT id, program_id, exercise_id, position FROM workout_program_exercises'
const SESSION_SELECT =
  'SELECT id, program_id, program_name_snapshot, date, duration_minutes, comment, created_at, updated_at FROM workout_sessions'
const SESSION_EXERCISE_SELECT =
  'SELECT id, session_id, exercise_id, exercise_title_snapshot, muscle_group_snapshot, uses_external_weight_snapshot, position, comment FROM workout_session_exercises'
const SET_SELECT =
  'SELECT id, session_exercise_id, position, reps, weight_milli_kg FROM workout_sets'
const PROGRESS_ENTRY_SELECT =
  'SELECT id, date, body_weight_milli_kg, wellbeing, notes, created_at, updated_at FROM workout_progress_entries'
const PROGRESS_METRIC_SELECT =
  'SELECT id, entry_id, exercise_id, exercise_title_snapshot, muscle_group_snapshot, uses_external_weight_snapshot, weight_milli_kg, reps, comment, position FROM workout_progress_metrics'
const PROGRESS_PHOTO_SELECT =
  'SELECT id, entry_id, asset_id, file_name, mime_type, size, url, view, created_at FROM workout_progress_photos'

function toMilliKg(value: number): number {
  return Math.round(value * 1000)
}
function fromMilliKg(value: number): number {
  return Math.round((value / 1000) * 1000) / 1000
}
function round2(value: number): number {
  return Math.round(value * 100) / 100
}
function estimatedOneRepMax(weightKg: number, reps: number): number {
  return weightKg <= 0 || reps <= 0 ? 0 : round2(weightKg * (1 + reps / 30))
}

const muscleGroupSet = new Set<string>(WORKOUT_MUSCLE_GROUPS)
function expandLegacyMuscleGroup(group: WorkoutMuscleGroup): WorkoutMuscleGroup[] {
  if (group === 'arms') return ['shoulders', 'biceps', 'triceps', 'forearms']
  if (group === 'back') return ['lats', 'traps', 'lower_back']
  if (group === 'legs') return ['glutes', 'quadriceps', 'hamstrings', 'calves']
  return [group]
}
function parseMuscleGroups(raw: string): WorkoutMuscleGroup[] {
  let value: unknown = raw
  try {
    value = JSON.parse(raw)
  } catch {
    // Legacy databases stored one plain-text group.
  }
  const values = Array.isArray(value) ? value : [value]
  const normalized = values
    .filter(
      (candidate): candidate is WorkoutMuscleGroup =>
        typeof candidate === 'string' && muscleGroupSet.has(candidate)
    )
    .flatMap(expandLegacyMuscleGroup)
  const unique = [...new Set(normalized)]
  return unique.length ? unique : ['shoulders']
}
function serializeMuscleGroups(groups: WorkoutMuscleGroup[]): string {
  const unique = [
    ...new Set(groups.filter((group) => muscleGroupSet.has(group)).flatMap(expandLegacyMuscleGroup))
  ]
  if (!unique.length) throw new Error('Выберите хотя бы одну мышечную зону')
  return JSON.stringify(unique)
}
function primaryMuscleGroup(groups: WorkoutMuscleGroup[]): WorkoutMuscleGroup {
  return groups[0] ?? 'shoulders'
}

export function createWorkoutsRepository(
  runtime: RepositoryRuntime,
  hooks: WorkoutsPersistenceHooks = {}
): WorkoutsRepository {
  const getSqlite = runtime.database

  function mapExercise(row: ExerciseRow): WorkoutExerciseRecord {
    const muscleGroups = parseMuscleGroups(row.muscle_group)
    return {
      id: row.id,
      title: row.title,
      muscleGroup: primaryMuscleGroup(muscleGroups),
      muscleGroups,
      usesExternalWeight: Boolean(row.uses_external_weight),
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }
  function mapPhoto(row: ProgressPhotoRow): WorkoutProgressPhotoRecord {
    return {
      id: row.id,
      entryId: row.entry_id,
      assetId: row.asset_id,
      fileName: row.file_name,
      mimeType: row.mime_type,
      size: row.size,
      url: row.url,
      view: row.view,
      createdAt: row.created_at
    }
  }
  function mapSet(row: SetRow): WorkoutSetRecord {
    return {
      id: row.id,
      position: row.position,
      reps: row.reps,
      weightKg: fromMilliKg(row.weight_milli_kg)
    }
  }

  function requireExercise(id: string): WorkoutExerciseRecord {
    const row = getSqlite().prepare(`${EXERCISE_SELECT} WHERE id = ?`).get(id) as
      ExerciseRow | undefined
    if (!row) throw new Error('Упражнение не найдено')
    return mapExercise(row)
  }
  function requireProgramRow(id: string): ProgramRow {
    const row = getSqlite().prepare(`${PROGRAM_SELECT} WHERE id = ?`).get(id) as
      ProgramRow | undefined
    if (!row) throw new Error('Программа тренировок не найдена')
    return row
  }
  function requireProgressEntryRow(id: string): ProgressEntryRow {
    const row = getSqlite().prepare(`${PROGRESS_ENTRY_SELECT} WHERE id = ?`).get(id) as
      ProgressEntryRow | undefined
    if (!row) throw new Error('Запись прогресса не найдена')
    return row
  }
  function ensureUniqueExerciseTitle(title: string, ignoredId: string | null = null): void {
    const normalized = title.trim().toLocaleLowerCase('ru-RU')
    const rows = getSqlite().prepare('SELECT id, title FROM workout_exercises').all() as Array<{
      id: string
      title: string
    }>
    if (
      rows.some(
        (row) => row.id !== ignoredId && row.title.trim().toLocaleLowerCase('ru-RU') === normalized
      )
    )
      throw new Error('Упражнение с таким названием уже существует')
  }
  function ensureUniqueProgramName(name: string, ignoredId: string | null = null): void {
    const normalized = name.trim().toLocaleLowerCase('ru-RU')
    const rows = getSqlite().prepare('SELECT id, name FROM workout_programs').all() as Array<{
      id: string
      name: string
    }>
    if (
      rows.some(
        (row) => row.id !== ignoredId && row.name.trim().toLocaleLowerCase('ru-RU') === normalized
      )
    )
      throw new Error('Программа с таким названием уже существует')
  }

  function loadPrograms(): WorkoutProgramRecord[] {
    const rows = getSqlite()
      .prepare(
        `${PROGRAM_SELECT} ORDER BY CASE status WHEN 'active' THEN 0 ELSE 1 END, updated_at DESC`
      )
      .all() as ProgramRow[]
    const items = getSqlite()
      .prepare(`${PROGRAM_EXERCISE_SELECT} ORDER BY program_id, position`)
      .all() as ProgramExerciseRow[]
    const byProgram = new Map<string, WorkoutProgramExerciseRecord[]>()
    for (const row of items) {
      const list = byProgram.get(row.program_id) ?? []
      list.push({ id: row.id, exerciseId: row.exercise_id, position: row.position })
      byProgram.set(row.program_id, list)
    }
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      status: row.status,
      exercises: byProgram.get(row.id) ?? [],
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  }
  function requireProgram(id: string): WorkoutProgramRecord {
    const program = loadPrograms().find((candidate) => candidate.id === id)
    if (!program) throw new Error('Программа тренировок не найдена')
    return program
  }

  function loadSessions(): WorkoutSessionRecord[] {
    const sessions = getSqlite()
      .prepare(`${SESSION_SELECT} ORDER BY date DESC, created_at DESC`)
      .all() as SessionRow[]
    const exercises = getSqlite()
      .prepare(`${SESSION_EXERCISE_SELECT} ORDER BY session_id, position`)
      .all() as SessionExerciseRow[]
    const sets = getSqlite()
      .prepare(`${SET_SELECT} ORDER BY session_exercise_id, position`)
      .all() as SetRow[]
    const setsByExercise = new Map<string, WorkoutSetRecord[]>()
    for (const row of sets) {
      const list = setsByExercise.get(row.session_exercise_id) ?? []
      list.push(mapSet(row))
      setsByExercise.set(row.session_exercise_id, list)
    }
    const exercisesBySession = new Map<string, WorkoutSessionExerciseRecord[]>()
    for (const row of exercises) {
      const muscleGroups = parseMuscleGroups(row.muscle_group_snapshot)
      const list = exercisesBySession.get(row.session_id) ?? []
      list.push({
        id: row.id,
        exerciseId: row.exercise_id,
        exerciseTitle: row.exercise_title_snapshot,
        muscleGroup: primaryMuscleGroup(muscleGroups),
        muscleGroups,
        usesExternalWeight: Boolean(row.uses_external_weight_snapshot),
        position: row.position,
        comment: row.comment,
        sets: setsByExercise.get(row.id) ?? []
      })
      exercisesBySession.set(row.session_id, list)
    }
    return sessions.map((row) => {
      const sessionExercises = exercisesBySession.get(row.id) ?? []
      const allSets = sessionExercises.flatMap((exercise) => exercise.sets)
      return {
        id: row.id,
        programId: row.program_id,
        programName: row.program_name_snapshot,
        date: row.date,
        durationMinutes: row.duration_minutes,
        comment: row.comment,
        exercises: sessionExercises,
        totalSets: allSets.length,
        totalReps: allSets.reduce((sum, set) => sum + set.reps, 0),
        totalVolumeKg: round2(allSets.reduce((sum, set) => sum + set.reps * set.weightKg, 0)),
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    })
  }
  function getSession(id: string): WorkoutSessionRecord {
    const session = loadSessions().find((candidate) => candidate.id === id)
    if (!session) throw new Error('Запись тренировки не найдена')
    return session
  }

  function loadProgressEntries(): WorkoutProgressEntryRecord[] {
    const entries = getSqlite()
      .prepare(`${PROGRESS_ENTRY_SELECT} ORDER BY date DESC, created_at DESC`)
      .all() as ProgressEntryRow[]
    const metrics = getSqlite()
      .prepare(`${PROGRESS_METRIC_SELECT} ORDER BY entry_id, position`)
      .all() as ProgressMetricRow[]
    const photos = getSqlite()
      .prepare(`${PROGRESS_PHOTO_SELECT} ORDER BY entry_id, created_at`)
      .all() as ProgressPhotoRow[]
    const metricsByEntry = new Map<string, WorkoutProgressMetricRecord[]>()
    const photosByEntry = new Map<string, WorkoutProgressPhotoRecord[]>()
    for (const row of metrics) {
      const muscleGroups = parseMuscleGroups(row.muscle_group_snapshot)
      const list = metricsByEntry.get(row.entry_id) ?? []
      list.push({
        id: row.id,
        exerciseId: row.exercise_id,
        exerciseTitle: row.exercise_title_snapshot,
        muscleGroup: primaryMuscleGroup(muscleGroups),
        muscleGroups,
        usesExternalWeight: Boolean(row.uses_external_weight_snapshot),
        weightKg: fromMilliKg(row.weight_milli_kg),
        reps: row.reps,
        comment: row.comment
      })
      metricsByEntry.set(row.entry_id, list)
    }
    for (const row of photos) {
      const list = photosByEntry.get(row.entry_id) ?? []
      list.push(mapPhoto(row))
      photosByEntry.set(row.entry_id, list)
    }
    return entries.map((row) => ({
      id: row.id,
      date: row.date,
      bodyWeightKg:
        row.body_weight_milli_kg === null ? null : fromMilliKg(row.body_weight_milli_kg),
      wellbeing: row.wellbeing,
      notes: row.notes,
      metrics: metricsByEntry.get(row.id) ?? [],
      photos: photosByEntry.get(row.id) ?? [],
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  }
  function getProgressEntry(id: string): WorkoutProgressEntryRecord {
    const entry = loadProgressEntries().find((candidate) => candidate.id === id)
    if (!entry) throw new Error('Запись прогресса не найдена')
    return entry
  }

  function listOverview(): WorkoutsOverview {
    const exercises = getSqlite()
      .prepare(
        `${EXERCISE_SELECT} ORDER BY CASE status WHEN 'active' THEN 0 ELSE 1 END, updated_at DESC`
      )
      .all() as ExerciseRow[]
    return {
      exercises: exercises.map(mapExercise),
      programs: loadPrograms(),
      sessions: loadSessions(),
      progressEntries: loadProgressEntries()
    }
  }

  function createExercise(input: CreateWorkoutExerciseInput): WorkoutExerciseRecord {
    ensureUniqueExerciseTitle(input.title)
    const id = runtime.createId()
    const now = runtime.now()
    getSqlite()
      .prepare(
        `INSERT INTO workout_exercises
        (id, title, muscle_group, uses_external_weight, description, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, '', ?, ?, ?)`
      )
      .run(
        id,
        input.title.trim(),
        serializeMuscleGroups(input.muscleGroups),
        input.usesExternalWeight ? 1 : 0,
        input.status,
        now,
        now
      )
    return requireExercise(id)
  }
  function updateExercise(input: UpdateWorkoutExerciseInput): WorkoutExerciseRecord {
    requireExercise(input.id)
    ensureUniqueExerciseTitle(input.title, input.id)
    getSqlite()
      .prepare(
        `UPDATE workout_exercises SET title = ?, muscle_group = ?, uses_external_weight = ?, description = '', status = ?, updated_at = ? WHERE id = ?`
      )
      .run(
        input.title.trim(),
        serializeMuscleGroups(input.muscleGroups),
        input.usesExternalWeight ? 1 : 0,
        input.status,
        runtime.now(),
        input.id
      )
    return requireExercise(input.id)
  }
  function deleteExercise(input: DeleteWorkoutExerciseInput): boolean {
    requireExercise(input.id)
    const programReference = getSqlite()
      .prepare('SELECT 1 FROM workout_program_exercises WHERE exercise_id = ? LIMIT 1')
      .get(input.id)
    if (programReference)
      throw new Error('Упражнение используется в программе. Сначала удалите его из программы.')
    return (
      getSqlite().prepare('DELETE FROM workout_exercises WHERE id = ?').run(input.id).changes > 0
    )
  }

  function insertProgramItems(programId: string, exercises: WorkoutProgramExerciseInput[]): void {
    const statement = getSqlite().prepare(`INSERT INTO workout_program_exercises
      (id, program_id, exercise_id, position, planned_sets, target_reps, notes)
      VALUES (?, ?, ?, ?, 1, NULL, '')`)
    exercises.forEach((item, index) => {
      requireExercise(item.exerciseId)
      statement.run(runtime.createId(), programId, item.exerciseId, index)
    })
  }
  function createProgram(input: CreateWorkoutProgramInput): WorkoutProgramRecord {
    ensureUniqueProgramName(input.name)
    input.exercises.forEach((item) => requireExercise(item.exerciseId))
    const id = runtime.createId()
    const now = runtime.now()
    getSqlite().transaction(() => {
      getSqlite()
        .prepare(
          `INSERT INTO workout_programs (id, name, description, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(id, input.name.trim(), input.description, input.status, now, now)
      insertProgramItems(id, input.exercises)
    })()
    return requireProgram(id)
  }
  function updateProgram(input: UpdateWorkoutProgramInput): WorkoutProgramRecord {
    requireProgramRow(input.id)
    ensureUniqueProgramName(input.name, input.id)
    input.exercises.forEach((item) => requireExercise(item.exerciseId))
    getSqlite().transaction(() => {
      getSqlite()
        .prepare(
          'UPDATE workout_programs SET name = ?, description = ?, status = ?, updated_at = ? WHERE id = ?'
        )
        .run(input.name.trim(), input.description, input.status, runtime.now(), input.id)
      getSqlite()
        .prepare('DELETE FROM workout_program_exercises WHERE program_id = ?')
        .run(input.id)
      insertProgramItems(input.id, input.exercises)
    })()
    return requireProgram(input.id)
  }
  function deleteProgram(input: DeleteWorkoutProgramInput): boolean {
    requireProgramRow(input.id)
    return (
      getSqlite().prepare('DELETE FROM workout_programs WHERE id = ?').run(input.id).changes > 0
    )
  }

  function insertSessionExercises(
    sessionId: string,
    exercises: WorkoutSessionExerciseInput[]
  ): void {
    const exerciseStatement = getSqlite().prepare(`INSERT INTO workout_session_exercises
      (id, session_id, exercise_id, exercise_title_snapshot, muscle_group_snapshot, uses_external_weight_snapshot, position, comment)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    const setStatement = getSqlite().prepare(`INSERT INTO workout_sets
      (id, session_exercise_id, position, reps, weight_milli_kg) VALUES (?, ?, ?, ?, ?)`)
    exercises.forEach((item, exerciseIndex) => {
      const exercise = requireExercise(item.exerciseId)
      const sessionExerciseId = runtime.createId()
      exerciseStatement.run(
        sessionExerciseId,
        sessionId,
        exercise.id,
        exercise.title,
        serializeMuscleGroups(exercise.muscleGroups),
        exercise.usesExternalWeight ? 1 : 0,
        exerciseIndex,
        item.comment
      )
      item.sets.forEach((set, setIndex) => {
        setStatement.run(
          runtime.createId(),
          sessionExerciseId,
          setIndex,
          set.reps,
          toMilliKg(exercise.usesExternalWeight ? set.weightKg : 0)
        )
      })
    })
  }
  function createSession(input: CreateWorkoutSessionInput): WorkoutSessionRecord {
    input.exercises.forEach((item) => requireExercise(item.exerciseId))
    const programName = input.programId === null ? null : requireProgramRow(input.programId).name
    const id = runtime.createId()
    const now = runtime.now()
    getSqlite().transaction(() => {
      getSqlite()
        .prepare(
          `INSERT INTO workout_sessions
        (id, program_id, program_name_snapshot, title, date, duration_minutes, comment, created_at, updated_at)
        VALUES (?, ?, ?, '', ?, ?, ?, ?, ?)`
        )
        .run(
          id,
          input.programId,
          programName,
          input.date,
          input.durationMinutes,
          input.comment,
          now,
          now
        )
      insertSessionExercises(id, input.exercises)
    })()
    return getSession(id)
  }
  function updateSession(input: UpdateWorkoutSessionInput): WorkoutSessionRecord {
    getSession(input.id)
    input.exercises.forEach((item) => requireExercise(item.exerciseId))
    const programName = input.programId === null ? null : requireProgramRow(input.programId).name
    getSqlite().transaction(() => {
      getSqlite()
        .prepare(
          `UPDATE workout_sessions SET program_id = ?, program_name_snapshot = ?, title = '', date = ?, duration_minutes = ?, comment = ?, updated_at = ? WHERE id = ?`
        )
        .run(
          input.programId,
          programName,
          input.date,
          input.durationMinutes,
          input.comment,
          runtime.now(),
          input.id
        )
      getSqlite()
        .prepare('DELETE FROM workout_session_exercises WHERE session_id = ?')
        .run(input.id)
      insertSessionExercises(input.id, input.exercises)
    })()
    return getSession(input.id)
  }
  function deleteSession(input: DeleteWorkoutSessionInput): boolean {
    getSession(input.id)
    return (
      getSqlite().prepare('DELETE FROM workout_sessions WHERE id = ?').run(input.id).changes > 0
    )
  }

  function insertProgressMetrics(entryId: string, metrics: WorkoutProgressMetricInput[]): void {
    const statement = getSqlite().prepare(`INSERT INTO workout_progress_metrics
      (id, entry_id, exercise_id, exercise_title_snapshot, muscle_group_snapshot, uses_external_weight_snapshot, weight_milli_kg, reps, comment, position)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    metrics.forEach((metric, index) => {
      const exercise = requireExercise(metric.exerciseId)
      statement.run(
        runtime.createId(),
        entryId,
        exercise.id,
        exercise.title,
        serializeMuscleGroups(exercise.muscleGroups),
        exercise.usesExternalWeight ? 1 : 0,
        toMilliKg(exercise.usesExternalWeight ? metric.weightKg : 0),
        metric.reps,
        metric.comment,
        index
      )
    })
  }
  function createProgressEntry(input: CreateWorkoutProgressEntryInput): WorkoutProgressEntryRecord {
    input.metrics.forEach((metric) => requireExercise(metric.exerciseId))
    const id = runtime.createId()
    const now = runtime.now()
    getSqlite().transaction(() => {
      getSqlite()
        .prepare(
          `INSERT INTO workout_progress_entries
        (id, date, body_weight_milli_kg, wellbeing, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          id,
          input.date,
          input.bodyWeightKg === null ? null : toMilliKg(input.bodyWeightKg),
          input.wellbeing,
          input.notes,
          now,
          now
        )
      insertProgressMetrics(id, input.metrics)
    })()
    return getProgressEntry(id)
  }
  function updateProgressEntry(input: UpdateWorkoutProgressEntryInput): WorkoutProgressEntryRecord {
    requireProgressEntryRow(input.id)
    input.metrics.forEach((metric) => requireExercise(metric.exerciseId))
    getSqlite().transaction(() => {
      getSqlite()
        .prepare(
          `UPDATE workout_progress_entries
        SET date = ?, body_weight_milli_kg = ?, wellbeing = ?, notes = ?, updated_at = ? WHERE id = ?`
        )
        .run(
          input.date,
          input.bodyWeightKg === null ? null : toMilliKg(input.bodyWeightKg),
          input.wellbeing,
          input.notes,
          runtime.now(),
          input.id
        )
      getSqlite().prepare('DELETE FROM workout_progress_metrics WHERE entry_id = ?').run(input.id)
      insertProgressMetrics(input.id, input.metrics)
    })()
    return getProgressEntry(input.id)
  }
  function deleteProgressEntry(input: DeleteWorkoutProgressEntryInput): boolean {
    const entry = getProgressEntry(input.id)
    const result = getSqlite()
      .prepare('DELETE FROM workout_progress_entries WHERE id = ?')
      .run(input.id)
    if (result.changes > 0 && hooks.deleteProgressPhotoAsset) {
      for (const photo of entry.photos)
        void hooks.deleteProgressPhotoAsset(photo).catch(() => undefined)
    }
    return result.changes > 0
  }
  function getProgressPhoto(id: string): WorkoutProgressPhotoRecord {
    const row = getSqlite().prepare(`${PROGRESS_PHOTO_SELECT} WHERE id = ?`).get(id) as
      ProgressPhotoRow | undefined
    if (!row) throw new Error('Фотография прогресса не найдена')
    return mapPhoto(row)
  }
  async function importProgressPhoto(
    input: ImportWorkoutProgressPhotoInput
  ): Promise<WorkoutProgressPhotoRecord | null> {
    const entry = getProgressEntry(input.entryId)
    if (!hooks.importProgressPhoto) return null
    const asset = await hooks.importProgressPhoto(input.entryId, input.view)
    if (!asset) return null
    const id = runtime.createId()
    const createdAt = runtime.now()
    const imported: WorkoutProgressPhotoRecord = {
      id,
      entryId: input.entryId,
      assetId: asset.id,
      fileName: asset.name,
      mimeType: asset.mimeType,
      size: asset.size,
      url: asset.url,
      view: input.view,
      createdAt
    }
    const replaced =
      input.view === 'custom' ? [] : entry.photos.filter((photo) => photo.view === input.view)
    try {
      getSqlite().transaction(() => {
        getSqlite()
          .prepare(
            `INSERT INTO workout_progress_photos
          (id, entry_id, asset_id, file_name, mime_type, size, url, view, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            id,
            input.entryId,
            asset.id,
            asset.name,
            asset.mimeType,
            asset.size,
            asset.url,
            input.view,
            createdAt
          )
        for (const photo of replaced)
          getSqlite().prepare('DELETE FROM workout_progress_photos WHERE id = ?').run(photo.id)
      })()
    } catch (reason) {
      await hooks.deleteProgressPhotoAsset?.(imported).catch(() => undefined)
      throw reason
    }
    if (hooks.deleteProgressPhotoAsset)
      for (const photo of replaced)
        await hooks.deleteProgressPhotoAsset(photo).catch(() => undefined)
    return getProgressPhoto(id)
  }
  async function deleteProgressPhoto(input: DeleteWorkoutProgressPhotoInput): Promise<boolean> {
    const photo = getProgressPhoto(input.id)
    const result = getSqlite()
      .prepare('DELETE FROM workout_progress_photos WHERE id = ?')
      .run(input.id)
    if (result.changes > 0 && hooks.deleteProgressPhotoAsset)
      await hooks.deleteProgressPhotoAsset(photo)
    return result.changes > 0
  }

  function getReport(input: WorkoutReportInput): WorkoutReport {
    const sessions = loadSessions()
      .filter((session) => session.date >= input.dateFrom && session.date <= input.dateTo)
      .filter((session) =>
        input.programId === null
          ? true
          : input.programId === 'custom'
            ? session.programId === null
            : session.programId === input.programId
      )
      .map((session) => ({
        ...session,
        exercises: session.exercises.filter((exercise) => {
          if (input.exerciseId !== null && exercise.exerciseId !== input.exerciseId) return false
          if (input.muscleGroup !== null && !exercise.muscleGroups.includes(input.muscleGroup))
            return false
          return true
        })
      }))
      .filter((session) => session.exercises.length > 0)

    interface ExerciseAccumulator {
      exerciseId: string | null
      title: string
      muscleGroup: WorkoutMuscleGroup
      muscleGroups: WorkoutMuscleGroup[]
      usesExternalWeight: boolean
      sessionIds: Set<string>
      sets: number
      reps: number
      volumeKg: number
      weightTotal: number
      maxWeightKg: number
      estimatedOneRepMax: number
      observations: Array<{ date: string; weightKg: number; reps: number }>
    }
    const muscleMap = new Map<WorkoutMuscleGroup, WorkoutReportMuscleGroup>(
      WORKOUT_MUSCLE_ZONES.map((muscleGroup) => [
        muscleGroup,
        { muscleGroup, exercises: 0, sets: 0, reps: 0, volumeKg: 0, loadPercent: 0 }
      ])
    )
    const muscleExerciseIds = new Map<WorkoutMuscleGroup, Set<string>>(
      WORKOUT_MUSCLE_ZONES.map((group) => [group, new Set<string>()])
    )
    const exerciseMap = new Map<string, ExerciseAccumulator>()
    const programMap = new Map<string, WorkoutReportProgram>()
    const dayMap = new Map<string, WorkoutReportDay>()
    let totalWeight = 0
    let weightedSets = 0
    let maxWeightKg = 0
    let externalWeightSets = 0
    let externalWeightReps = 0
    let bodyweightSets = 0
    let bodyweightReps = 0

    for (const session of sessions) {
      const day = dayMap.get(session.date) ?? {
        date: session.date,
        sessions: 0,
        sets: 0,
        reps: 0,
        externalWeightSets: 0,
        bodyweightSets: 0,
        volumeKg: 0,
        durationMinutes: 0
      }
      day.sessions += 1
      day.durationMinutes += session.durationMinutes ?? 0
      dayMap.set(session.date, day)

      const programKey = session.programId ?? '__custom__'
      const program = programMap.get(programKey) ?? {
        programId: session.programId,
        name: session.programName ?? 'Свободная тренировка',
        sessions: 0,
        sets: 0,
        reps: 0,
        externalWeightSets: 0,
        bodyweightSets: 0,
        volumeKg: 0,
        durationMinutes: 0
      }
      program.sessions += 1
      program.durationMinutes += session.durationMinutes ?? 0
      programMap.set(programKey, program)

      for (const exercise of session.exercises) {
        const identity =
          exercise.exerciseId ?? `${exercise.exerciseTitle}:${exercise.muscleGroups.join(',')}`
        const key = `${identity}:${exercise.usesExternalWeight ? 'external' : 'bodyweight'}`
        const accumulator = exerciseMap.get(key) ?? {
          exerciseId: exercise.exerciseId,
          title: exercise.exerciseTitle,
          muscleGroup: exercise.muscleGroup,
          muscleGroups: exercise.muscleGroups,
          usesExternalWeight: exercise.usesExternalWeight,
          sessionIds: new Set<string>(),
          sets: 0,
          reps: 0,
          volumeKg: 0,
          weightTotal: 0,
          maxWeightKg: 0,
          estimatedOneRepMax: 0,
          observations: []
        }
        accumulator.sessionIds.add(session.id)
        exercise.muscleGroups.forEach((group) => muscleExerciseIds.get(group)?.add(identity))
        for (const set of exercise.sets) {
          const volume = exercise.usesExternalWeight ? set.reps * set.weightKg : 0
          accumulator.sets += 1
          accumulator.reps += set.reps
          accumulator.volumeKg += volume
          accumulator.observations.push({
            date: session.date,
            weightKg: set.weightKg,
            reps: set.reps
          })
          if (exercise.usesExternalWeight) {
            accumulator.weightTotal += set.weightKg
            accumulator.maxWeightKg = Math.max(accumulator.maxWeightKg, set.weightKg)
            accumulator.estimatedOneRepMax = Math.max(
              accumulator.estimatedOneRepMax,
              estimatedOneRepMax(set.weightKg, set.reps)
            )
            totalWeight += set.weightKg
            weightedSets += 1
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
          for (const group of exercise.muscleGroups) {
            const muscle = muscleMap.get(group)
            if (muscle) {
              muscle.sets += 1
              muscle.reps += set.reps
              muscle.volumeKg += volume
            }
          }
          program.sets += 1
          program.reps += set.reps
          program.volumeKg += volume
          day.sets += 1
          day.reps += set.reps
          day.volumeKg += volume
        }
        exerciseMap.set(key, accumulator)
      }
    }

    const totalAttributedSets = [...muscleMap.values()].reduce(
      (sum, muscle) => sum + muscle.sets,
      0
    )
    for (const group of WORKOUT_MUSCLE_ZONES) {
      const muscle = muscleMap.get(group)
      if (!muscle) continue
      muscle.exercises = muscleExerciseIds.get(group)?.size ?? 0
      muscle.volumeKg = round2(muscle.volumeKg)
      muscle.loadPercent = totalAttributedSets
        ? round2((muscle.sets / totalAttributedSets) * 100)
        : 0
    }

    const reportExercises: WorkoutReportExercise[] = [...exerciseMap.values()]
      .map((exercise) => {
        const sorted = [...exercise.observations].sort((a, b) => a.date.localeCompare(b.date))
        const firstDate = sorted[0]?.date
        const lastDate = sorted.at(-1)?.date
        const first = sorted.filter((item) => item.date === firstDate)
        const last = sorted.filter((item) => item.date === lastDate)
        const firstWeight = Math.max(0, ...first.map((item) => item.weightKg))
        const lastWeight = Math.max(0, ...last.map((item) => item.weightKg))
        const firstReps = Math.max(0, ...first.map((item) => item.reps))
        const lastReps = Math.max(0, ...last.map((item) => item.reps))
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
            exercise.usesExternalWeight && exercise.sets
              ? round2(exercise.weightTotal / exercise.sets)
              : 0,
          maxWeightKg: round2(exercise.maxWeightKg),
          estimatedOneRepMax: round2(exercise.estimatedOneRepMax),
          firstBestWeightKg: round2(firstWeight),
          lastBestWeightKg: round2(lastWeight),
          weightChangeKg: round2(lastWeight - firstWeight),
          bestSetReps: Math.max(0, ...sorted.map((item) => item.reps)),
          firstBestReps: firstReps,
          lastBestReps: lastReps,
          repsChange: lastReps - firstReps
        }
      })
      .sort((a, b) => b.volumeKg - a.volumeKg || b.sets - a.sets)

    const personalRecords: WorkoutPersonalRecord[] = [...exerciseMap.values()]
      .filter((exercise) => exercise.usesExternalWeight)
      .map((exercise) => {
        const best = exercise.observations.reduce<{
          date: string
          weightKg: number
          reps: number
          score: number
        } | null>((current, observation) => {
          const score = estimatedOneRepMax(observation.weightKg, observation.reps)
          return !current || score > current.score ? { ...observation, score } : current
        }, null)
        return best && best.score > 0
          ? {
              exerciseId: exercise.exerciseId,
              title: exercise.title,
              muscleGroup: exercise.muscleGroup,
              muscleGroups: exercise.muscleGroups,
              date: best.date,
              weightKg: best.weightKg,
              reps: best.reps,
              estimatedOneRepMax: best.score
            }
          : null
      })
      .filter((record): record is WorkoutPersonalRecord => record !== null)
      .sort((a, b) => b.estimatedOneRepMax - a.estimatedOneRepMax)

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
        return best
          ? {
              exerciseId: exercise.exerciseId,
              title: exercise.title,
              muscleGroup: exercise.muscleGroup,
              muscleGroups: exercise.muscleGroups,
              date: best.date,
              reps: best.reps
            }
          : null
      })
      .filter((record): record is WorkoutBodyweightRecord => record !== null)
      .sort((a, b) => b.reps - a.reps)

    const sets = sessions.flatMap((session) =>
      session.exercises.flatMap((exercise) => exercise.sets)
    )
    const reps = sets.reduce((sum, set) => sum + set.reps, 0)
    const volumeKg = round2(sets.reduce((sum, set) => sum + set.reps * set.weightKg, 0))
    const durationMinutes = sessions.reduce(
      (sum, session) => sum + (session.durationMinutes ?? 0),
      0
    )
    const sessionCount = sessions.length
    return {
      dateFrom: input.dateFrom,
      dateTo: input.dateTo,
      summary: {
        sessions: sessionCount,
        activeDays: new Set(sessions.map((session) => session.date)).size,
        exercises: exerciseMap.size,
        sets: sets.length,
        reps,
        externalWeightSets,
        externalWeightReps,
        bodyweightSets,
        bodyweightReps,
        volumeKg,
        durationMinutes,
        averageDurationMinutes: sessionCount ? round2(durationMinutes / sessionCount) : 0,
        averageSetsPerSession: sessionCount ? round2(sets.length / sessionCount) : 0,
        averageRepsPerSession: sessionCount ? round2(reps / sessionCount) : 0,
        averageVolumeKgPerSession: sessionCount ? round2(volumeKg / sessionCount) : 0,
        averageWeightKg: weightedSets ? round2(totalWeight / weightedSets) : 0,
        maxWeightKg: round2(maxWeightKg)
      },
      muscleGroups: [...muscleMap.values()].filter((muscle) => muscle.sets > 0),
      exercises: reportExercises,
      programs: [...programMap.values()].map((program) => ({
        ...program,
        volumeKg: round2(program.volumeKg)
      })),
      timeline: [...dayMap.values()]
        .map((day) => ({ ...day, volumeKg: round2(day.volumeKg) }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      personalRecords,
      bodyweightRecords
    }
  }

  return {
    listOverview,
    createExercise,
    updateExercise,
    deleteExercise,
    createProgram,
    updateProgram,
    deleteProgram,
    createSession,
    updateSession,
    deleteSession,
    getSession,
    createProgressEntry,
    updateProgressEntry,
    deleteProgressEntry,
    importProgressPhoto,
    deleteProgressPhoto,
    getReport
  }
}

export interface WorkoutsRepository {
  listOverview(): WorkoutsOverview
  createExercise(input: CreateWorkoutExerciseInput): WorkoutExerciseRecord
  updateExercise(input: UpdateWorkoutExerciseInput): WorkoutExerciseRecord
  deleteExercise(input: DeleteWorkoutExerciseInput): boolean
  createProgram(input: CreateWorkoutProgramInput): WorkoutProgramRecord
  updateProgram(input: UpdateWorkoutProgramInput): WorkoutProgramRecord
  deleteProgram(input: DeleteWorkoutProgramInput): boolean
  createSession(input: CreateWorkoutSessionInput): WorkoutSessionRecord
  updateSession(input: UpdateWorkoutSessionInput): WorkoutSessionRecord
  deleteSession(input: DeleteWorkoutSessionInput): boolean
  getSession(id: string): WorkoutSessionRecord
  createProgressEntry(input: CreateWorkoutProgressEntryInput): WorkoutProgressEntryRecord
  updateProgressEntry(input: UpdateWorkoutProgressEntryInput): WorkoutProgressEntryRecord
  deleteProgressEntry(input: DeleteWorkoutProgressEntryInput): boolean
  importProgressPhoto(
    input: ImportWorkoutProgressPhotoInput
  ): Promise<WorkoutProgressPhotoRecord | null>
  deleteProgressPhoto(input: DeleteWorkoutProgressPhotoInput): Promise<boolean>
  getReport(input: WorkoutReportInput): WorkoutReport
}
