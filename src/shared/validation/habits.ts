import { z } from 'zod'

import { HABIT_GROUP_COLORS, HABIT_GROUP_ICONS, HABIT_TRACKING_TYPES } from '../contracts/habits'

const HABIT_SAFE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/
const MAX_GROUP_NAME_LENGTH = 80
const MAX_TITLE_LENGTH = 240
const MAX_UNIT_LENGTH = 32
const MAX_REPEAT_DAYS = 3_650
const MAX_TRACK_VALUE = 1_000_000_000
const MAX_PREFERRED_TIMES = 100_000
const MAX_REPORT_DAYS = 730

export const habitSafeIdSchema = z
  .string()
  .regex(HABIT_SAFE_ID_PATTERN, 'Некорректный идентификатор привычки')

export const habitTrackingTypeSchema = z.enum(HABIT_TRACKING_TYPES)
export const habitGroupIconSchema = z.enum(HABIT_GROUP_ICONS)
export const habitGroupColorSchema = z.enum(HABIT_GROUP_COLORS)

export const habitDateSchema = z
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

const habitTimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Время должно быть в формате ЧЧ:ММ')

const habitPreferredTimeSchema = z
  .object({
    unit: z.number().int().min(1).max(MAX_TRACK_VALUE),
    time: habitTimeSchema
  })
  .strict()

export const habitsOverviewInputSchema = z.object({ date: habitDateSchema }).strict()

export const createHabitGroupInputSchema = z
  .object({
    name: z.string().trim().min(1, 'Введите название группы').max(MAX_GROUP_NAME_LENGTH),
    icon: habitGroupIconSchema,
    color: habitGroupColorSchema
  })
  .strict()

export const updateHabitGroupInputSchema = createHabitGroupInputSchema
  .extend({ id: habitSafeIdSchema })
  .strict()

export const deleteHabitGroupInputSchema = z.object({ id: habitSafeIdSchema }).strict()

const habitBaseInputSchema = z
  .object({
    title: z.string().trim().min(1, 'Введите название привычки').max(MAX_TITLE_LENGTH),
    groupId: habitSafeIdSchema.nullable(),
    trackingType: habitTrackingTypeSchema,
    targetValue: z.number().int().min(1).max(MAX_TRACK_VALUE),
    unit: z.string().trim().max(MAX_UNIT_LENGTH),
    repeatEveryDays: z.number().int().min(1).max(MAX_REPEAT_DAYS),
    preferredTimes: z.array(habitPreferredTimeSchema).max(MAX_PREFERRED_TIMES),
    remindersEnabled: z.boolean()
  })
  .strict()

function validateHabitInput(
  input: z.infer<typeof habitBaseInputSchema>,
  context: z.RefinementCtx
): void {
  if (input.trackingType === 'check' && input.targetValue !== 1) {
    context.addIssue({
      code: 'custom',
      path: ['targetValue'],
      message: 'Для привычки с отметкой целевое значение должно быть равно 1'
    })
  }

  if (input.trackingType === 'check' && input.unit !== '') {
    context.addIssue({
      code: 'custom',
      path: ['unit'],
      message: 'Для привычки с отметкой единица измерения не используется'
    })
  }

  const seenUnits = new Set<number>()
  for (let index = 0; index < input.preferredTimes.length; index += 1) {
    const preferredTime = input.preferredTimes[index]
    if (preferredTime.unit > input.targetValue) {
      context.addIssue({
        code: 'custom',
        path: ['preferredTimes', index, 'unit'],
        message: 'Номер единицы для времени не может превышать целевое значение'
      })
    }
    if (seenUnits.has(preferredTime.unit)) {
      context.addIssue({
        code: 'custom',
        path: ['preferredTimes', index, 'unit'],
        message: 'Для одной единицы можно указать только одно предпочтительное время'
      })
    }
    seenUnits.add(preferredTime.unit)
  }

  if (input.remindersEnabled && input.preferredTimes.length === 0) {
    context.addIssue({
      code: 'custom',
      path: ['remindersEnabled'],
      message: 'Чтобы включить напоминания, укажите предпочтительное время'
    })
  }
}

export const createHabitInputSchema = habitBaseInputSchema.superRefine(validateHabitInput)
export const updateHabitInputSchema = habitBaseInputSchema
  .extend({ id: habitSafeIdSchema })
  .strict()
  .superRefine(validateHabitInput)

export const deleteHabitInputSchema = z.object({ id: habitSafeIdSchema }).strict()

export const upsertHabitEntryInputSchema = z
  .object({
    habitId: habitSafeIdSchema,
    date: habitDateSchema,
    value: z.number().int().min(0).max(MAX_TRACK_VALUE),
    skipped: z.boolean()
  })
  .strict()

export const deleteHabitEntryInputSchema = z
  .object({ habitId: habitSafeIdSchema, date: habitDateSchema })
  .strict()

function dateToUtc(value: string): number {
  const [year, month, day] = value.split('-').map(Number)
  return Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1)
}

export const habitReportInputSchema = z
  .object({
    dateFrom: habitDateSchema,
    dateTo: habitDateSchema,
    groupId: habitSafeIdSchema.nullable(),
    ungroupedOnly: z.boolean()
  })
  .strict()
  .superRefine((input, context) => {
    const from = dateToUtc(input.dateFrom)
    const to = dateToUtc(input.dateTo)
    if (to < from) {
      context.addIssue({
        code: 'custom',
        path: ['dateTo'],
        message: 'Конец периода не может быть раньше начала'
      })
      return
    }

    const days = Math.floor((to - from) / 86_400_000) + 1
    if (days > MAX_REPORT_DAYS) {
      context.addIssue({
        code: 'custom',
        path: ['dateTo'],
        message: `Период отчёта не может превышать ${MAX_REPORT_DAYS} дней`
      })
    }

    if (input.ungroupedOnly && input.groupId !== null) {
      context.addIssue({
        code: 'custom',
        path: ['groupId'],
        message: 'Нельзя одновременно выбрать группу и режим «Без группы»'
      })
    }
  })
