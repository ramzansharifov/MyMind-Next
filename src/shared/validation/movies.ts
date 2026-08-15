import { z } from 'zod'

import { MOVIE_STATUSES } from '../contracts/movies'

const MOVIE_SAFE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/
const MAX_MOVIE_TITLE_LENGTH = 200
const MAX_MOVIE_TEXT_LENGTH = 10_000
const MAX_MOVIE_DESCRIPTION_LENGTH = 5_000
const MAX_MOVIE_DIRECTOR_LENGTH = 240
const MAX_MOVIE_GENRES = 16

export const movieSafeIdSchema = z
  .string()
  .regex(MOVIE_SAFE_ID_PATTERN, 'Некорректный идентификатор фильма')

export const movieStatusSchema = z.enum(MOVIE_STATUSES)

const nullableTrimmedText = (max: number) => z.string().trim().max(max).nullable()

const posterUrlSchema = z
  .string()
  .trim()
  .url('Введите корректную ссылку на постер')
  .refine((value) => value.startsWith('https://') || value.startsWith('http://'), {
    message: 'Постер должен использовать ссылку http:// или https://'
  })
  .nullable()

const ratingSchema = z
  .number()
  .min(1, 'Минимальная оценка — 1')
  .max(10, 'Максимальная оценка — 10')
  .refine((value) => Number.isInteger(value * 2), 'Оценка должна иметь шаг 0.5')
  .nullable()

const movieBaseInputSchema = z
  .object({
    title: z.string().trim().min(1, 'Введите название фильма').max(MAX_MOVIE_TITLE_LENGTH),
    originalTitle: nullableTrimmedText(MAX_MOVIE_TITLE_LENGTH),
    year: z.number().int().min(1800).max(2200).nullable(),
    posterUrl: posterUrlSchema,
    director: z.string().trim().max(MAX_MOVIE_DIRECTOR_LENGTH),
    runtimeMinutes: z.number().int().min(1).max(1_440).nullable(),
    genres: z
      .array(z.string().trim().min(1).max(80))
      .max(MAX_MOVIE_GENRES)
      .transform((genres) => Array.from(new Set(genres))),
    description: z.string().trim().max(MAX_MOVIE_DESCRIPTION_LENGTH),
    status: movieStatusSchema,
    favorite: z.boolean(),
    rating: ratingSchema,
    watchedAt: z.number().int().nonnegative().nullable(),
    notes: z.string().trim().max(MAX_MOVIE_TEXT_LENGTH)
  })
  .strict()

export const createMovieInputSchema = movieBaseInputSchema.superRefine((input, context) => {
  if (input.status !== 'watched' && input.watchedAt !== null) {
    context.addIssue({
      code: 'custom',
      path: ['watchedAt'],
      message: 'Дата просмотра доступна только для просмотренного фильма'
    })
  }
})

export const updateMovieInputSchema = movieBaseInputSchema
  .extend({ id: movieSafeIdSchema })
  .strict()
  .superRefine((input, context) => {
    if (input.status !== 'watched' && input.watchedAt !== null) {
      context.addIssue({
        code: 'custom',
        path: ['watchedAt'],
        message: 'Дата просмотра доступна только для просмотренного фильма'
      })
    }
  })

export const getMovieInputSchema = z.object({ id: movieSafeIdSchema }).strict()
export const deleteMovieInputSchema = getMovieInputSchema
