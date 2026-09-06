// Additive migration for native Study persistence. Previous schema versions remain immutable.
export const mobileSchemaV3: readonly string[] = [
  `CREATE TABLE study_nodes (
    id TEXT PRIMARY KEY NOT NULL,
    type TEXT NOT NULL,
    parent_id TEXT,
    title TEXT NOT NULL,
    icon TEXT,
    position INTEGER NOT NULL,
    is_expanded INTEGER DEFAULT 1 NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (parent_id) REFERENCES study_nodes(id) ON UPDATE NO ACTION ON DELETE CASCADE
  )`,
  `CREATE TABLE study_materials (
    node_id TEXT PRIMARY KEY NOT NULL,
    document TEXT NOT NULL,
    plain_text TEXT DEFAULT '' NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (node_id) REFERENCES study_nodes(id) ON UPDATE NO ACTION ON DELETE CASCADE
  )`,
  `CREATE TABLE study_code_node_names (
    node_id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    name_key TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (node_id) REFERENCES study_nodes(id) ON UPDATE NO ACTION ON DELETE CASCADE
  )`,
  `CREATE TABLE study_code_block_names (
    block_id TEXT PRIMARY KEY NOT NULL,
    material_id TEXT NOT NULL,
    name TEXT NOT NULL,
    name_key TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (material_id) REFERENCES study_nodes(id) ON UPDATE NO ACTION ON DELETE CASCADE
  )`,
  `CREATE TABLE study_link_targets (
    id TEXT PRIMARY KEY NOT NULL,
    kind TEXT NOT NULL,
    material_id TEXT NOT NULL,
    heading_id TEXT,
    title TEXT NOT NULL,
    title_search TEXT DEFAULT '' NOT NULL,
    material_title TEXT DEFAULT '' NOT NULL,
    material_title_search TEXT DEFAULT '' NOT NULL,
    folder_path TEXT DEFAULT '[]' NOT NULL,
    folder_path_search TEXT DEFAULT '' NOT NULL,
    heading_level INTEGER,
    position INTEGER NOT NULL,
    search_text TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (material_id) REFERENCES study_nodes(id) ON UPDATE NO ACTION ON DELETE CASCADE
  )`,
  'CREATE INDEX study_nodes_parent_position_idx ON study_nodes (parent_id, position)',
  'CREATE INDEX study_nodes_title_idx ON study_nodes (title)',
  'CREATE UNIQUE INDEX study_code_node_names_key_unique ON study_code_node_names (name_key)',
  'CREATE UNIQUE INDEX study_code_block_names_material_key_unique ON study_code_block_names (material_id, name_key)',
  'CREATE INDEX study_code_block_names_material_idx ON study_code_block_names (material_id)',
  'CREATE INDEX study_link_targets_material_position_idx ON study_link_targets (material_id, position)'
]
