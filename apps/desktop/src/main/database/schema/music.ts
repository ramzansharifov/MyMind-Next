import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'

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

export const musicPlaylists = sqliteTable(
  'music_playlists',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    coverUrl: text('cover_url'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
  },
  (table) => [
    index('music_playlists_name_idx').on(table.name),
    index('music_playlists_updated_idx').on(table.updatedAt)
  ]
)

export const musicPlaylistItems = sqliteTable(
  'music_playlist_items',
  {
    playlistId: text('playlist_id')
      .notNull()
      .references(() => musicPlaylists.id, { onDelete: 'cascade' }),
    musicItemId: text('music_item_id')
      .notNull()
      .references(() => musicItems.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull()
  },
  (table) => [
    primaryKey({ columns: [table.playlistId, table.musicItemId] }),
    index('music_playlist_items_music_item_idx').on(table.musicItemId)
  ]
)
