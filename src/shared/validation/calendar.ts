import { z } from 'zod'

const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)
const titleSchema = z.string().trim().min(1).max(160)
const noteSchema = z.string().max(10_000)
const reminderOffsetSchema = z.number().int().min(0).max(525_600 * 10)

export const calendarRangeInputSchema = z
  .object({
    from: dateKeySchema,
    to: dateKeySchema
  })
  .refine((value) => value.from <= value.to, 'Некорректный диапазон календаря')

export const calendarCreateEventInputSchema = z.object({
  title: titleSchema,
  kind: z.enum(['one_time', 'annual']),
  date: dateKeySchema,
  time: timeSchema.nullable().optional(),
  startDate: dateKeySchema.nullable().optional(),
  note: noteSchema.optional(),
  reminderOffsets: z.array(reminderOffsetSchema).max(20).optional()
})

export const calendarUpdateEventInputSchema = calendarCreateEventInputSchema.extend({
  id: z.string().uuid(),
  occurrenceDate: dateKeySchema
})

export const calendarDeleteEventInputSchema = z.object({
  id: z.string().uuid()
})

export const calendarOccurrenceInputSchema = z.object({
  eventId: z.string().uuid(),
  occurrenceDate: dateKeySchema
})

export const calendarSetOccurrenceNoteInputSchema = calendarOccurrenceInputSchema.extend({
  note: noteSchema
})

export const calendarSetOccurrenceHiddenInputSchema = calendarOccurrenceInputSchema.extend({
  hidden: z.boolean()
})
