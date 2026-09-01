import { z } from 'zod'

import { MUSIC_STATUSES, MUSIC_TYPES } from '../contracts/music'

const MUSIC_SAFE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/
const MAX_TITLE_LENGTH = 200
const MAX_TEXT_LENGTH = 10_000
const MAX_DESCRIPTION_LENGTH = 5_000
const MAX_ARTISTS = 32
const MAX_GENRES = 16
const MAX_PLAYLISTS_PER_TRACK = 100

export const musicSafeIdSchema = z
  .string()
  .regex(MUSIC_SAFE_ID_PATTERN, 'Некорректный идентификатор музыкальной записи')

export const musicStatusSchema = z.enum(MUSIC_STATUSES)
export const musicTypeSchema = z.enum(MUSIC_TYPES, {
  message: 'Тип должен быть одним из: трек, альбом, EP, сингл'
})

const coverUrlSchema = z
  .string()
  .trim()
  .url('Введите корректную ссылку на обложку')
  .refine((value) => value.startsWith('https://') || value.startsWith('http://'), {
    message: 'Обложка должна использовать ссылку http:// или https://'
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

const musicBaseInputSchema = z
  .object({
    title: z.string().trim().min(1, 'Введите название').max(MAX_TITLE_LENGTH),
    type: musicTypeSchema,
    year: z.number().int().min(1800).max(2200).nullable(),
    coverUrl: coverUrlSchema,
    artists: stringListSchema(MAX_ARTISTS),
    album: z.string().trim().max(MAX_TITLE_LENGTH),
    durationSeconds: z.number().int().min(1).max(604_800).nullable(),
    trackCount: z.number().int().min(1).max(10_000).nullable(),
    genres: stringListSchema(MAX_GENRES),
    description: z.string().trim().max(MAX_DESCRIPTION_LENGTH),
    status: musicStatusSchema,
    favorite: z.boolean(),
    rating: ratingSchema,
    comments: z.string().trim().max(MAX_TEXT_LENGTH)
  })
  .strict()

function validateRating(
  input: { status: string; rating: number | null },
  context: z.RefinementCtx
): void {
  if (input.status !== 'listened' && input.rating !== null) {
    context.addIssue({
      code: 'custom',
      path: ['rating'],
      message: 'Оценка доступна только для прослушанной музыки'
    })
  }
}

export const createMusicItemInputSchema = musicBaseInputSchema.superRefine(validateRating)

export const createMusicItemsInputSchema = z
  .object({ items: z.array(createMusicItemInputSchema).min(1).max(100) })
  .strict()

export const updateMusicItemInputSchema = musicBaseInputSchema
  .extend({ id: musicSafeIdSchema })
  .strict()
  .superRefine(validateRating)

export const getMusicItemInputSchema = z.object({ id: musicSafeIdSchema }).strict()
export const deleteMusicItemInputSchema = getMusicItemInputSchema

const musicPlaylistNameSchema = z
  .string()
  .trim()
  .min(1, 'Введите название плейлиста')
  .max(120, 'Название плейлиста слишком длинное')

export const createMusicPlaylistInputSchema = z.object({ name: musicPlaylistNameSchema }).strict()
export const updateMusicPlaylistInputSchema = z
  .object({ id: musicSafeIdSchema, name: musicPlaylistNameSchema })
  .strict()
export const deleteMusicPlaylistInputSchema = z.object({ id: musicSafeIdSchema }).strict()
export const setMusicItemPlaylistsInputSchema = z
  .object({
    itemId: musicSafeIdSchema,
    playlistIds: z
      .array(musicSafeIdSchema)
      .max(MAX_PLAYLISTS_PER_TRACK)
      .transform((ids) => Array.from(new Set(ids)))
  })
  .strict()

export const musicWebSearchInputSchema = z
  .object({ query: z.string().trim().min(1).max(300) })
  .strict()
