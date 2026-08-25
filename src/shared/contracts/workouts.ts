export const WORKOUT_MUSCLE_GROUPS = [
  'arms',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'back',
  'lats',
  'traps',
  'lower_back',
  'chest',
  'abs',
  'legs',
  'glutes',
  'quadriceps',
  'hamstrings',
  'calves'
] as const

export const WORKOUT_MUSCLE_ZONES = [
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'lats',
  'traps',
  'lower_back',
  'chest',
  'abs',
  'glutes',
  'quadriceps',
  'hamstrings',
  'calves'
] as const

export const WORKOUT_ENTITY_STATUSES = ['active', 'archived'] as const

export type WorkoutMuscleGroup = (typeof WORKOUT_MUSCLE_GROUPS)[number]
export type WorkoutMuscleZone = (typeof WORKOUT_MUSCLE_ZONES)[number]
export type WorkoutEntityStatus = (typeof WORKOUT_ENTITY_STATUSES)[number]

export interface WorkoutExerciseRecord {
  id: string
  title: string
  /** Primary zone kept for backwards-compatible rendering and old consumers. */
  muscleGroup: WorkoutMuscleGroup
  muscleGroups: WorkoutMuscleGroup[]
  usesExternalWeight: boolean
  status: WorkoutEntityStatus
  createdAt: number
  updatedAt: number
}

export interface WorkoutProgramExerciseRecord {
  id: string
  exerciseId: string
  position: number
}

export interface WorkoutProgramRecord {
  id: string
  name: string
  description: string
  status: WorkoutEntityStatus
  exercises: WorkoutProgramExerciseRecord[]
  createdAt: number
  updatedAt: number
}

export interface WorkoutSetRecord {
  id: string
  position: number
  reps: number
  weightKg: number
}

export interface WorkoutSessionExerciseRecord {
  id: string
  exerciseId: string | null
  exerciseTitle: string
  /** Primary zone kept for backwards-compatible rendering and old consumers. */
  muscleGroup: WorkoutMuscleGroup
  muscleGroups: WorkoutMuscleGroup[]
  usesExternalWeight: boolean
  position: number
  comment: string
  sets: WorkoutSetRecord[]
}

export interface WorkoutSessionRecord {
  id: string
  programId: string | null
  programName: string | null
  date: string
  durationMinutes: number | null
  comment: string
  exercises: WorkoutSessionExerciseRecord[]
  totalSets: number
  totalReps: number
  totalVolumeKg: number
  createdAt: number
  updatedAt: number
}

export interface WorkoutProgressMetricRecord {
  id: string
  exerciseId: string | null
  exerciseTitle: string
  /** Primary zone kept for backwards-compatible rendering and old consumers. */
  muscleGroup: WorkoutMuscleGroup
  muscleGroups: WorkoutMuscleGroup[]
  weightKg: number
  reps: number
  comment: string
}

export interface WorkoutProgressPhotoRecord {
  id: string
  entryId: string
  assetId: string
  fileName: string
  mimeType: string
  size: number
  url: string
  createdAt: number
}

export interface WorkoutProgressEntryRecord {
  id: string
  date: string
  bodyWeightKg: number | null
  wellbeing: string
  notes: string
  metrics: WorkoutProgressMetricRecord[]
  photos: WorkoutProgressPhotoRecord[]
  createdAt: number
  updatedAt: number
}

export interface WorkoutsOverview {
  exercises: WorkoutExerciseRecord[]
  programs: WorkoutProgramRecord[]
  sessions: WorkoutSessionRecord[]
  progressEntries: WorkoutProgressEntryRecord[]
}

export interface CreateWorkoutExerciseInput {
  title: string
  muscleGroups: WorkoutMuscleGroup[]
  usesExternalWeight: boolean
  status: WorkoutEntityStatus
}

export interface UpdateWorkoutExerciseInput extends CreateWorkoutExerciseInput {
  id: string
}

export interface DeleteWorkoutExerciseInput {
  id: string
}

export interface WorkoutProgramExerciseInput {
  exerciseId: string
}

export interface CreateWorkoutProgramInput {
  name: string
  description: string
  status: WorkoutEntityStatus
  exercises: WorkoutProgramExerciseInput[]
}

export interface UpdateWorkoutProgramInput extends CreateWorkoutProgramInput {
  id: string
}

export interface DeleteWorkoutProgramInput {
  id: string
}

export interface WorkoutSetInput {
  reps: number
  weightKg: number
}

export interface WorkoutSessionExerciseInput {
  exerciseId: string
  comment: string
  sets: WorkoutSetInput[]
}

export interface CreateWorkoutSessionInput {
  programId: string | null
  date: string
  durationMinutes: number | null
  comment: string
  exercises: WorkoutSessionExerciseInput[]
}

export interface UpdateWorkoutSessionInput extends CreateWorkoutSessionInput {
  id: string
}

export interface DeleteWorkoutSessionInput {
  id: string
}

export interface GetWorkoutSessionInput {
  id: string
}

export interface WorkoutProgressMetricInput {
  exerciseId: string
  weightKg: number
  reps: number
  comment: string
}

export interface CreateWorkoutProgressEntryInput {
  date: string
  bodyWeightKg: number | null
  wellbeing: string
  notes: string
  metrics: WorkoutProgressMetricInput[]
}

export interface UpdateWorkoutProgressEntryInput extends CreateWorkoutProgressEntryInput {
  id: string
}

export interface DeleteWorkoutProgressEntryInput {
  id: string
}

export interface ImportWorkoutProgressPhotoInput {
  entryId: string
}

export interface DeleteWorkoutProgressPhotoInput {
  id: string
}

export interface WorkoutReportInput {
  dateFrom: string
  dateTo: string
  programId: string | null
  exerciseId: string | null
  muscleGroup: WorkoutMuscleGroup | null
}

export interface WorkoutReportSummary {
  sessions: number
  activeDays: number
  exercises: number
  sets: number
  reps: number
  externalWeightSets: number
  externalWeightReps: number
  bodyweightSets: number
  bodyweightReps: number
  volumeKg: number
  durationMinutes: number
  averageDurationMinutes: number
  averageSetsPerSession: number
  averageRepsPerSession: number
  averageVolumeKgPerSession: number
  averageWeightKg: number
  maxWeightKg: number
}

export interface WorkoutReportMuscleGroup {
  muscleGroup: WorkoutMuscleGroup
  exercises: number
  sets: number
  reps: number
  volumeKg: number
  loadPercent: number
}

export interface WorkoutReportExercise {
  exerciseId: string | null
  title: string
  muscleGroup: WorkoutMuscleGroup
  muscleGroups: WorkoutMuscleGroup[]
  usesExternalWeight: boolean
  sessions: number
  sets: number
  reps: number
  volumeKg: number
  averageWeightKg: number
  maxWeightKg: number
  estimatedOneRepMax: number
  firstBestWeightKg: number
  lastBestWeightKg: number
  weightChangeKg: number
  bestSetReps: number
  firstBestReps: number
  lastBestReps: number
  repsChange: number
}

export interface WorkoutReportProgram {
  programId: string | null
  name: string
  sessions: number
  sets: number
  reps: number
  externalWeightSets: number
  bodyweightSets: number
  volumeKg: number
  durationMinutes: number
}

export interface WorkoutReportDay {
  date: string
  sessions: number
  sets: number
  reps: number
  externalWeightSets: number
  bodyweightSets: number
  volumeKg: number
  durationMinutes: number
}

export interface WorkoutPersonalRecord {
  exerciseId: string | null
  title: string
  muscleGroup: WorkoutMuscleGroup
  muscleGroups: WorkoutMuscleGroup[]
  date: string
  weightKg: number
  reps: number
  estimatedOneRepMax: number
}

export interface WorkoutBodyweightRecord {
  exerciseId: string | null
  title: string
  muscleGroup: WorkoutMuscleGroup
  muscleGroups: WorkoutMuscleGroup[]
  date: string
  reps: number
}

export interface WorkoutReport {
  dateFrom: string
  dateTo: string
  summary: WorkoutReportSummary
  muscleGroups: WorkoutReportMuscleGroup[]
  exercises: WorkoutReportExercise[]
  programs: WorkoutReportProgram[]
  timeline: WorkoutReportDay[]
  personalRecords: WorkoutPersonalRecord[]
  bodyweightRecords: WorkoutBodyweightRecord[]
}

export const WORKOUTS_IPC_CHANNELS = {
  listOverview: 'workouts:list-overview',
  createExercise: 'workouts:create-exercise',
  updateExercise: 'workouts:update-exercise',
  deleteExercise: 'workouts:delete-exercise',
  createProgram: 'workouts:create-program',
  updateProgram: 'workouts:update-program',
  deleteProgram: 'workouts:delete-program',
  createSession: 'workouts:create-session',
  updateSession: 'workouts:update-session',
  deleteSession: 'workouts:delete-session',
  getSession: 'workouts:get-session',
  createProgressEntry: 'workouts:create-progress-entry',
  updateProgressEntry: 'workouts:update-progress-entry',
  deleteProgressEntry: 'workouts:delete-progress-entry',
  importProgressPhoto: 'workouts:import-progress-photo',
  deleteProgressPhoto: 'workouts:delete-progress-photo',
  getReport: 'workouts:get-report'
} as const

export interface WorkoutsApi {
  listOverview(): Promise<WorkoutsOverview>
  createExercise(input: CreateWorkoutExerciseInput): Promise<WorkoutExerciseRecord>
  updateExercise(input: UpdateWorkoutExerciseInput): Promise<WorkoutExerciseRecord>
  deleteExercise(input: DeleteWorkoutExerciseInput): Promise<boolean>
  createProgram(input: CreateWorkoutProgramInput): Promise<WorkoutProgramRecord>
  updateProgram(input: UpdateWorkoutProgramInput): Promise<WorkoutProgramRecord>
  deleteProgram(input: DeleteWorkoutProgramInput): Promise<boolean>
  createSession(input: CreateWorkoutSessionInput): Promise<WorkoutSessionRecord>
  updateSession(input: UpdateWorkoutSessionInput): Promise<WorkoutSessionRecord>
  deleteSession(input: DeleteWorkoutSessionInput): Promise<boolean>
  getSession(input: GetWorkoutSessionInput): Promise<WorkoutSessionRecord>
  createProgressEntry(input: CreateWorkoutProgressEntryInput): Promise<WorkoutProgressEntryRecord>
  updateProgressEntry(input: UpdateWorkoutProgressEntryInput): Promise<WorkoutProgressEntryRecord>
  deleteProgressEntry(input: DeleteWorkoutProgressEntryInput): Promise<boolean>
  importProgressPhoto(
    input: ImportWorkoutProgressPhotoInput
  ): Promise<WorkoutProgressPhotoRecord | null>
  deleteProgressPhoto(input: DeleteWorkoutProgressPhotoInput): Promise<boolean>
  getReport(input: WorkoutReportInput): Promise<WorkoutReport>
}
