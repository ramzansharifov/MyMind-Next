import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import type { MusicStatus, MusicType } from '../../../shared/contracts/music'

export const musicItems = sqliteTable(
  'music_items',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    type: text('type').$type<MusicType>().notNull().default('track'),
    year: integer('year'),
    coverUrl: text('cover_url'),
    artistsJson: text('artists_json').notNull().default('[]'),
    album: text('album').notNull().default(''),
    durationSeconds: integer('duration_seconds'),
    trackCount: integer('track_count'),
    genresJson: text('genres_json').notNull().default('[]'),
    description: text('description').notNull().default(''),
    status: text('status').$type<MusicStatus>().notNull().default('want_to_listen'),
    favorite: integer('favorite', { mode: 'boolean' }).notNull().default(false),
    rating: integer('rating'),
    comments: text('comments').notNull().default(''),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
  },
  (table) => [
    index('music_items_status_updated_idx').on(table.status, table.updatedAt),
    index('music_items_favorite_updated_idx').on(table.favorite, table.updatedAt),
    index('music_items_title_idx').on(table.title)
  ]
)
