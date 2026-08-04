import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import type { NoteDocument } from '../../../shared/contracts/notes'
import type { StudyFolderIconName } from '../../../shared/contracts/study'

export const noteGroups = sqliteTable(
  'note_groups',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    icon: text('icon').$type<StudyFolderIconName>().notNull().default('folder'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
  },
  (table) => [index('note_groups_title_idx').on(table.title)]
)

export const notes = sqliteTable(
  'notes',
  {
    id: text('id').primaryKey(),
    groupId: text('group_id').references(() => noteGroups.id, {
      onDelete: 'set null'
    }),
    title: text('title').notNull(),
    document: text('document', { mode: 'json' }).$type<NoteDocument>().notNull(),
    plainText: text('plain_text').notNull().default(''),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
  },
  (table) => [
    index('notes_group_updated_idx').on(table.groupId, table.updatedAt),
    index('notes_title_idx').on(table.title)
  ]
)
