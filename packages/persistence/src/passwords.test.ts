import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  randomInt,
  randomUUID,
  scrypt,
  timingSafeEqual
} from 'node:crypto'
import { readFileSync } from 'node:fs'
import Database from 'better-sqlite3'
import { afterEach, describe, expect, it } from 'vitest'
import type { PasswordCryptoPort } from '@mymind/contracts/password-crypto'
import { createPasswordsRepository } from './passwords'
import { mobileSchemaV8 } from './mobile-schema-v8'

const databases: Database.Database[] = []

const nodeCrypto: PasswordCryptoPort = {
  randomBytes: (length) => new Uint8Array(randomBytes(length)),
  randomInt: (maxExclusive) => randomInt(0, maxExclusive),
  deriveScryptKey(password, salt, parameters) {
    return new Promise((resolve, reject) => {
      scrypt(
        password,
        Buffer.from(salt),
        parameters.keyLength,
        {
          N: parameters.n,
          r: parameters.r,
          p: parameters.p,
          maxmem: parameters.maxMemoryBytes
        },
        (error, derivedKey) => {
          if (error) reject(error)
          else resolve(new Uint8Array(derivedKey))
        }
      )
    })
  },
  encryptAes256Gcm(plaintext, key, aad) {
    const nonce = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', Buffer.from(key), nonce, { authTagLength: 16 })
    cipher.setAAD(Buffer.from(aad))
    const ciphertext = Buffer.concat([cipher.update(Buffer.from(plaintext)), cipher.final()])
    return {
      nonce: new Uint8Array(nonce),
      ciphertext: new Uint8Array(ciphertext),
      tag: new Uint8Array(cipher.getAuthTag())
    }
  },
  decryptAes256Gcm(payload, key, aad) {
    const decipher = createDecipheriv(
      'aes-256-gcm',
      Buffer.from(key),
      Buffer.from(payload.nonce),
      { authTagLength: 16 }
    )
    decipher.setAAD(Buffer.from(aad))
    decipher.setAuthTag(Buffer.from(payload.tag))
    return new Uint8Array(
      Buffer.concat([decipher.update(Buffer.from(payload.ciphertext)), decipher.final()])
    )
  },
  timingSafeEqual(left, right) {
    return left.length === right.length && timingSafeEqual(Buffer.from(left), Buffer.from(right))
  }
}

function setup() {
  const db = new Database(':memory:')
  databases.push(db)
  db.pragma('foreign_keys = ON')
  for (const sql of mobileSchemaV8) db.exec(sql)
  let now = new Date(2026, 8, 7, 12).getTime()
  const repository = createPasswordsRepository(
    { database: () => db, createId: randomUUID, now: () => ++now },
    nodeCrypto
  )
  return { db, repository }
}

function itemInput(groupId: string | null, password = 'Strong-password-123!') {
  return {
    groupId,
    type: 'login' as const,
    title: 'GitHub',
    username: 'user@example.com',
    password,
    website: 'github.com',
    notes: 'Рабочий аккаунт',
    tags: ['Работа', 'Git'],
    customFields: [{ label: 'Recovery', value: 'secret-recovery-code' }],
    favorite: true
  }
}

afterEach(() => {
  for (const db of databases.splice(0)) db.close()
})

describe('shared Passwords persistence', () => {
  it('matches desktop Passwords table, index and foreign-key shape', () => {
    const desktop = new Database(':memory:')
    const mobile = new Database(':memory:')
    try {
      const root = 'apps/desktop/drizzle'
      const journal = JSON.parse(readFileSync(`${root}/meta/_journal.json`, 'utf8')) as {
        entries: { tag: string }[]
      }
      for (const entry of journal.entries) desktop.exec(readFileSync(`${root}/${entry.tag}.sql`, 'utf8'))
      mobile.pragma('foreign_keys = ON')
      for (const sql of mobileSchemaV8) mobile.exec(sql)

      const indexes = (db: Database.Database, name: string): unknown[] =>
        (db.pragma(`index_list('${name}')`) as { name: string; unique: number; partial: number; origin: string }[])
          .map((index) => ({
            name: index.name,
            unique: index.unique,
            partial: index.partial,
            origin: index.origin,
            columns: db.pragma(`index_info('${index.name}')`)
          }))
          .sort((left, right) => left.name.localeCompare(right.name))

      for (const name of ['password_vault', 'password_groups', 'password_items']) {
        expect(mobile.pragma(`table_info('${name}')`), `${name}: columns`).toEqual(
          desktop.pragma(`table_info('${name}')`)
        )
        expect(mobile.pragma(`foreign_key_list('${name}')`), `${name}: foreign keys`).toEqual(
          desktop.pragma(`foreign_key_list('${name}')`)
        )
        expect(indexes(mobile, name), `${name}: indexes`).toEqual(indexes(desktop, name))
      }
    } finally {
      desktop.close()
      mobile.close()
    }
  })

  it('encrypts every sensitive payload and unlocks only with the master password', async () => {
    const { db, repository } = setup()
    await repository.setupPasswordVault({ masterPassword: 'master-password-very-strong' })
    const group = repository.createPasswordGroup({ name: 'Работа', icon: 'briefcase', color: 'blue' })
    const item = repository.createPasswordItem(itemInput(group.id))

    const rawGroup = db
      .prepare('SELECT encrypted_payload FROM password_groups WHERE id = ?')
      .get(group.id) as { encrypted_payload: string }
    const rawItem = db
      .prepare('SELECT encrypted_payload FROM password_items WHERE id = ?')
      .get(item.id) as { encrypted_payload: string }

    expect(rawGroup.encrypted_payload).not.toContain('Работа')
    for (const secret of ['GitHub', 'user@example.com', 'Strong-password-123!', 'secret-recovery-code']) {
      expect(rawItem.encrypted_payload).not.toContain(secret)
    }

    repository.lockPasswordVault()
    expect(() => repository.listPasswordsOverview()).toThrow('заблокировано')
    await expect(repository.unlockPasswordVault({ masterPassword: 'wrong-master-password' })).rejects.toThrow(
      'Неверный мастер-пароль'
    )
    await repository.unlockPasswordVault({ masterPassword: 'master-password-very-strong' })
    expect(repository.getPasswordItem(item.id)).toMatchObject({
      title: 'GitHub',
      username: 'user@example.com',
      password: 'Strong-password-123!',
      website: 'https://github.com'
    })
  })

  it('keeps items after group deletion and never exposes secrets in overview', async () => {
    const { repository } = setup()
    await repository.setupPasswordVault({ masterPassword: 'master-password-very-strong' })
    const group = repository.createPasswordGroup({ name: 'Личное', icon: 'home', color: 'emerald' })
    const first = repository.createPasswordItem(itemInput(group.id, '12345678'))
    repository.createPasswordItem({
      ...itemInput(group.id, '12345678'),
      title: 'Другой сервис',
      username: 'other'
    })

    const overview = repository.listPasswordsOverview()
    expect(overview.security).toMatchObject({ total: 2, weak: 2, reused: 2 })
    expect(overview.items.every((item) => !('password' in item))).toBe(true)

    repository.deletePasswordGroup({ id: group.id })
    expect(repository.getPasswordItem(first.id).groupId).toBeNull()
  })

  it('rewraps the same vault key when the master password changes', async () => {
    const { repository } = setup()
    await repository.setupPasswordVault({ masterPassword: 'master-password-very-strong' })
    const item = repository.createPasswordItem(itemInput(null))

    await repository.changeMasterPassword({
      currentMasterPassword: 'master-password-very-strong',
      newMasterPassword: 'another-master-password-very-strong'
    })
    repository.lockPasswordVault()

    await expect(
      repository.unlockPasswordVault({ masterPassword: 'master-password-very-strong' })
    ).rejects.toThrow('Неверный мастер-пароль')
    await repository.unlockPasswordVault({ masterPassword: 'another-master-password-very-strong' })
    expect(repository.getPasswordItem(item.id).password).toBe('Strong-password-123!')
  })

  it('generates passwords from every enabled set without ambiguous characters', () => {
    const { repository } = setup()
    const generated = repository.generatePassword({
      length: 32,
      lowercase: true,
      uppercase: true,
      digits: true,
      symbols: true,
      excludeAmbiguous: true
    })
    expect(generated).toHaveLength(32)
    expect(generated).toMatch(/[a-z]/)
    expect(generated).toMatch(/[A-Z]/)
    expect(generated).toMatch(/\d/)
    expect(generated).toMatch(/[^A-Za-z0-9]/)
    expect(generated).not.toMatch(/[Il1O0o]/)
  })
})
