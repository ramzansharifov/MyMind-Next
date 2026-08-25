import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import type { WorkoutEntityStatus, WorkoutMuscleGroup } from '../../../shared/contracts/workouts'

export const workoutExercises = sqliteTable(
  'workout_exercises',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    muscleGroup: text('muscle_group').$type<WorkoutMuscleGroup>().notNull(),
    usesExternalWeight: integer('uses_external_weight', { mode: 'boolean' })
      .notNull()
      .default(true),
    description: text('description').notNull().default(''),
    status: text('status').$type<WorkoutEntityStatus>().notNull().default('active'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
  },
  (table) => [
    index('workout_exercises_muscle_group_idx').on(table.muscleGroup),
    index('workout_exercises_status_idx').on(table.status)
  ]
)

export const workoutPrograms = sqliteTable(
  'workout_programs',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    status: text('status').$type<WorkoutEntityStatus>().notNull().default('active'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
  },
  (table) => [index('workout_programs_status_idx').on(table.status)]
)

export const workoutProgramExercises = sqliteTable(
  'workout_program_exercises',
  {
    id: text('id').primaryKey(),
    programId: text('program_id')
      .notNull()
      .references(() => workoutPrograms.id, { onDelete: 'cascade' }),
    exerciseId: text('exercise_id')
      .notNull()
      .references(() => workoutExercises.id, { onDelete: 'restrict' }),
    position: integer('position').notNull(),
    plannedSets: integer('planned_sets').notNull().default(3),
    targetReps: integer('target_reps'),
    notes: text('notes').notNull().default('')
  },
  (table) => [
    index('workout_program_exercises_program_idx').on(table.programId, table.position),
    index('workout_program_exercises_exercise_idx').on(table.exerciseId)
  ]
)

export const workoutSessions = sqliteTable(
  'workout_sessions',
  {
    id: text('id').primaryKey(),
    programId: text('program_id').references(() => workoutPrograms.id, { onDelete: 'set null' }),
    programNameSnapshot: text('program_name_snapshot'),
    title: text('title').notNull().default(''),
    date: text('date').notNull(),
    durationMinutes: integer('duration_minutes'),
    comment: text('comment').notNull().default(''),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
  },
  (table) => [
    index('workout_sessions_date_idx').on(table.date),
    index('workout_sessions_program_idx').on(table.programId)
  ]
)

export const workoutSessionExercises = sqliteTable(
  'workout_session_exercises',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id')
      .notNull()
      .references(() => workoutSessions.id, { onDelete: 'cascade' }),
    exerciseId: text('exercise_id').references(() => workoutExercises.id, {
      onDelete: 'restrict'
    }),
    exerciseTitleSnapshot: text('exercise_title_snapshot').notNull(),
    muscleGroupSnapshot: text('muscle_group_snapshot').$type<WorkoutMuscleGroup>().notNull(),
    usesExternalWeightSnapshot: integer('uses_external_weight_snapshot', { mode: 'boolean' })
      .notNull()
      .default(true),
    position: integer('position').notNull(),
    comment: text('comment').notNull().default('')
  },
  (table) => [
    index('workout_session_exercises_session_idx').on(table.sessionId, table.position),
    index('workout_session_exercises_exercise_idx').on(table.exerciseId),
    index('workout_session_exercises_group_idx').on(table.muscleGroupSnapshot)
  ]
)

export const workoutSets = sqliteTable(
  'workout_sets',
  {
    id: text('id').primaryKey(),
    sessionExerciseId: text('session_exercise_id')
      .notNull()
      .references(() => workoutSessionExercises.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    reps: integer('reps').notNull(),
    weightMilliKg: integer('weight_milli_kg').notNull().default(0)
  },
  (table) => [index('workout_sets_exercise_idx').on(table.sessionExerciseId, table.position)]
)

export const workoutProgressEntries = sqliteTable(
  'workout_progress_entries',
  {
    id: text('id').primaryKey(),
    date: text('date').notNull(),
    bodyWeightMilliKg: integer('body_weight_milli_kg'),
    wellbeing: text('wellbeing').notNull().default(''),
    notes: text('notes').notNull().default(''),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
  },
  (table) => [index('workout_progress_entries_date_idx').on(table.date)]
)

export const workoutProgressMetrics = sqliteTable(
  'workout_progress_metrics',
  {
    id: text('id').primaryKey(),
    entryId: text('entry_id')
      .notNull()
      .references(() => workoutProgressEntries.id, { onDelete: 'cascade' }),
    exerciseId: text('exercise_id').references(() => workoutExercises.id, {
      onDelete: 'restrict'
    }),
    exerciseTitleSnapshot: text('exercise_title_snapshot').notNull(),
    muscleGroupSnapshot: text('muscle_group_snapshot').$type<WorkoutMuscleGroup>().notNull(),
    weightMilliKg: integer('weight_milli_kg').notNull().default(0),
    reps: integer('reps').notNull(),
    comment: text('comment').notNull().default(''),
    position: integer('position').notNull()
  },
  (table) => [
    index('workout_progress_metrics_entry_idx').on(table.entryId, table.position),
    index('workout_progress_metrics_exercise_idx').on(table.exerciseId)
  ]
)

export const workoutProgressPhotos = sqliteTable(
  'workout_progress_photos',
  {
    id: text('id').primaryKey(),
    entryId: text('entry_id')
      .notNull()
      .references(() => workoutProgressEntries.id, { onDelete: 'cascade' }),
    assetId: text('asset_id').notNull(),
    fileName: text('file_name').notNull(),
    mimeType: text('mime_type').notNull(),
    size: integer('size').notNull(),
    url: text('url').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()
  },
  (table) => [index('workout_progress_photos_entry_idx').on(table.entryId, table.createdAt)]
)
