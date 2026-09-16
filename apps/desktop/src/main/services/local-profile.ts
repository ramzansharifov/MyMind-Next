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

let repository: ReturnType<typeof createLocalProfileRepository> | null = null

function getRepository(): ReturnType<typeof createLocalProfileRepository> {
  repository ??= createLocalProfileRepository(desktopRepositoryRuntime, secretPort)
  return repository
}

export const getLocalProfile = (): ReturnType<
  ReturnType<typeof createLocalProfileRepository>['getProfile']
> => getRepository().getProfile()

export const createLocalProfile = (
  input: Parameters<ReturnType<typeof createLocalProfileRepository>['createProfile']>[0]
) => getRepository().createProfile(input)

export const updateLocalProfile = (
  input: Parameters<ReturnType<typeof createLocalProfileRepository>['updateProfile']>[0]
) => getRepository().updateProfile(input)

export const replaceLocalProfileCredentials = (
  input: Parameters<ReturnType<typeof createLocalProfileRepository>['replaceCredentials']>[0]
) => getRepository().replaceCredentials(input)

export const getLocalProfileSyncKey = () => getRepository().getSyncKey()
export const removeLocalProfile = () => getRepository().removeProfile()
