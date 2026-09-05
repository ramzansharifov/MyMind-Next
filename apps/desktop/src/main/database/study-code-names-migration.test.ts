import Database from 'better-sqlite3'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const statementBreakpoint = '--> statement-breakpoint'

describe('study Code Mode readable names migration', () => {
  it('adds identity tables without changing existing study data', async () => {
    const sqlite = new Database(':memory:')
    sqlite.pragma('foreign_keys = ON')

    try {
      for (const migration of [
        '0000_rare_umar.sql',
        '0001_regular_iron_lad.sql',
        '0002_orange_young_avengers.sql',
        '0003_flowery_beast.sql',
        '0004_typical_deathbird.sql',
        '0005_cooing_roland_deschain.sql',
        '0006_nasty_the_executioner.sql'
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

      await executeMigration(sqlite, '0031_study_code_names.sql')

      expect(
        sqlite.prepare('SELECT title FROM study_nodes WHERE id = ?').get('existing-material')
      ).toEqual({ title: 'Existing' })
      expect(
        sqlite.prepare('SELECT document FROM study_materials WHERE node_id = ?').get('existing-material')
      ).toEqual({ document })

      const tables = sqlite
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
        .all() as Array<{ name: string }>
      expect(tables.map((table) => table.name)).toEqual(
        expect.arrayContaining(['study_code_node_names', 'study_code_block_names'])
      )

      const nodeIndexes = sqlite.prepare('PRAGMA index_list(study_code_node_names)').all()
      const blockIndexes = sqlite.prepare('PRAGMA index_list(study_code_block_names)').all()
      expect(nodeIndexes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'study_code_node_names_key_unique', unique: 1 })
        ])
      )
      expect(blockIndexes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'study_code_block_names_material_key_unique',
            unique: 1
          }),
          expect.objectContaining({ name: 'study_code_block_names_material_idx' })
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
