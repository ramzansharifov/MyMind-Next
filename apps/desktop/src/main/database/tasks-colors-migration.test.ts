import Database from 'better-sqlite3'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { mobileSchemaV1 } from '@mymind/persistence/mobile-schema'
import { mobileSchemaV9 } from '@mymind/persistence/mobile-schema-v9'

describe('task group colors migration', () => {
  it.each(['desktop', 'mobile'])(
    'removes saved colors and preserves groups and tasks on %s',
    (platform) => {
      const sqlite = new Database(':memory:')
      sqlite.pragma('foreign_keys = ON')
      try {
        const statements =
          platform === 'desktop'
            ? [readFileSync(resolve('drizzle/0026_tasks_module.sql'), 'utf8')]
            : mobileSchemaV1
        for (const statement of statements) sqlite.exec(statement)
        sqlite.exec(`
        INSERT INTO task_groups (id, name, icon, color, position, created_at, updated_at)
        VALUES ('group-1', 'Работа', 'briefcase', 'blue', 2, 100, 200);
        INSERT INTO tasks (id, title, group_id, created_at, updated_at)
        VALUES ('task-1', 'Отчёт', 'group-1', 100, 200);
      `)
        const migration =
          platform === 'desktop'
            ? [readFileSync(resolve('drizzle/0045_task_groups_accent.sql'), 'utf8')]
            : mobileSchemaV9
        for (const statement of migration) sqlite.exec(statement)
        expect(sqlite.prepare('SELECT * FROM task_groups').get()).toEqual({
          id: 'group-1',
          name: 'Работа',
          icon: 'briefcase',
          position: 2,
          created_at: 100,
          updated_at: 200
        })
        expect(sqlite.prepare('SELECT title, group_id FROM tasks').get()).toEqual({
          title: 'Отчёт',
          group_id: 'group-1'
        })
        expect(sqlite.pragma('foreign_key_check')).toEqual([])
        sqlite.prepare("DELETE FROM task_groups WHERE id = 'group-1'").run()
        expect(sqlite.prepare('SELECT group_id FROM tasks').get()).toEqual({ group_id: null })
      } finally {
        sqlite.close()
      }
    }
  )
})
