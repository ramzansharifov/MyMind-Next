import { z } from 'zod'

import {
  DIARY_COVER_TONES,
  DIARY_ICON_NAMES,
  DIARY_MOODS,
  DIARY_PAPER_PATTERNS,
  DIARY_PAPER_TONES
} from '../contracts/diary'

const DIARY_SAFE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/
const DIARY_DAY_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/
const MAX_DIARY_TITLE_LENGTH = 120
const MAX_DIARY_ENTRY_LENGTH = 8_000

export const diarySafeIdSchema = z
  .string()
  .regex(DIARY_SAFE_ID_PATTERN, 'Некорректный идентификатор')

export const diaryDayKeySchema = z
  .string()
  .regex(DIARY_DAY_KEY_PATTERN, 'Дата должна быть в формате YYYY-MM-DD')
  .refine((value) => {
    const [year, month, day] = value.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
  }, 'Некорректная календарная дата')

export const diaryIconSchema = z.enum(DIARY_ICON_NAMES)
export const diaryMoodSchema = z.enum(DIARY_MOODS)
export const diaryPaperPatternSchema = z.enum(DIARY_PAPER_PATTERNS)
export const diaryPaperToneSchema = z.enum(DIARY_PAPER_TONES)
export const diaryCoverToneSchema = z.enum(DIARY_COVER_TONES)

export const createDiaryInputSchema = z
  .object({
    title: z.string().trim().min(1, 'Введите название дневника').max(MAX_DIARY_TITLE_LENGTH),
    icon: diaryIconSchema
  })
  .strict()

export const updateDiaryInputSchema = createDiaryInputSchema
  .extend({ id: diarySafeIdSchema })
  .strict()

export const updateDiaryAppearanceInputSchema = z
  .object({
    id: diarySafeIdSchema,
    paperPattern: diaryPaperPatternSchema,
    paperTone: diaryPaperToneSchema,
    coverTone: diaryCoverToneSchema
  })
  .strict()

export const deleteDiaryInputSchema = z.object({ id: diarySafeIdSchema }).strict()

export const getDiaryDayInputSchema = z
  .object({ diaryId: diarySafeIdSchema, dayKey: diaryDayKeySchema })
  .strict()

export const listDiaryDaysInputSchema = z
  .object({
    diaryId: diarySafeIdSchema,
    fromDay: diaryDayKeySchema.optional(),
    toDay: diaryDayKeySchema.optional()
  })
  .strict()
  .superRefine((input, context) => {
    if (input.fromDay && input.toDay && input.fromDay > input.toDay) {
      context.addIssue({
        code: 'custom',
        path: ['toDay'],
        message: 'Конечная дата должна быть не раньше начальной'
      })
    }
  })

export const setDiaryMoodInputSchema = getDiaryDayInputSchema
  .extend({ mood: diaryMoodSchema.nullable() })
  .strict()

export const createDiaryEntryInputSchema = getDiaryDayInputSchema
  .extend({
    text: z
      .string()
      .trim()
      .min(1, 'Запись не может быть пустой')
      .max(MAX_DIARY_ENTRY_LENGTH, 'Запись слишком длинная')
  })
  .strict()

export const updateDiaryEntryInputSchema = z
  .object({
    id: diarySafeIdSchema,
    text: z
      .string()
      .trim()
      .min(1, 'Запись не может быть пустой')
      .max(MAX_DIARY_ENTRY_LENGTH, 'Запись слишком длинная')
  })
  .strict()

export const deleteDiaryEntryInputSchema = z.object({ id: diarySafeIdSchema }).strict()
export const getDiaryReportInputSchema = listDiaryDaysInputSchema
