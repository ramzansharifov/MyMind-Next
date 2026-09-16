import { safeStorage } from 'electron'
import { createLocalProfileRepository, type ProfileSecretPort } from '@mymind/persistence/local-profile'
import { desktopRepositoryRuntime } from '../database/repository-runtime'
import { getSqlite } from '../database/client'

const SECRET_META_KEY = 'local-profile-sync-key-v1'

const secretPort: ProfileSecretPort = {
  async get() {
    const row = getSqlite()
      .prepare('SELECT value FROM app_meta WHERE key = ?')
      .get(SECRET_META_KEY) as { value: string } | undefined
    if (!row) return null
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Защищённое хранилище операционной системы недоступно')
    }
    try {
      return safeStorage.decryptString(Buffer.from(row.value, 'base64'))
    } catch {
      throw new Error('Не удалось расшифровать ключ локального профиля')
    }
  },

  async set(value) {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Защищённое хранилище операционной системы недоступно')
    }
    const encrypted = safeStorage.encryptString(value).toString('base64')
    getSqlite()
      .prepare(
        `INSERT INTO app_meta(key, value, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
      )
      .run(SECRET_META_KEY, encrypted, Date.now())
  },

  async remove() {
    getSqlite().prepare('DELETE FROM app_meta WHERE key = ?').run(SECRET_META_KEY)
  }
}

const repository = createLocalProfileRepository(desktopRepositoryRuntime, secretPort)

export const getLocalProfile = repository.getProfile
export const createLocalProfile = repository.createProfile
export const updateLocalProfile = repository.updateProfile
export const replaceLocalProfileCredentials = repository.replaceCredentials
export const getLocalProfileSyncKey = repository.getSyncKey
export const removeLocalProfile = repository.removeProfile
