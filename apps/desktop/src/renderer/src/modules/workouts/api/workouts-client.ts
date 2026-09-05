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
  GetWorkoutSessionInput,
  ImportWorkoutProgressPhotoInput,
  UpdateWorkoutExerciseInput,
  UpdateWorkoutProgramInput,
  UpdateWorkoutProgressEntryInput,
  UpdateWorkoutSessionInput,
  WorkoutReportInput
} from '../../../../../shared/contracts/workouts'

export const workoutsClient = {
  listOverview: () => window.api.workouts.listOverview(),
  createExercise: (input: CreateWorkoutExerciseInput) => window.api.workouts.createExercise(input),
  updateExercise: (input: UpdateWorkoutExerciseInput) => window.api.workouts.updateExercise(input),
  deleteExercise: (input: DeleteWorkoutExerciseInput) => window.api.workouts.deleteExercise(input),
  createProgram: (input: CreateWorkoutProgramInput) => window.api.workouts.createProgram(input),
  updateProgram: (input: UpdateWorkoutProgramInput) => window.api.workouts.updateProgram(input),
  deleteProgram: (input: DeleteWorkoutProgramInput) => window.api.workouts.deleteProgram(input),
  createSession: (input: CreateWorkoutSessionInput) => window.api.workouts.createSession(input),
  updateSession: (input: UpdateWorkoutSessionInput) => window.api.workouts.updateSession(input),
  deleteSession: (input: DeleteWorkoutSessionInput) => window.api.workouts.deleteSession(input),
  getSession: (input: GetWorkoutSessionInput) => window.api.workouts.getSession(input),
  createProgressEntry: (input: CreateWorkoutProgressEntryInput) =>
    window.api.workouts.createProgressEntry(input),
  updateProgressEntry: (input: UpdateWorkoutProgressEntryInput) =>
    window.api.workouts.updateProgressEntry(input),
  deleteProgressEntry: (input: DeleteWorkoutProgressEntryInput) =>
    window.api.workouts.deleteProgressEntry(input),
  importProgressPhoto: (input: ImportWorkoutProgressPhotoInput) =>
    window.api.workouts.importProgressPhoto(input),
  deleteProgressPhoto: (input: DeleteWorkoutProgressPhotoInput) =>
    window.api.workouts.deleteProgressPhoto(input),
  getReport: (input: WorkoutReportInput) => window.api.workouts.getReport(input)
}
