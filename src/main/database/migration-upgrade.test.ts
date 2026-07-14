import Database from 'better-sqlite3'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const statementBreakpoint = '--> statement-breakpoint'

describe('study link target migration upgrade', () => {
  it('preserves an existing material while upgrading from migration 0003', async () => {
    const sqlite = new Database(':memory:')
    sqlite.pragma('foreign_keys = ON')

    try {
      for (const migration of [
        '0000_rare_umar.sql',
        '0001_regular_iron_lad.sql',
        '0002_orange_young_avengers.sql',
        '0003_flowery_beast.sql'
      ]) {
        await executeMigration(sqlite, migration)
      }

      const now = Date.now()
      const document = JSON.stringify({
        version: 1,
        blocks: [{ id: 'existing-text', type: 'text', text: 'Existing document' }]
      })
      sqlite
        .prepare(
          'INSERT INTO study_nodes (id, type, parent_id, title, icon, position, is_expanded, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )
        .run('existing-material', 'material', null, 'Existing', null, 0, 1, now, now)
      sqlite
        .prepare(
          'INSERT INTO study_materials (node_id, document, plain_text, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
        )
        .run('existing-material', document, 'Existing document', now, now)

      await executeMigration(sqlite, '0004_typical_deathbird.sql')
      await executeMigration(sqlite, '0005_cooing_roland_deschain.sql')

      const stored = sqlite
        .prepare('SELECT document, plain_text FROM study_materials WHERE node_id = ?')
        .get('existing-material')
      const columns = sqlite.prepare('PRAGMA table_info(study_link_targets)').all()

      expect(stored).toEqual({ document, plain_text: 'Existing document' })
      expect(columns).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'title_search' }),
          expect.objectContaining({ name: 'material_title' }),
          expect.objectContaining({ name: 'material_title_search' }),
          expect.objectContaining({ name: 'folder_path' }),
          expect.objectContaining({ name: 'folder_path_search' })
        ])
      )
    } finally {
      sqlite.close()
    }
  })
})

async function executeMigration(sqlite: Database.Database, fileName: string): Promise<void> {
  const source = await readFile(resolve(process.cwd(), 'drizzle', fileName), 'utf8')

  for (const statement of source.split(statementBreakpoint)) {
    if (statement.trim()) sqlite.exec(statement)
  }
}
