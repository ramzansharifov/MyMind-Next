import { z } from 'zod'

import {
  TASK_GROUP_COLORS,
  TASK_GROUP_ICONS,
  TASK_PRIORITIES,
  TASK_STATUSES
} from '../contracts/tasks'

const TASK_SAFE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/
const MAX_GROUP_NAME_LENGTH = 80
const MAX_TITLE_LENGTH = 240
const MAX_DESCRIPTION_LENGTH = 5_000

export const taskSafeIdSchema = z
  .string()
  .regex(TASK_SAFE_ID_PATTERN, 'Некорректный идентификатор задачи')

export const taskStatusSchema = z.enum(TASK_STATUSES)
export const taskPrioritySchema = z.enum(TASK_PRIORITIES)
export const taskGroupIconSchema = z.enum(TASK_GROUP_ICONS)
export const taskGroupColorSchema = z.enum(TASK_GROUP_COLORS)

const taskDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата должна быть в формате ГГГГ-ММ-ДД')
  .refine((value) => {
    const [year, month, day] = value.split('-').map(Number)
    if (!year || !month || !day || year < 1900 || year > 2200) return false
    const date = new Date(Date.UTC(year, month - 1, day))
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    )
  }, 'Введите корректную дату')
  .nullable()

const taskTimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Время должно быть в формате ЧЧ:ММ')
  .nullable()

export const createTaskGroupInputSchema = z
  .object({
    name: z.string().trim().min(1, 'Введите название группы').max(MAX_GROUP_NAME_LENGTH),
    icon: taskGroupIconSchema,
    color: taskGroupColorSchema
  })
  .strict()

export const updateTaskGroupInputSchema = createTaskGroupInputSchema
  .extend({ id: taskSafeIdSchema })
  .strict()

export const deleteTaskGroupInputSchema = z.object({ id: taskSafeIdSchema }).strict()

const taskBaseInputSchema = z
  .object({
    title: z.string().trim().min(1, 'Введите название задачи').max(MAX_TITLE_LENGTH),
    description: z.string().trim().max(MAX_DESCRIPTION_LENGTH),
    groupId: taskSafeIdSchema.nullable(),
    status: taskStatusSchema,
    priority: taskPrioritySchema,
    dueDate: taskDateSchema,
    dueTime: taskTimeSchema
  })
  .strict()

function validateDueTime(
  input: { dueDate: string | null; dueTime: string | null },
  context: z.RefinementCtx
): void {
  if (input.dueTime !== null && input.dueDate === null) {
    context.addIssue({
      code: 'custom',
      path: ['dueTime'],
      message: 'Чтобы указать время, сначала выберите дату'
    })
  }
}

export const createTaskInputSchema = taskBaseInputSchema.superRefine(validateDueTime)
export const updateTaskInputSchema = taskBaseInputSchema
  .extend({ id: taskSafeIdSchema })
  .strict()
  .superRefine(validateDueTime)
export const deleteTaskInputSchema = z.object({ id: taskSafeIdSchema }).strict()
