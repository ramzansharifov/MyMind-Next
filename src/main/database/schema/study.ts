import { index, integer, sqliteTable, text, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core'

export const studyNodes = sqliteTable(
  'study_nodes',
  {
    id: text('id').primaryKey(),
    type: text('type', {
      enum: ['folder', 'material']
    }).notNull(),
    parentId: text('parent_id').references((): AnySQLiteColumn => studyNodes.id, {
      onDelete: 'cascade'
    }),
    title: text('title').notNull(),
    icon: text('icon', {
      enum: [
        'folder',
        'book',
        'graduation',
        'science',
        'calculator',
        'code',
        'languages',
        'history',
        'microscope',
        'art',
        'music',
        'work'
      ]
    }),
    position: integer('position').notNull(),
    isExpanded: integer('is_expanded', {
      mode: 'boolean'
    })
      .notNull()
      .default(true),
    createdAt: integer('created_at', {
      mode: 'timestamp_ms'
    }).notNull(),
    updatedAt: integer('updated_at', {
      mode: 'timestamp_ms'
    }).notNull()
  },
  (table) => [
    index('study_nodes_parent_position_idx').on(table.parentId, table.position),
    index('study_nodes_title_idx').on(table.title)
  ]
)

export const studyMaterials = sqliteTable('study_materials', {
  nodeId: text('node_id')
    .primaryKey()
    .references(() => studyNodes.id, {
      onDelete: 'cascade'
    }),
  document: text('document', {
    mode: 'json'
  }).notNull(),
  plainText: text('plain_text').notNull().default(''),
  createdAt: integer('created_at', {
    mode: 'timestamp_ms'
  }).notNull(),
  updatedAt: integer('updated_at', {
    mode: 'timestamp_ms'
  }).notNull()
})
