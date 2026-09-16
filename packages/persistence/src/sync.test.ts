import Database from 'better-sqlite3'
import { describe, expect, it } from 'vitest'
import type { SqlDatabasePort } from '@mymind/contracts/storage'
import { mobileSchemaV1 } from './mobile-schema'
import { mobileSchemaV2 } from './mobile-schema-v2'
import { mobileSchemaV3 } from './mobile-schema-v3'
import { mobileSchemaV4 } from './mobile-schema-v4'
import { mobileSchemaV5 } from './mobile-schema-v5'
import { mobileSchemaV6 } from './mobile-schema-v6'
import { mobileSchemaV7 } from './mobile-schema-v7'
import { mobileSchemaV8 } from './mobile-schema-v8'
import {
  applySyncSnapshot,
  captureSyncSnapshot,
  ensureSyncInfrastructure,
  mergeSyncSnapshots,
  summarizeSyncMerge
} from './sync'

function createDatabase(): Database.Database {
  const db = new Database(':memory:')
  db.pragma('foreign_keys = ON')
  for (const migration of [
    mobileSchemaV1,
    mobileSchemaV2,
    mobileSchemaV3,
    mobileSchemaV4,
    mobileSchemaV5,
    mobileSchemaV6,
    mobileSchemaV7,
    mobileSchemaV8
  ]) {
    for (const sql of migration) db.exec(sql)
  }
  return db
}

function adapt(db: Database.Database): SqlDatabasePort {
  return {
    prepare(sql) {
      const statement = db.prepare(sql)
      return {
        get: (...parameters) => statement.get(...parameters),
        all: (...parameters) => statement.all(...parameters) as unknown[],
        run: (...parameters) => {
          const result = statement.run(...parameters)
          return { changes: result.changes }
        }
      }
    },
    transaction(operation) {
      return db.transaction(operation)
    }
  }
}

describe('LAN sync snapshot merge', () => {
  it('uses the newest row update and converges both databases', () => {
    const left = createDatabase()
    const right = createDatabase()
    try {
      const leftDb = adapt(left)
      const rightDb = adapt(right)
      ensureSyncInfrastructure(leftDb)
      ensureSyncInfrastructure(rightDb)

      left
        .prepare(
          `INSERT INTO tasks(
            id, title, description, group_id, status, priority, due_date, due_time,
            completed_at, created_at, updated_at
          ) VALUES (?, ?, '', NULL, 'active', 'normal', NULL, NULL, NULL, ?, ?)`
        )
        .run('task-1', 'Слева', 100, 200)
      right
        .prepare(
          `INSERT INTO tasks(
            id, title, description, group_id, status, priority, due_date, due_time,
            completed_at, created_at, updated_at
          ) VALUES (?, ?, '', NULL, 'active', 'normal', NULL, NULL, NULL, ?, ?)`
        )
        .run('task-1', 'Справа', 100, 300)

      const leftSnapshot = captureSyncSnapshot(leftDb, ['tasks'], 1000)
      const rightSnapshot = captureSyncSnapshot(rightDb, ['tasks'], 1000)
      const merged = mergeSyncSnapshots(leftSnapshot, rightSnapshot, 1001)

      applySyncSnapshot(leftDb, merged.snapshot)
      applySyncSnapshot(rightDb, merged.snapshot)

      expect(left.prepare('SELECT title FROM tasks WHERE id = ?').get('task-1')).toEqual({
        title: 'Справа'
      })
      expect(right.prepare('SELECT title FROM tasks WHERE id = ?').get('task-1')).toEqual({
        title: 'Справа'
      })
      expect(captureSyncSnapshot(leftDb, ['tasks']).modules).toEqual(
        captureSyncSnapshot(rightDb, ['tasks']).modules
      )
    } finally {
      left.close()
      right.close()
    }
  })

  it('tracks deletions so removed rows do not resurrect', () => {
    const left = createDatabase()
    const right = createDatabase()
    try {
      const leftDb = adapt(left)
      const rightDb = adapt(right)
      ensureSyncInfrastructure(leftDb)
      ensureSyncInfrastructure(rightDb)

      for (const db of [left, right]) {
        db.prepare(
          `INSERT INTO tasks(
            id, title, description, group_id, status, priority, due_date, due_time,
            completed_at, created_at, updated_at
          ) VALUES ('task-delete', 'Удалить', '', NULL, 'active', 'normal', NULL, NULL, NULL, 1, 1)`
        ).run()
      }
      left.prepare("DELETE FROM tasks WHERE id = 'task-delete'").run()

      const local = captureSyncSnapshot(leftDb, ['tasks'])
      const remote = captureSyncSnapshot(rightDb, ['tasks'])
      const merged = mergeSyncSnapshots(local, remote)

      expect(merged.snapshot.modules[0]?.tables.find((table) => table.table === 'tasks')).toMatchObject({
        rows: [],
        tombstones: [{ key: '["task-delete"]' }]
      })

      applySyncSnapshot(rightDb, merged.snapshot)
      expect(right.prepare("SELECT COUNT(*) AS count FROM tasks WHERE id = 'task-delete'").get()).toEqual({
        count: 0
      })
    } finally {
      left.close()
      right.close()
    }
  })

  it('reports two-way changes per selected module', () => {
    const left = createDatabase()
    const right = createDatabase()
    try {
      const leftDb = adapt(left)
      const rightDb = adapt(right)
      ensureSyncInfrastructure(leftDb)
      ensureSyncInfrastructure(rightDb)

      left.prepare(
        `INSERT INTO tasks(
          id, title, description, group_id, status, priority, due_date, due_time,
          completed_at, created_at, updated_at
        ) VALUES ('left-task', 'Локальная', '', NULL, 'active', 'normal', NULL, NULL, NULL, 10, 10)`
      ).run()
      right.prepare(
        `INSERT INTO tasks(
          id, title, description, group_id, status, priority, due_date, due_time,
          completed_at, created_at, updated_at
        ) VALUES ('right-task', 'Удалённая', '', NULL, 'active', 'normal', NULL, NULL, NULL, 20, 20)`
      ).run()

      const local = captureSyncSnapshot(leftDb, ['tasks'])
      const remote = captureSyncSnapshot(rightDb, ['tasks'])
      const merged = mergeSyncSnapshots(local, remote)
      expect(summarizeSyncMerge(local, remote, merged.snapshot, merged.conflicts)).toEqual([
        {
          module: 'tasks',
          received: 1,
          sent: 1,
          deleted: 0,
          conflicts: 0
        }
      ])
    } finally {
      left.close()
      right.close()
    }
  })

  it('canonicalizes workout photo URLs so platform paths do not create conflicts', () => {
    const left = createDatabase()
    const right = createDatabase()
    try {
      const leftDb = adapt(left)
      const rightDb = adapt(right)
      ensureSyncInfrastructure(leftDb)
      ensureSyncInfrastructure(rightDb)

      for (const [db, url] of [
        [left, 'mymind-asset://local/workout-progress-entry-1/asset-1/progress.jpg'],
        [right, 'file:///data/user/0/com.mymind.mobile/files/workout-progress/entry-1/asset-1/progress.jpg']
      ] as const) {
        db.prepare(
          `INSERT INTO workout_progress_entries(
            id, date, body_weight_milli_kg, wellbeing, notes, created_at, updated_at
          ) VALUES ('entry-1', '2026-09-16', NULL, '', '', 10, 10)`
        ).run()
        db.prepare(
          `INSERT INTO workout_progress_photos(
            id, entry_id, asset_id, file_name, mime_type, size, url, view, created_at
          ) VALUES ('photo-1', 'entry-1', 'asset-1', 'progress.jpg', 'image/jpeg', 12, ?, 'custom', 10)`
        ).run(url)
      }

      const leftSnapshot = captureSyncSnapshot(leftDb, ['workouts'])
      const rightSnapshot = captureSyncSnapshot(rightDb, ['workouts'])
      const leftPhoto = leftSnapshot.modules[0]?.tables
        .find((table) => table.table === 'workout_progress_photos')
        ?.rows[0]
      const rightPhoto = rightSnapshot.modules[0]?.tables
        .find((table) => table.table === 'workout_progress_photos')
        ?.rows[0]

      expect(leftPhoto?.data.url).toBe(
        'mymind-sync://workouts/entry-1/asset-1/progress.jpg'
      )
      expect(rightPhoto).toEqual(leftPhoto)
      expect(mergeSyncSnapshots(leftSnapshot, rightSnapshot).conflicts.get('workouts')).toBe(0)
    } finally {
      left.close()
      right.close()
    }
  })

  it('keeps a password vault lineage stable when the master-password wrapper changes', () => {
    const left = createDatabase()
    const right = createDatabase()
    try {
      const leftDb = adapt(left)
      const rightDb = adapt(right)
      ensureSyncInfrastructure(leftDb)
      ensureSyncInfrastructure(rightDb)

      const insertVault = (db: Database.Database): void => {
        db.prepare(
          `INSERT INTO password_vault(
            id, version, kdf_salt, kdf_n, kdf_r, kdf_p,
            wrapped_key_nonce, wrapped_key_ciphertext, wrapped_key_tag,
            created_at, updated_at
          ) VALUES ('default', 1, 'salt', 32768, 8, 1, 'nonce', 'cipher', 'tag', 10, 10)`
        ).run()
      }
      insertVault(left)
      insertVault(right)

      const before = left
        .prepare("SELECT identity FROM password_vault_sync_identity WHERE id = 'default'")
        .get() as { identity: string }
      expect(
        right
          .prepare("SELECT identity FROM password_vault_sync_identity WHERE id = 'default'")
          .get()
      ).toEqual(before)

      left
        .prepare(
          `UPDATE password_vault
           SET kdf_salt = 'new-salt',
               wrapped_key_nonce = 'new-nonce',
               wrapped_key_ciphertext = 'new-cipher',
               wrapped_key_tag = 'new-tag',
               updated_at = 20
           WHERE id = 'default'`
        )
        .run()

      const after = left
        .prepare("SELECT identity FROM password_vault_sync_identity WHERE id = 'default'")
        .get() as { identity: string }
      expect(after).toEqual(before)

      const merged = mergeSyncSnapshots(
        captureSyncSnapshot(leftDb, ['passwords']),
        captureSyncSnapshot(rightDb, ['passwords'])
      )
      const vault = merged.snapshot.modules[0]?.tables
        .find((table) => table.table === 'password_vault')
        ?.rows[0]
      expect(vault?.data.kdf_salt).toBe('new-salt')
    } finally {
      left.close()
      right.close()
    }
  })

  it('refuses to merge independently-created password vaults', () => {
    const left = createDatabase()
    const right = createDatabase()
    try {
      const leftDb = adapt(left)
      const rightDb = adapt(right)
      ensureSyncInfrastructure(leftDb)
      ensureSyncInfrastructure(rightDb)

      const insertVault = (db: Database.Database, suffix: string): void => {
        db.prepare(
          `INSERT INTO password_vault(
            id, version, kdf_salt, kdf_n, kdf_r, kdf_p,
            wrapped_key_nonce, wrapped_key_ciphertext, wrapped_key_tag,
            created_at, updated_at
          ) VALUES ('default', 1, ?, 32768, 8, 1, ?, ?, ?, 10, 10)`
        ).run(`salt-${suffix}`, `nonce-${suffix}`, `cipher-${suffix}`, `tag-${suffix}`)
      }
      insertVault(left, 'left')
      insertVault(right, 'right')

      expect(() =>
        mergeSyncSnapshots(
          captureSyncSnapshot(leftDb, ['passwords']),
          captureSyncSnapshot(rightDb, ['passwords'])
        )
      ).toThrow(/разные ключи/)
    } finally {
      left.close()
      right.close()
    }
  })

})
