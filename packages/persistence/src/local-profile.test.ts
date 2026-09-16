import Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
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
import { createLocalProfileRepository, type ProfileSecretPort } from './local-profile'

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
        run: (...parameters) => ({ changes: statement.run(...parameters).changes })
      }
    },
    transaction(operation) {
      return db.transaction(operation)
    }
  }
}

class MemorySecret implements ProfileSecretPort {
  value: string | null = null
  get(): Promise<string | null> {
    return Promise.resolve(this.value)
  }
  set(value: string): Promise<void> {
    this.value = value
    return Promise.resolve()
  }
  remove(): Promise<void> {
    this.value = null
    return Promise.resolve()
  }
}

describe('local profile repository', () => {
  it('stores profile metadata while keeping the sync key outside SQLite', async () => {
    const db = createDatabase()
    try {
      const secret = new MemorySecret()
      let now = 100
      const repository = createLocalProfileRepository(
        { database: () => adapt(db), createId: randomUUID, now: () => now },
        secret
      )

      const profile = await repository.createProfile({
        login: ' Ramzan ',
        password: 'secret',
        name: 'Рамзан',
        gender: 'male'
      })

      expect(profile).toMatchObject({
        login: 'Ramzan',
        normalizedLogin: 'ramzan',
        name: 'Рамзан',
        gender: 'male'
      })
      expect(secret.value).toMatch(/^[0-9a-f]{64}$/)

      const stored = db
        .prepare('SELECT login, normalized_login, name, gender FROM local_profile')
        .get() as Record<string, unknown>
      expect(stored).toEqual({
        login: 'Ramzan',
        normalized_login: 'ramzan',
        name: 'Рамзан',
        gender: 'male'
      })
      expect(JSON.stringify(stored)).not.toContain('secret')

      const key = await repository.getSyncKey()
      expect(key).toHaveLength(32)
      key?.fill(0)

      now = 200
      expect(repository.updateProfile({ name: 'R', gender: null })).toMatchObject({
        name: 'R',
        gender: null,
        updatedAt: 200
      })
    } finally {
      db.close()
    }
  })

  it('rotates credentials and detects a missing secure key', async () => {
    const db = createDatabase()
    try {
      const secret = new MemorySecret()
      const repository = createLocalProfileRepository(
        { database: () => adapt(db), createId: randomUUID, now: Date.now },
        secret
      )
      await repository.createProfile({
        login: 'ramzan',
        password: 'one'
      })
      const previousSecret = secret.value
      const changed = await repository.replaceCredentials({
        login: 'ramzan-new',
        password: 'two'
      })
      expect(changed.normalizedLogin).toBe('ramzan-new')
      expect(secret.value).not.toBe(previousSecret)

      secret.value = null
      expect(await repository.getSyncKey()).toBeNull()
    } finally {
      db.close()
    }
  })
})
