import { z } from 'zod'

const MUSIC_SAFE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/
const MAX_TITLE_LENGTH = 200
const MAX_ARTIST_LENGTH = 120
const MAX_PLAYLISTS_PER_TRACK = 100

export const musicSafeIdSchema = z
  .string()
  .regex(MUSIC_SAFE_ID_PATTERN, 'Некорректный идентификатор музыкальной записи')

const coverUrlSchema = z
  .string()
  .trim()
  .url('Введите корректную ссылку на обложку')
  .refine((value) => value.startsWith('https://') || value.startsWith('http://'), {
    message: 'Обложка должна использовать ссылку http:// или https://'
  })
  .nullable()

const musicBaseInputSchema = z
  .object({
    title: z.string().trim().min(1, 'Введите название').max(MAX_TITLE_LENGTH),
    artist: z.string().trim().min(1, 'Введите исполнителя').max(MAX_ARTIST_LENGTH),
    year: z.number().int().min(1800).max(2200).nullable(),
    durationSeconds: z.number().int().min(1).max(604_800).nullable(),
    favorite: z.boolean()
  })
  .strict()

export const createMusicItemInputSchema = musicBaseInputSchema

export const createMusicItemsInputSchema = z
  .object({ items: z.array(createMusicItemInputSchema).min(1).max(100) })
  .strict()

export const updateMusicItemInputSchema = musicBaseInputSchema
  .extend({ id: musicSafeIdSchema })
  .strict()

export const getMusicItemInputSchema = z.object({ id: musicSafeIdSchema }).strict()
export const deleteMusicItemInputSchema = getMusicItemInputSchema

const musicPlaylistNameSchema = z
  .string()
  .trim()
  .min(1, 'Введите название плейлиста')
  .max(120, 'Название плейлиста слишком длинное')

const musicPlaylistFieldsSchema = z.object({
  name: musicPlaylistNameSchema,
  coverUrl: coverUrlSchema.optional().default(null)
})

export const createMusicPlaylistInputSchema = musicPlaylistFieldsSchema.strict()
export const updateMusicPlaylistInputSchema = musicPlaylistFieldsSchema
  .extend({ id: musicSafeIdSchema })
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
