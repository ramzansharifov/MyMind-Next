import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import type { MovieStatus, MovieType } from '../../../shared/contracts/movies'

export const movies = sqliteTable(
  'movies',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    originalTitle: text('original_title'),
    type: text('type').$type<MovieType>().notNull().default('movie'),
    year: integer('year'),
    posterUrl: text('poster_url'),
    director: text('director').notNull().default(''),
    runtimeMinutes: integer('runtime_minutes'),
    genresJson: text('genres_json').notNull().default('[]'),
    actorsJson: text('actors_json').notNull().default('[]'),
    description: text('description').notNull().default(''),
    status: text('status').$type<MovieStatus>().notNull().default('watchlist'),
    favorite: integer('favorite', { mode: 'boolean' }).notNull().default(false),
    rating: integer('rating'),
    comments: text('comments').notNull().default(''),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
  },
  (table) => [
    index('movies_status_updated_idx').on(table.status, table.updatedAt),
    index('movies_favorite_updated_idx').on(table.favorite, table.updatedAt),
    index('movies_title_idx').on(table.title)
  ]
)
