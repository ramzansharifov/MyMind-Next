import { z } from 'zod'

import { MOVIE_STATUSES } from '../contracts/movies'

const MOVIE_SAFE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/
const MAX_MOVIE_TITLE_LENGTH = 200
const MAX_MOVIE_TEXT_LENGTH = 10_000
const MAX_MOVIE_DESCRIPTION_LENGTH = 5_000
const MAX_MOVIE_DIRECTOR_LENGTH = 240
const MAX_MOVIE_GENRES = 16
const MAX_MOVIE_ACTORS = 64

export const movieSafeIdSchema = z
  .string()
  .regex(MOVIE_SAFE_ID_PATTERN, 'Некорректный идентификатор фильма')

export const movieStatusSchema = z.enum(MOVIE_STATUSES)

const nullableTrimmedText = (max: number): z.ZodNullable<z.ZodString> =>
  z.string().trim().max(max).nullable()

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
  .int('Оценка должна быть целым числом')
  .min(1, 'Минимальная оценка — 1')
  .max(10, 'Максимальная оценка — 10')
  .nullable()

const stringListSchema = (maxItems: number): z.ZodType<string[]> =>
  z
    .array(z.string().trim().min(1).max(120))
    .max(maxItems)
    .transform((items) => Array.from(new Set(items)))

const movieBaseInputSchema = z
  .object({
    title: z.string().trim().min(1, 'Введите название фильма').max(MAX_MOVIE_TITLE_LENGTH),
    originalTitle: nullableTrimmedText(MAX_MOVIE_TITLE_LENGTH),
    year: z.number().int().min(1800).max(2200).nullable(),
    posterUrl: posterUrlSchema,
    director: z.string().trim().max(MAX_MOVIE_DIRECTOR_LENGTH),
    runtimeMinutes: z.number().int().min(1).max(1_440).nullable(),
    genres: stringListSchema(MAX_MOVIE_GENRES),
    actors: stringListSchema(MAX_MOVIE_ACTORS),
    description: z.string().trim().max(MAX_MOVIE_DESCRIPTION_LENGTH),
    status: movieStatusSchema,
    favorite: z.boolean(),
    rating: ratingSchema,
    comments: z.string().trim().max(MAX_MOVIE_TEXT_LENGTH)
  })
  .strict()

function validateRatingStatus(
  input: { status: string; rating: number | null },
  context: z.RefinementCtx
): void {
  if (input.status !== 'watched' && input.rating !== null) {
    context.addIssue({
      code: 'custom',
      path: ['rating'],
      message: 'Оценка доступна только для просмотренного фильма'
    })
  }
}

export const createMovieInputSchema = movieBaseInputSchema.superRefine(validateRatingStatus)

export const createMoviesInputSchema = z
  .object({
    movies: z.array(createMovieInputSchema).min(1).max(100)
  })
  .strict()

export const updateMovieInputSchema = movieBaseInputSchema
  .extend({ id: movieSafeIdSchema })
  .strict()
  .superRefine(validateRatingStatus)

export const getMovieInputSchema = z.object({ id: movieSafeIdSchema }).strict()
export const deleteMovieInputSchema = getMovieInputSchema

export const movieWebSearchInputSchema = z
  .object({ query: z.string().trim().min(1).max(300) })
  .strict()
