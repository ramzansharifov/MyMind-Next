// Additive migration for native Boards persistence. Previous schema versions remain immutable.
export const mobileSchemaV4: readonly string[] = [
  `CREATE TABLE board_nodes (
    id TEXT PRIMARY KEY NOT NULL,
    type TEXT NOT NULL,
    parent_id TEXT,
    title TEXT NOT NULL,
    icon TEXT,
    position INTEGER DEFAULT 0 NOT NULL,
    is_expanded INTEGER DEFAULT 1 NOT NULL,
    is_system INTEGER DEFAULT 0 NOT NULL,
    source_study_node_id TEXT,
    source_material_id TEXT,
    source_note_id TEXT,
    source_block_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (parent_id) REFERENCES board_nodes(id) ON UPDATE NO ACTION ON DELETE CASCADE,
    FOREIGN KEY (source_study_node_id) REFERENCES study_nodes(id) ON UPDATE NO ACTION ON DELETE CASCADE,
    FOREIGN KEY (source_material_id) REFERENCES study_nodes(id) ON UPDATE NO ACTION ON DELETE CASCADE,
    FOREIGN KEY (source_note_id) REFERENCES notes(id) ON UPDATE NO ACTION ON DELETE CASCADE
  )`,
  `CREATE TABLE board_documents (
    node_id TEXT PRIMARY KEY NOT NULL,
    snapshot TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (node_id) REFERENCES board_nodes(id) ON UPDATE NO ACTION ON DELETE CASCADE
  )`,
  'CREATE INDEX board_nodes_parent_position_idx ON board_nodes (parent_id, position)',
  'CREATE UNIQUE INDEX board_nodes_source_study_node_unique ON board_nodes (source_study_node_id)',
  'CREATE UNIQUE INDEX board_nodes_source_material_block_unique ON board_nodes (source_material_id, source_block_id)',
  'CREATE UNIQUE INDEX board_nodes_source_note_block_unique ON board_nodes (source_note_id, source_block_id)'
]
