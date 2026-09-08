// Additive migration for native Notes persistence. V1 remains immutable.
export const mobileSchemaV2: readonly string[] = [
  `CREATE TABLE note_groups (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    icon TEXT DEFAULT 'folder' NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE notes (
    id TEXT PRIMARY KEY NOT NULL,
    group_id TEXT,
    title TEXT NOT NULL,
    document TEXT NOT NULL,
    plain_text TEXT DEFAULT '' NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (group_id) REFERENCES note_groups(id) ON UPDATE NO ACTION ON DELETE SET NULL
  )`,
  'CREATE INDEX note_groups_title_idx ON note_groups (title)',
  'CREATE INDEX notes_group_updated_idx ON notes (group_id, updated_at)',
  'CREATE INDEX notes_title_idx ON notes (title)'
]
