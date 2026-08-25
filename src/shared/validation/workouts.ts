import { z } from 'zod'

import {
  WORKOUT_ENTITY_STATUSES,
  WORKOUT_MUSCLE_GROUPS,
  WORKOUT_MUSCLE_ZONES
} from '../contracts/workouts'

const idSchema = z.string().uuid('Некорректный идентификатор')
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата должна быть в формате ГГГГ-ММ-ДД')
const weightSchema = z
  .number()
  .finite()
  .min(0, 'Вес не может быть отрицательным')
  .max(1000, 'Слишком большой вес')
const repsSchema = z
  .number()
  .int()
  .min(1, 'Минимум одно повторение')
  .max(10000, 'Слишком много повторений')

const muscleGroupsSchema = z
  .array(z.enum(WORKOUT_MUSCLE_ZONES))
  .min(1, 'Выберите хотя бы одну мышечную зону')
  .max(WORKOUT_MUSCLE_ZONES.length, 'Слишком много мышечных зон')
  .superRefine((groups, context) => {
    if (new Set(groups).size !== groups.length) {
      context.addIssue({
        code: 'custom',
        message: 'Мышечную зону нельзя выбирать несколько раз'
      })
    }
  })

const exercisePayloadSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Введите название упражнения')
    .max(160, 'Название слишком длинное'),
  muscleGroups: muscleGroupsSchema,
  status: z.enum(WORKOUT_ENTITY_STATUSES)
})

export const createWorkoutExerciseInputSchema = exercisePayloadSchema
export const updateWorkoutExerciseInputSchema = exercisePayloadSchema.extend({ id: idSchema })
export const deleteWorkoutExerciseInputSchema = z.object({ id: idSchema })

const programExerciseSchema = z.object({
  exerciseId: idSchema
})

const programPayloadSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Введите название программы')
      .max(160, 'Название слишком длинное'),
    description: z.string().max(10_000, 'Описание слишком длинное'),
    status: z.enum(WORKOUT_ENTITY_STATUSES),
    exercises: z
      .array(programExerciseSchema)
      .min(1, 'Добавьте хотя бы одно упражнение')
      .max(80, 'Слишком много упражнений')
  })
  .superRefine((input, context) => {
    const ids = input.exercises.map((exercise) => exercise.exerciseId)
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: 'custom',
        message: 'Одно упражнение нельзя добавлять в программу несколько раз',
        path: ['exercises']
      })
    }
  })

export const createWorkoutProgramInputSchema = programPayloadSchema
export const updateWorkoutProgramInputSchema = programPayloadSchema.safeExtend({ id: idSchema })
export const deleteWorkoutProgramInputSchema = z.object({ id: idSchema })

const workoutSetSchema = z.object({
  reps: repsSchema,
  weightKg: weightSchema
})

const sessionExerciseSchema = z.object({
  exerciseId: idSchema,
  comment: z.string().max(4000, 'Комментарий слишком длинный'),
  sets: z
    .array(workoutSetSchema)
    .min(1, 'Добавьте хотя бы один подход')
    .max(100, 'Слишком много подходов')
})

const sessionPayloadSchema = z
  .object({
    programId: idSchema.nullable(),
    title: z.string().trim().max(160, 'Название слишком длинное'),
    date: dateSchema,
    durationMinutes: z.number().int().min(1).max(1440).nullable(),
    comment: z.string().max(10_000, 'Комментарий слишком длинный'),
    exercises: z
      .array(sessionExerciseSchema)
      .min(1, 'Добавьте хотя бы одно упражнение')
      .max(100, 'Слишком много упражнений')
  })
  .superRefine((input, context) => {
    const ids = input.exercises.map((exercise) => exercise.exerciseId)
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: 'custom',
        message: 'Одно упражнение нельзя добавлять в тренировку несколько раз',
        path: ['exercises']
      })
    }
  })

export const createWorkoutSessionInputSchema = sessionPayloadSchema
export const updateWorkoutSessionInputSchema = sessionPayloadSchema.safeExtend({ id: idSchema })
export const deleteWorkoutSessionInputSchema = z.object({ id: idSchema })
export const getWorkoutSessionInputSchema = z.object({ id: idSchema })

const progressMetricSchema = z.object({
  exerciseId: idSchema,
  weightKg: weightSchema,
  reps: repsSchema,
  comment: z.string().max(4000, 'Комментарий слишком длинный')
})

const progressPayloadSchema = z
  .object({
    date: dateSchema,
    bodyWeightKg: z.number().finite().min(1).max(500).nullable(),
    wellbeing: z.string().max(10_000, 'Описание самочувствия слишком длинное'),
    notes: z.string().max(10_000, 'Заметка слишком длинная'),
    metrics: z.array(progressMetricSchema).max(100, 'Слишком много показателей')
  })
  .superRefine((input, context) => {
    const ids = input.metrics.map((metric) => metric.exerciseId)
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: 'custom',
        message: 'Одно упражнение можно указать в записи прогресса только один раз',
        path: ['metrics']
      })
    }
  })

export const createWorkoutProgressEntryInputSchema = progressPayloadSchema
export const updateWorkoutProgressEntryInputSchema = progressPayloadSchema.safeExtend({ id: idSchema })
export const deleteWorkoutProgressEntryInputSchema = z.object({ id: idSchema })
export const importWorkoutProgressPhotoInputSchema = z.object({ entryId: idSchema })
export const deleteWorkoutProgressPhotoInputSchema = z.object({ id: idSchema })

export const workoutReportInputSchema = z
  .object({
    dateFrom: dateSchema,
    dateTo: dateSchema,
    programId: idSchema.nullable(),
    exerciseId: idSchema.nullable(),
    muscleGroup: z.enum(WORKOUT_MUSCLE_GROUPS).nullable()
  })
  .refine((input) => input.dateFrom <= input.dateTo, {
    message: 'Начальная дата не может быть позже конечной',
    path: ['dateTo']
  })
