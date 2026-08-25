import { randomUUID } from 'node:crypto'

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
  UpdateWorkoutExerciseInput,
  UpdateWorkoutProgramInput,
  UpdateWorkoutProgressEntryInput,
  UpdateWorkoutSessionInput,
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
} from '../../shared/contracts/workouts'
import { WORKOUT_MUSCLE_GROUPS, WORKOUT_MUSCLE_ZONES } from '../../shared/contracts/workouts'
import { getSqlite } from '../database/client'

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
  planned_sets: number
  target_reps: number | null
  notes: string
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
  created_at: number
}

const EXERCISE_SELECT = `SELECT id, title, muscle_group, uses_external_weight, description, status, created_at, updated_at FROM workout_exercises`
const PROGRAM_SELECT = `SELECT id, name, description, status, created_at, updated_at FROM workout_programs`
const PROGRAM_EXERCISE_SELECT = `SELECT id, program_id, exercise_id, position, planned_sets, target_reps, notes FROM workout_program_exercises`
const SESSION_SELECT = `SELECT id, program_id, program_name_snapshot, date, duration_minutes, comment, created_at, updated_at FROM workout_sessions`
const SESSION_EXERCISE_SELECT = `SELECT id, session_id, exercise_id, exercise_title_snapshot, muscle_group_snapshot, uses_external_weight_snapshot, position, comment FROM workout_session_exercises`
const SET_SELECT = `SELECT id, session_exercise_id, position, reps, weight_milli_kg FROM workout_sets`
const PROGRESS_ENTRY_SELECT = `SELECT id, date, body_weight_milli_kg, wellbeing, notes, created_at, updated_at FROM workout_progress_entries`
const PROGRESS_METRIC_SELECT = `SELECT id, entry_id, exercise_id, exercise_title_snapshot, muscle_group_snapshot, weight_milli_kg, reps, comment, position FROM workout_progress_metrics`
const PROGRESS_PHOTO_SELECT = `SELECT id, entry_id, asset_id, file_name, mime_type, size, url, created_at FROM workout_progress_photos`

function toMilliKg(value: number): number {
  return Math.round(value * 1000)
}

function fromMilliKg(value: number): number {
  return Math.round((value / 1000) * 1000) / 1000
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

const workoutMuscleGroupSet = new Set<string>(WORKOUT_MUSCLE_GROUPS)

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
    // Existing databases store one plain-text muscle group in this column.
  }
  const values = Array.isArray(value) ? value : [value]
  const normalized = values
    .filter(
      (candidate): candidate is WorkoutMuscleGroup =>
        typeof candidate === 'string' && workoutMuscleGroupSet.has(candidate)
    )
    .flatMap(expandLegacyMuscleGroup)
  const unique = [...new Set(normalized)]
  return unique.length > 0 ? unique : ['shoulders']
}

function serializeMuscleGroups(groups: WorkoutMuscleGroup[]): string {
  const normalized = groups
    .filter((group) => workoutMuscleGroupSet.has(group))
    .flatMap(expandLegacyMuscleGroup)
  const unique = [...new Set(normalized)]
  if (unique.length === 0) throw new Error('Выберите хотя бы одну мышечную зону')
  return JSON.stringify(unique)
}

function primaryMuscleGroup(groups: WorkoutMuscleGroup[]): WorkoutMuscleGroup {
  return groups[0] ?? 'shoulders'
}

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

function mapProgramExercise(row: ProgramExerciseRow): WorkoutProgramExerciseRecord {
  return {
    id: row.id,
    exerciseId: row.exercise_id,
    position: row.position
  }
}

function mapProgressPhoto(row: ProgressPhotoRow): WorkoutProgressPhotoRecord {
  return {
    id: row.id,
    entryId: row.entry_id,
    assetId: row.asset_id,
    fileName: row.file_name,
    mimeType: row.mime_type,
    size: row.size,
    url: row.url,
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
  ) {
    throw new Error('Упражнение с таким названием уже существует')
  }
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
  ) {
    throw new Error('Программа с таким названием уже существует')
  }
}

function loadPrograms(): WorkoutProgramRecord[] {
  const sqlite = getSqlite()
  const rows = sqlite
    .prepare(
      `${PROGRAM_SELECT} ORDER BY CASE status WHEN 'active' THEN 0 ELSE 1 END, updated_at DESC`
    )
    .all() as ProgramRow[]
  const itemRows = sqlite
    .prepare(`${PROGRAM_EXERCISE_SELECT} ORDER BY program_id, position`)
    .all() as ProgramExerciseRow[]
  const itemsByProgram = new Map<string, WorkoutProgramExerciseRecord[]>()
  for (const row of itemRows) {
    const list = itemsByProgram.get(row.program_id) ?? []
    list.push(mapProgramExercise(row))
    itemsByProgram.set(row.program_id, list)
  }

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    status: row.status,
    exercises: itemsByProgram.get(row.id) ?? [],
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
  const sqlite = getSqlite()
  const sessionRows = sqlite
    .prepare(`${SESSION_SELECT} ORDER BY date DESC, created_at DESC`)
    .all() as SessionRow[]
  const exerciseRows = sqlite
    .prepare(`${SESSION_EXERCISE_SELECT} ORDER BY session_id, position`)
    .all() as SessionExerciseRow[]
  const setRows = sqlite
    .prepare(`${SET_SELECT} ORDER BY session_exercise_id, position`)
    .all() as SetRow[]

  const setsByExercise = new Map<string, WorkoutSetRecord[]>()
  for (const row of setRows) {
    const list = setsByExercise.get(row.session_exercise_id) ?? []
    list.push(mapSet(row))
    setsByExercise.set(row.session_exercise_id, list)
  }

  const exercisesBySession = new Map<string, WorkoutSessionExerciseRecord[]>()
  for (const row of exerciseRows) {
    const list = exercisesBySession.get(row.session_id) ?? []
    list.push({
      id: row.id,
      exerciseId: row.exercise_id,
      exerciseTitle: row.exercise_title_snapshot,
      muscleGroup: primaryMuscleGroup(parseMuscleGroups(row.muscle_group_snapshot)),
      muscleGroups: parseMuscleGroups(row.muscle_group_snapshot),
      usesExternalWeight: Boolean(row.uses_external_weight_snapshot),
      position: row.position,
      comment: row.comment,
      sets: setsByExercise.get(row.id) ?? []
    })
    exercisesBySession.set(row.session_id, list)
  }

  return sessionRows.map((row) => {
    const exercises = exercisesBySession.get(row.id) ?? []
    const sets = exercises.flatMap((exercise) => exercise.sets)
    return {
      id: row.id,
      programId: row.program_id,
      programName: row.program_name_snapshot,
      date: row.date,
      durationMinutes: row.duration_minutes,
      comment: row.comment,
      exercises,
      totalSets: sets.length,
      totalReps: sets.reduce((sum, set) => sum + set.reps, 0),
      totalVolumeKg: round2(sets.reduce((sum, set) => sum + set.reps * set.weightKg, 0)),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  })
}

export function getWorkoutSession(id: string): WorkoutSessionRecord {
  const session = loadSessions().find((candidate) => candidate.id === id)
  if (!session) throw new Error('Запись тренировки не найдена')
  return session
}

function loadProgressEntries(): WorkoutProgressEntryRecord[] {
  const sqlite = getSqlite()
  const entryRows = sqlite
    .prepare(`${PROGRESS_ENTRY_SELECT} ORDER BY date DESC, created_at DESC`)
    .all() as ProgressEntryRow[]
  const metricRows = sqlite
    .prepare(`${PROGRESS_METRIC_SELECT} ORDER BY entry_id, position`)
    .all() as ProgressMetricRow[]
  const photoRows = sqlite
    .prepare(`${PROGRESS_PHOTO_SELECT} ORDER BY entry_id, created_at`)
    .all() as ProgressPhotoRow[]

  const metricsByEntry = new Map<string, WorkoutProgressMetricRecord[]>()
  for (const row of metricRows) {
    const list = metricsByEntry.get(row.entry_id) ?? []
    list.push({
      id: row.id,
      exerciseId: row.exercise_id,
      exerciseTitle: row.exercise_title_snapshot,
      muscleGroup: primaryMuscleGroup(parseMuscleGroups(row.muscle_group_snapshot)),
      muscleGroups: parseMuscleGroups(row.muscle_group_snapshot),
      weightKg: fromMilliKg(row.weight_milli_kg),
      reps: row.reps,
      comment: row.comment
    })
    metricsByEntry.set(row.entry_id, list)
  }

  const photosByEntry = new Map<string, WorkoutProgressPhotoRecord[]>()
  for (const row of photoRows) {
    const list = photosByEntry.get(row.entry_id) ?? []
    list.push(mapProgressPhoto(row))
    photosByEntry.set(row.entry_id, list)
  }

  return entryRows.map((row) => ({
    id: row.id,
    date: row.date,
    bodyWeightKg: row.body_weight_milli_kg === null ? null : fromMilliKg(row.body_weight_milli_kg),
    wellbeing: row.wellbeing,
    notes: row.notes,
    metrics: metricsByEntry.get(row.id) ?? [],
    photos: photosByEntry.get(row.id) ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }))
}

export function getWorkoutProgressEntry(id: string): WorkoutProgressEntryRecord {
  const entry = loadProgressEntries().find((candidate) => candidate.id === id)
  if (!entry) throw new Error('Запись прогресса не найдена')
  return entry
}

export function listWorkoutsOverview(): WorkoutsOverview {
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

export function createWorkoutExercise(input: CreateWorkoutExerciseInput): WorkoutExerciseRecord {
  ensureUniqueExerciseTitle(input.title)
  const id = randomUUID()
  const now = Date.now()
  getSqlite()
    .prepare(
      `INSERT INTO workout_exercises (id, title, muscle_group, uses_external_weight, description, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      input.title.trim(),
      serializeMuscleGroups(input.muscleGroups),
      input.usesExternalWeight ? 1 : 0,
      '',
      input.status,
      now,
      now
    )
  return requireExercise(id)
}

export function updateWorkoutExercise(input: UpdateWorkoutExerciseInput): WorkoutExerciseRecord {
  requireExercise(input.id)
  ensureUniqueExerciseTitle(input.title, input.id)
  getSqlite()
    .prepare(
      `UPDATE workout_exercises
       SET title = ?, muscle_group = ?, uses_external_weight = ?, description = ?, status = ?, updated_at = ?
       WHERE id = ?`
    )
    .run(
      input.title.trim(),
      serializeMuscleGroups(input.muscleGroups),
      input.usesExternalWeight ? 1 : 0,
      '',
      input.status,
      Date.now(),
      input.id
    )
  return requireExercise(input.id)
}

export function deleteWorkoutExercise(input: DeleteWorkoutExerciseInput): boolean {
  requireExercise(input.id)
  const programReference = getSqlite()
    .prepare('SELECT 1 FROM workout_program_exercises WHERE exercise_id = ? LIMIT 1')
    .get(input.id)
  if (programReference) {
    throw new Error('Упражнение используется в программе. Сначала удалите его из программы.')
  }
  const result = getSqlite().prepare('DELETE FROM workout_exercises WHERE id = ?').run(input.id)
  return result.changes > 0
}

function insertProgramItems(programId: string, exercises: WorkoutProgramExerciseInput[]): void {
  const statement = getSqlite().prepare(
    `INSERT INTO workout_program_exercises
      (id, program_id, exercise_id, position, planned_sets, target_reps, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
  exercises.forEach((item, index) => {
    requireExercise(item.exerciseId)
    statement.run(randomUUID(), programId, item.exerciseId, index, 1, null, '')
  })
}

export function createWorkoutProgram(input: CreateWorkoutProgramInput): WorkoutProgramRecord {
  ensureUniqueProgramName(input.name)
  input.exercises.forEach((item) => requireExercise(item.exerciseId))
  const id = randomUUID()
  const now = Date.now()
  const transaction = getSqlite().transaction(() => {
    getSqlite()
      .prepare(
        `INSERT INTO workout_programs (id, name, description, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(id, input.name.trim(), input.description, input.status, now, now)
    insertProgramItems(id, input.exercises)
  })
  transaction()
  return requireProgram(id)
}

export function updateWorkoutProgram(input: UpdateWorkoutProgramInput): WorkoutProgramRecord {
  requireProgramRow(input.id)
  ensureUniqueProgramName(input.name, input.id)
  input.exercises.forEach((item) => requireExercise(item.exerciseId))
  const transaction = getSqlite().transaction(() => {
    getSqlite()
      .prepare(
        `UPDATE workout_programs SET name = ?, description = ?, status = ?, updated_at = ? WHERE id = ?`
      )
      .run(input.name.trim(), input.description, input.status, Date.now(), input.id)
    getSqlite().prepare('DELETE FROM workout_program_exercises WHERE program_id = ?').run(input.id)
    insertProgramItems(input.id, input.exercises)
  })
  transaction()
  return requireProgram(input.id)
}

export function deleteWorkoutProgram(input: DeleteWorkoutProgramInput): boolean {
  requireProgramRow(input.id)
  const result = getSqlite().prepare('DELETE FROM workout_programs WHERE id = ?').run(input.id)
  return result.changes > 0
}

function insertSessionExercises(sessionId: string, exercises: WorkoutSessionExerciseInput[]): void {
  const exerciseStatement = getSqlite().prepare(
    `INSERT INTO workout_session_exercises
      (id, session_id, exercise_id, exercise_title_snapshot, muscle_group_snapshot, uses_external_weight_snapshot, position, comment)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
  const setStatement = getSqlite().prepare(
    `INSERT INTO workout_sets (id, session_exercise_id, position, reps, weight_milli_kg)
     VALUES (?, ?, ?, ?, ?)`
  )

  exercises.forEach((item, exerciseIndex) => {
    const exercise = requireExercise(item.exerciseId)
    const sessionExerciseId = randomUUID()
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
      const weightKg = exercise.usesExternalWeight ? set.weightKg : 0
      setStatement.run(randomUUID(), sessionExerciseId, setIndex, set.reps, toMilliKg(weightKg))
    })
  })
}

function resolveProgramSnapshot(programId: string | null): string | null {
  return programId === null ? null : requireProgramRow(programId).name
}

export function createWorkoutSession(input: CreateWorkoutSessionInput): WorkoutSessionRecord {
  input.exercises.forEach((item) => requireExercise(item.exerciseId))
  const programName = resolveProgramSnapshot(input.programId)
  const id = randomUUID()
  const now = Date.now()
  const transaction = getSqlite().transaction(() => {
    getSqlite()
      .prepare(
        `INSERT INTO workout_sessions
          (id, program_id, program_name_snapshot, title, date, duration_minutes, comment, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        input.programId,
        programName,
        '',
        input.date,
        input.durationMinutes,
        input.comment,
        now,
        now
      )
    insertSessionExercises(id, input.exercises)
  })
  transaction()
  return getWorkoutSession(id)
}

export function updateWorkoutSession(input: UpdateWorkoutSessionInput): WorkoutSessionRecord {
  getWorkoutSession(input.id)
  input.exercises.forEach((item) => requireExercise(item.exerciseId))
  const programName = resolveProgramSnapshot(input.programId)
  const transaction = getSqlite().transaction(() => {
    getSqlite()
      .prepare(
        `UPDATE workout_sessions
         SET program_id = ?, program_name_snapshot = ?, title = ?, date = ?, duration_minutes = ?, comment = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(
        input.programId,
        programName,
        '',
        input.date,
        input.durationMinutes,
        input.comment,
        Date.now(),
        input.id
      )
    getSqlite().prepare('DELETE FROM workout_session_exercises WHERE session_id = ?').run(input.id)
    insertSessionExercises(input.id, input.exercises)
  })
  transaction()
  return getWorkoutSession(input.id)
}

export function deleteWorkoutSession(input: DeleteWorkoutSessionInput): boolean {
  getWorkoutSession(input.id)
  const result = getSqlite().prepare('DELETE FROM workout_sessions WHERE id = ?').run(input.id)
  return result.changes > 0
}

function insertProgressMetrics(entryId: string, metrics: WorkoutProgressMetricInput[]): void {
  const statement = getSqlite().prepare(
    `INSERT INTO workout_progress_metrics
      (id, entry_id, exercise_id, exercise_title_snapshot, muscle_group_snapshot, weight_milli_kg, reps, comment, position)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
  metrics.forEach((metric, index) => {
    const exercise = requireExercise(metric.exerciseId)
    statement.run(
      randomUUID(),
      entryId,
      exercise.id,
      exercise.title,
      serializeMuscleGroups(exercise.muscleGroups),
      toMilliKg(metric.weightKg),
      metric.reps,
      metric.comment,
      index
    )
  })
}

export function createWorkoutProgressEntry(
  input: CreateWorkoutProgressEntryInput
): WorkoutProgressEntryRecord {
  input.metrics.forEach((metric) => requireExercise(metric.exerciseId))
  const id = randomUUID()
  const now = Date.now()
  const transaction = getSqlite().transaction(() => {
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
  })
  transaction()
  return getWorkoutProgressEntry(id)
}

export function updateWorkoutProgressEntry(
  input: UpdateWorkoutProgressEntryInput
): WorkoutProgressEntryRecord {
  requireProgressEntryRow(input.id)
  input.metrics.forEach((metric) => requireExercise(metric.exerciseId))
  const transaction = getSqlite().transaction(() => {
    getSqlite()
      .prepare(
        `UPDATE workout_progress_entries
         SET date = ?, body_weight_milli_kg = ?, wellbeing = ?, notes = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(
        input.date,
        input.bodyWeightKg === null ? null : toMilliKg(input.bodyWeightKg),
        input.wellbeing,
        input.notes,
        Date.now(),
        input.id
      )
    getSqlite().prepare('DELETE FROM workout_progress_metrics WHERE entry_id = ?').run(input.id)
    insertProgressMetrics(input.id, input.metrics)
  })
  transaction()
  return getWorkoutProgressEntry(input.id)
}

export function deleteWorkoutProgressEntry(input: DeleteWorkoutProgressEntryInput): boolean {
  requireProgressEntryRow(input.id)
  const result = getSqlite()
    .prepare('DELETE FROM workout_progress_entries WHERE id = ?')
    .run(input.id)
  return result.changes > 0
}

export function addWorkoutProgressPhoto(
  entryId: string,
  asset: { id: string; name: string; mimeType: string; size: number; url: string }
): WorkoutProgressPhotoRecord {
  requireProgressEntryRow(entryId)
  const id = randomUUID()
  const createdAt = Date.now()
  getSqlite()
    .prepare(
      `INSERT INTO workout_progress_photos
        (id, entry_id, asset_id, file_name, mime_type, size, url, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(id, entryId, asset.id, asset.name, asset.mimeType, asset.size, asset.url, createdAt)
  const row = getSqlite()
    .prepare(`${PROGRESS_PHOTO_SELECT} WHERE id = ?`)
    .get(id) as ProgressPhotoRow
  return mapProgressPhoto(row)
}

export function getWorkoutProgressPhoto(id: string): WorkoutProgressPhotoRecord {
  const row = getSqlite().prepare(`${PROGRESS_PHOTO_SELECT} WHERE id = ?`).get(id) as
    ProgressPhotoRow | undefined
  if (!row) throw new Error('Фотография прогресса не найдена')
  return mapProgressPhoto(row)
}

export function deleteWorkoutProgressPhoto(input: DeleteWorkoutProgressPhotoInput): boolean {
  getWorkoutProgressPhoto(input.id)
  const result = getSqlite()
    .prepare('DELETE FROM workout_progress_photos WHERE id = ?')
    .run(input.id)
  return result.changes > 0
}

function estimatedOneRepMax(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0
  return round2(weightKg * (1 + reps / 30))
}

interface ExerciseAccumulator {
  exerciseId: string | null
  title: string
  muscleGroup: WorkoutMuscleGroup
  muscleGroups: WorkoutMuscleGroup[]
  sessionIds: Set<string>
  sets: number
  reps: number
  volumeKg: number
  weightTotal: number
  maxWeightKg: number
  estimatedOneRepMax: number
  observations: Array<{ date: string; weightKg: number; reps: number }>
}

export function getWorkoutReport(input: WorkoutReportInput): WorkoutReport {
  const sessions = loadSessions()
    .filter((session) => session.date >= input.dateFrom && session.date <= input.dateTo)
    .filter((session) => input.programId === null || session.programId === input.programId)

  const filteredSessions = sessions
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

  const muscleMap = new Map<WorkoutMuscleGroup, WorkoutReportMuscleGroup>(
    WORKOUT_MUSCLE_ZONES.map((muscleGroup) => [
      muscleGroup,
      { muscleGroup, exercises: 0, sets: 0, reps: 0, volumeKg: 0, loadPercent: 0 }
    ])
  )
  const muscleExerciseIds = new Map<WorkoutMuscleGroup, Set<string>>()
  WORKOUT_MUSCLE_ZONES.forEach((group) => muscleExerciseIds.set(group, new Set()))

  const exerciseMap = new Map<string, ExerciseAccumulator>()
  const programMap = new Map<string, WorkoutReportProgram>()
  const dayMap = new Map<string, WorkoutReportDay>()
  let totalWeight = 0
  let totalSetCountForWeight = 0
  let maxWeightKg = 0

  for (const session of filteredSessions) {
    const day = dayMap.get(session.date) ?? {
      date: session.date,
      sessions: 0,
      sets: 0,
      reps: 0,
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
      volumeKg: 0,
      durationMinutes: 0
    }
    program.sessions += 1
    program.durationMinutes += session.durationMinutes ?? 0
    programMap.set(programKey, program)

    for (const exercise of session.exercises) {
      const exerciseKey =
        exercise.exerciseId ?? `${exercise.exerciseTitle}:${exercise.muscleGroups.join(',')}`
      const accumulator = exerciseMap.get(exerciseKey) ?? {
        exerciseId: exercise.exerciseId,
        title: exercise.exerciseTitle,
        muscleGroup: exercise.muscleGroup,
        muscleGroups: exercise.muscleGroups,
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
      exercise.muscleGroups.forEach((group) => muscleExerciseIds.get(group)?.add(exerciseKey))

      for (const set of exercise.sets) {
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
      exerciseMap.set(exerciseKey, accumulator)
    }
  }

  const totalAttributedSets = [...muscleMap.values()].reduce((sum, muscle) => sum + muscle.sets, 0)
  for (const group of WORKOUT_MUSCLE_ZONES) {
    const muscle = muscleMap.get(group)
    if (!muscle) continue
    muscle.exercises = muscleExerciseIds.get(group)?.size ?? 0
    muscle.volumeKg = round2(muscle.volumeKg)
    muscle.loadPercent =
      totalAttributedSets === 0 ? 0 : round2((muscle.sets / totalAttributedSets) * 100)
  }

  const reportExercises: WorkoutReportExercise[] = [...exerciseMap.values()]
    .map((exercise) => {
      const sorted = [...exercise.observations].sort((left, right) =>
        left.date.localeCompare(right.date)
      )
      const firstDate = sorted[0]?.date
      const lastDate = sorted.at(-1)?.date
      const firstBest = Math.max(
        0,
        ...sorted.filter((entry) => entry.date === firstDate).map((entry) => entry.weightKg)
      )
      const lastBest = Math.max(
        0,
        ...sorted.filter((entry) => entry.date === lastDate).map((entry) => entry.weightKg)
      )
      return {
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
    })
    .sort((left, right) => right.volumeKg - left.volumeKg || right.sets - left.sets)

  const personalRecords: WorkoutPersonalRecord[] = [...exerciseMap.values()]
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
      if (!best) return null
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

  const sets = reportExercises.reduce((sum, exercise) => sum + exercise.sets, 0)
  const reps = reportExercises.reduce((sum, exercise) => sum + exercise.reps, 0)
  const volumeKg = round2(reportExercises.reduce((sum, exercise) => sum + exercise.volumeKg, 0))
  const durationMinutes = filteredSessions.reduce(
    (sum, session) => sum + (session.durationMinutes ?? 0),
    0
  )
  const sessionCount = filteredSessions.length

  return {
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    summary: {
      sessions: sessionCount,
      activeDays: new Set(filteredSessions.map((session) => session.date)).size,
      exercises: reportExercises.length,
      sets,
      reps,
      volumeKg,
      durationMinutes,
      averageDurationMinutes: sessionCount === 0 ? 0 : round2(durationMinutes / sessionCount),
      averageSetsPerSession: sessionCount === 0 ? 0 : round2(sets / sessionCount),
      averageRepsPerSession: sessionCount === 0 ? 0 : round2(reps / sessionCount),
      averageVolumeKgPerSession: sessionCount === 0 ? 0 : round2(volumeKg / sessionCount),
      averageWeightKg:
        totalSetCountForWeight === 0 ? 0 : round2(totalWeight / totalSetCountForWeight),
      maxWeightKg: round2(maxWeightKg)
    },
    muscleGroups: WORKOUT_MUSCLE_ZONES.map(
      (group) => muscleMap.get(group) as WorkoutReportMuscleGroup
    ),
    exercises: reportExercises,
    programs: [...programMap.values()]
      .map((program) => ({ ...program, volumeKg: round2(program.volumeKg) }))
      .sort((left, right) => right.sessions - left.sessions),
    timeline: [...dayMap.values()]
      .map((day) => ({ ...day, volumeKg: round2(day.volumeKg) }))
      .sort((left, right) => left.date.localeCompare(right.date)),
    personalRecords
  }
}
