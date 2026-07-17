import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
  type AnySQLiteColumn
} from 'drizzle-orm/sqlite-core'

import type { BoardNodeType, BoardSnapshot } from '../../../shared/contracts/boards'
import { studyNodes } from './study'

export const boardNodes = sqliteTable(
  'board_nodes',
  {
    id: text('id').primaryKey(),
    type: text('type').$type<BoardNodeType>().notNull(),
    parentId: text('parent_id').references((): AnySQLiteColumn => boardNodes.id, {
      onDelete: 'cascade'
    }),
    title: text('title').notNull(),
    position: integer('position').notNull().default(0),
    isExpanded: integer('is_expanded', { mode: 'boolean' }).notNull().default(true),
    isSystem: integer('is_system', { mode: 'boolean' }).notNull().default(false),
    sourceStudyNodeId: text('source_study_node_id').references(() => studyNodes.id, {
      onDelete: 'cascade'
    }),
    sourceMaterialId: text('source_material_id').references(() => studyNodes.id, {
      onDelete: 'cascade'
    }),
    sourceBlockId: text('source_block_id'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
  },
  (table) => [
    index('board_nodes_parent_position_idx').on(table.parentId, table.position),
    uniqueIndex('board_nodes_source_study_node_unique').on(table.sourceStudyNodeId),
    uniqueIndex('board_nodes_source_material_block_unique').on(
      table.sourceMaterialId,
      table.sourceBlockId
    )
  ]
)

export const boardDocuments = sqliteTable('board_documents', {
  nodeId: text('node_id')
    .primaryKey()
    .references(() => boardNodes.id, { onDelete: 'cascade' }),
  snapshot: text('snapshot', { mode: 'json' }).$type<BoardSnapshot | null>(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull()
})
