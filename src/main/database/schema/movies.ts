import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import type { MovieStatus } from '../../../shared/contracts/movies'

export const movies = sqliteTable(
  'movies',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    originalTitle: text('original_title'),
    year: integer('year'),
    posterUrl: text('poster_url'),
    director: text('director').notNull().default(''),
    runtimeMinutes: integer('runtime_minutes'),
    genresJson: text('genres_json').notNull().default('[]'),
    description: text('description').notNull().default(''),
    status: text('status').$type<MovieStatus>().notNull().default('watchlist'),
    favorite: integer('favorite', { mode: 'boolean' }).notNull().default(false),
    rating: real('rating'),
    watchedAt: integer('watched_at', { mode: 'timestamp_ms' }),
    notes: text('notes').notNull().default(''),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
  },
  (table) => [
    index('movies_status_updated_idx').on(table.status, table.updatedAt),
    index('movies_favorite_updated_idx').on(table.favorite, table.updatedAt),
    index('movies_title_idx').on(table.title)
  ]
)
