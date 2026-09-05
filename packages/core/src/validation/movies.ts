import { z } from 'zod'

import { MOVIE_STATUSES, MOVIE_TYPES } from '@mymind/contracts/movies'

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
export const movieTypeSchema = z.enum(MOVIE_TYPES, {
  message: 'Тип должен быть одним из: фильм, сериал, мультфильм, мультсериал'
})

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

const nullablePositiveInteger = (
  label: string,
  max: number
): z.ZodOptional<z.ZodNullable<z.ZodNumber>> =>
  z
    .number()
    .int(`${label} должно быть целым числом`)
    .min(1, `${label} должно быть не меньше 1`)
    .max(max, `${label} превышает допустимое значение`)
    .nullable()
    .optional()

const stringListSchema = (maxItems: number): z.ZodType<string[]> =>
  z
    .array(z.string().trim().min(1).max(120))
    .max(maxItems)
    .transform((items) => Array.from(new Set(items)))

const movieBaseInputSchema = z
  .object({
    title: z.string().trim().min(1, 'Введите название фильма').max(MAX_MOVIE_TITLE_LENGTH),
    originalTitle: nullableTrimmedText(MAX_MOVIE_TITLE_LENGTH),
    type: movieTypeSchema,
    year: z.number().int().min(1800).max(2200).nullable(),
    posterUrl: posterUrlSchema,
    director: z.string().trim().max(MAX_MOVIE_DIRECTOR_LENGTH),
    runtimeMinutes: z.number().int().min(1).max(1_440).nullable(),
    seasonCount: nullablePositiveInteger('Количество сезонов', 1_000),
    episodesPerSeason: nullablePositiveInteger('Количество серий в сезоне', 10_000),
    episodeRuntimeMinutes: nullablePositiveInteger('Длительность серии', 1_440),
    genres: stringListSchema(MAX_MOVIE_GENRES),
    actors: stringListSchema(MAX_MOVIE_ACTORS),
    description: z.string().trim().max(MAX_MOVIE_DESCRIPTION_LENGTH),
    status: movieStatusSchema,
    favorite: z.boolean(),
    rating: ratingSchema,
    comments: z.string().trim().max(MAX_MOVIE_TEXT_LENGTH)
  })
  .strict()

function validateMovieMetadata(
  input: {
    type: string
    status: string
    rating: number | null
    runtimeMinutes: number | null
    seasonCount?: number | null
    episodesPerSeason?: number | null
    episodeRuntimeMinutes?: number | null
  },
  context: z.RefinementCtx
): void {
  if (input.status !== 'watched' && input.rating !== null) {
    context.addIssue({
      code: 'custom',
      path: ['rating'],
      message: 'Оценка доступна только для просмотренного фильма'
    })
  }

  const episodic = input.type === 'series' || input.type === 'animated_series'
  if (episodic && input.runtimeMinutes !== null) {
    context.addIssue({
      code: 'custom',
      path: ['runtimeMinutes'],
      message: 'Для сериалов укажите длительность одной серии'
    })
  }

  if (!episodic) {
    const episodicFields: Array<[string, number | null | undefined, string]> = [
      ['seasonCount', input.seasonCount, 'Количество сезонов доступно только для сериалов'],
      [
        'episodesPerSeason',
        input.episodesPerSeason,
        'Количество серий в сезоне доступно только для сериалов'
      ],
      [
        'episodeRuntimeMinutes',
        input.episodeRuntimeMinutes,
        'Длительность серии доступна только для сериалов'
      ]
    ]
    for (const [path, value, message] of episodicFields) {
      if (value !== null && value !== undefined) {
        context.addIssue({ code: 'custom', path: [path], message })
      }
    }
  }
}

export const createMovieInputSchema = movieBaseInputSchema.superRefine(validateMovieMetadata)

export const createMoviesInputSchema = z
  .object({
    movies: z.array(createMovieInputSchema).min(1).max(100)
  })
  .strict()

export const updateMovieInputSchema = movieBaseInputSchema
  .extend({ id: movieSafeIdSchema })
  .strict()
  .superRefine(validateMovieMetadata)

export const getMovieInputSchema = z.object({ id: movieSafeIdSchema }).strict()
export const deleteMovieInputSchema = getMovieInputSchema

export const movieWebSearchInputSchema = z
  .object({ query: z.string().trim().min(1).max(300) })
  .strict()
