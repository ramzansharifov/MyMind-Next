import Database from 'better-sqlite3'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const statementBreakpoint = '--> statement-breakpoint'

async function executeMigration(sqlite: Database.Database, filename: string): Promise<void> {
  const sql = await readFile(resolve(process.cwd(), 'drizzle', filename), 'utf8')
  for (const statement of sql.split(statementBreakpoint)) {
    const trimmed = statement.trim()
    if (trimmed) sqlite.exec(trimmed)
  }
}

describe('habits simplify fields migration', () => {
  it('removes legacy fields while preserving habits, entries and foreign keys', async () => {
    const sqlite = new Database(':memory:')

    try {
      sqlite.pragma('foreign_keys = ON')
      await executeMigration(sqlite, '0027_habits_module.sql')

      sqlite
        .prepare(
          `INSERT INTO habit_groups (id, name, icon, color, position, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run('group-1', 'Здоровье', 'heart-pulse', 'emerald', 0, 1, 1)

      sqlite
        .prepare(
          `INSERT INTO habits (
            id, title, description, group_id, status, tracking_type, target_value, unit,
            repeat_every_days, start_date, end_date, preferred_time, archived_on, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          'habit-1',
          'Пить воду',
          'Старое описание',
          'group-1',
          'archived',
          'count',
          8,
          'стаканов',
          2,
          '2026-08-01',
          '2026-12-31',
          '09:00',
          '2026-08-10',
          1_775_260_800_000,
          1_775_260_900_000
        )

      sqlite
        .prepare(
          `INSERT INTO habit_entries (id, habit_id, date, value, skipped, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run('entry-1', 'habit-1', '2026-08-03', 7, 0, 3, 4)

      await executeMigration(sqlite, '0032_habits_simplify_fields.sql')

      const columns = sqlite.prepare('PRAGMA table_info(habits)').all() as Array<{ name: string }>
      const columnNames = columns.map((column) => column.name)
      const habit = sqlite.prepare('SELECT * FROM habits WHERE id = ?').get('habit-1')
      const entry = sqlite.prepare('SELECT * FROM habit_entries WHERE id = ?').get('entry-1')
      const foreignKeyProblems = sqlite.prepare('PRAGMA foreign_key_check').all()

      expect(columnNames).not.toContain('description')
      expect(columnNames).not.toContain('status')
      expect(columnNames).not.toContain('start_date')
      expect(columnNames).not.toContain('end_date')
      expect(columnNames).not.toContain('archived_on')
      expect(columnNames).toEqual(
        expect.arrayContaining([
          'id',
          'title',
          'group_id',
          'tracking_type',
          'target_value',
          'unit',
          'repeat_every_days',
          'preferred_time',
          'created_at',
          'updated_at'
        ])
      )
      expect(habit).toMatchObject({
        id: 'habit-1',
        title: 'Пить воду',
        group_id: 'group-1',
        tracking_type: 'count',
        target_value: 8,
        unit: 'стаканов',
        repeat_every_days: 2,
        preferred_time: '09:00',
        created_at: 1_775_260_800_000,
        updated_at: 1_775_260_900_000
      })
      expect(entry).toMatchObject({
        id: 'entry-1',
        habit_id: 'habit-1',
        date: '2026-08-03',
        value: 7,
        skipped: 0
      })
      expect(foreignKeyProblems).toEqual([])
    } finally {
      sqlite.close()
    }
  })
})
