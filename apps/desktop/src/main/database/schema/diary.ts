import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

import type {
  DiaryCoverTone,
  DiaryIconName,
  DiaryMood,
  DiaryPaperPattern,
  DiaryPaperTone
} from '../../../shared/contracts/diary'

export const diaries = sqliteTable(
  'diaries',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    icon: text('icon').$type<DiaryIconName>().notNull(),
    paperPattern: text('paper_pattern').$type<DiaryPaperPattern>().notNull().default('ruled'),
    paperTone: text('paper_tone').$type<DiaryPaperTone>().notNull().default('natural'),
    coverTone: text('cover_tone').$type<DiaryCoverTone>().notNull().default('walnut'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
  },
  (table) => [index('diaries_updated_idx').on(table.updatedAt)]
)

export const diaryDays = sqliteTable(
  'diary_days',
  {
    id: text('id').primaryKey(),
    diaryId: text('diary_id')
      .notNull()
      .references(() => diaries.id, { onDelete: 'cascade' }),
    dayKey: text('day_key').notNull(),
    mood: text('mood').$type<DiaryMood>(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
  },
  (table) => [
    uniqueIndex('diary_days_diary_day_uq').on(table.diaryId, table.dayKey),
    index('diary_days_diary_day_idx').on(table.diaryId, table.dayKey),
    index('diary_days_diary_updated_idx').on(table.diaryId, table.updatedAt)
  ]
)

export const diaryEntries = sqliteTable(
  'diary_entries',
  {
    id: text('id').primaryKey(),
    diaryDayId: text('diary_day_id')
      .notNull()
      .references(() => diaryDays.id, { onDelete: 'cascade' }),
    text: text('text').notNull(),
    occurredAt: integer('occurred_at', { mode: 'timestamp_ms' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
  },
  (table) => [
    index('diary_entries_day_time_idx').on(table.diaryDayId, table.occurredAt),
    index('diary_entries_updated_idx').on(table.updatedAt)
  ]
)
