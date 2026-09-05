import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { closeDatabase, getSqlite, initializeDatabaseForTesting } from '../database/client'
import { runDatabaseMigrationsFrom } from '../database/migrate'
import {
  changeMasterPassword,
  createPasswordGroup,
  createPasswordItem,
  deletePasswordGroup,
  getPasswordItem,
  generatePassword,
  listPasswordsOverview,
  lockPasswordVault,
  setupPasswordVault,
  unlockPasswordVault
} from './passwords.repository'

let root = ''

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'mymind-passwords-'))
  initializeDatabaseForTesting(join(root, 'passwords.sqlite'))
  runDatabaseMigrationsFrom(resolve(process.cwd(), 'drizzle'))
})

beforeEach(() => {
  lockPasswordVault()
  getSqlite().exec('DELETE FROM password_items; DELETE FROM password_groups; DELETE FROM password_vault;')
})

afterAll(async () => {
  lockPasswordVault()
  closeDatabase()
  await rm(root, { recursive: true, force: true })
})

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

describe('passwords repository', () => {
  it('encrypts sensitive payloads at rest and unlocks them with the master password', async () => {
    await setupPasswordVault({ masterPassword: 'master-password-very-strong' })
    const work = createPasswordGroup({ name: 'Работа', icon: 'briefcase', color: 'blue' })
    const item = createPasswordItem(itemInput(work.id))

    const rawGroup = getSqlite()
      .prepare('SELECT encrypted_payload FROM password_groups WHERE id = ?')
      .get(work.id) as { encrypted_payload: string }
    const rawItem = getSqlite()
      .prepare('SELECT encrypted_payload FROM password_items WHERE id = ?')
      .get(item.id) as { encrypted_payload: string }

    expect(rawGroup.encrypted_payload).not.toContain('Работа')
    expect(rawItem.encrypted_payload).not.toContain('GitHub')
    expect(rawItem.encrypted_payload).not.toContain('Strong-password-123!')
    expect(rawItem.encrypted_payload).not.toContain('secret-recovery-code')

    lockPasswordVault()
    expect(() => listPasswordsOverview()).toThrow('заблокировано')
    await expect(
      unlockPasswordVault({ masterPassword: 'wrong-master-password' })
    ).rejects.toThrow('Неверный мастер-пароль')

    await unlockPasswordVault({ masterPassword: 'master-password-very-strong' })
    expect(getPasswordItem(item.id)).toMatchObject({
      title: 'GitHub',
      username: 'user@example.com',
      password: 'Strong-password-123!',
      website: 'https://github.com',
      groupId: work.id
    })
  })

  it('keeps items when their group is deleted', async () => {
    await setupPasswordVault({ masterPassword: 'master-password-very-strong' })
    const group = createPasswordGroup({ name: 'Личное', icon: 'home', color: 'emerald' })
    const item = createPasswordItem(itemInput(group.id))

    expect(deletePasswordGroup({ id: group.id })).toBe(true)
    expect(getPasswordItem(item.id).groupId).toBeNull()
  })

  it('detects reused and weak passwords without exposing passwords in the overview', async () => {
    await setupPasswordVault({ masterPassword: 'master-password-very-strong' })
    createPasswordItem(itemInput(null, '12345678'))
    createPasswordItem({ ...itemInput(null, '12345678'), title: 'Другой сервис', username: 'other' })

    const overview = listPasswordsOverview()
    expect(overview.security.weak).toBe(2)
    expect(overview.security.reused).toBe(2)
    expect(overview.items.every((item) => item.securityIssues.includes('reused'))).toBe(true)
    expect('password' in overview.items[0]!).toBe(false)
  })

  it('rewraps the vault key when the master password changes', async () => {
    await setupPasswordVault({ masterPassword: 'master-password-very-strong' })
    const item = createPasswordItem(itemInput(null))

    await changeMasterPassword({
      currentMasterPassword: 'master-password-very-strong',
      newMasterPassword: 'another-master-password-very-strong'
    })
    lockPasswordVault()

    await expect(
      unlockPasswordVault({ masterPassword: 'master-password-very-strong' })
    ).rejects.toThrow('Неверный мастер-пароль')
    await unlockPasswordVault({ masterPassword: 'another-master-password-very-strong' })
    expect(getPasswordItem(item.id).password).toBe('Strong-password-123!')
  })

  it('generates passwords using every enabled character set', () => {
    const generated = generatePassword({
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
