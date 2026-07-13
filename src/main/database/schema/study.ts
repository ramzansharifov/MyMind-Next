import { index, integer, sqliteTable, text, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core'
import { STUDY_FOLDER_ICON_NAMES } from '../../../shared/contracts/study'

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
      enum: STUDY_FOLDER_ICON_NAMES
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
export const studyLinkTargets = sqliteTable(
  'study_link_targets',
  {
    id: text('id').primaryKey(),
    kind: text('kind', {
      enum: ['material', 'heading']
    }).notNull(),
    materialId: text('material_id')
      .notNull()
      .references(() => studyNodes.id, {
        onDelete: 'cascade'
      }),
    headingId: text('heading_id'),
    title: text('title').notNull(),
    headingLevel: integer('heading_level'),
    position: integer('position').notNull(),
    searchText: text('search_text').notNull(),
    updatedAt: integer('updated_at', {
      mode: 'timestamp_ms'
    }).notNull()
  },
  (table) => [
    index('study_link_targets_material_position_idx').on(table.materialId, table.position),
    index('study_link_targets_search_idx').on(table.searchText)
  ]
)
