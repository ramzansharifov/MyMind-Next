import type {
  CreateLocalProfileInput,
  LocalProfile,
  ReplaceProfileCredentialsInput,
  UpdateLocalProfileInput
} from '@mymind/contracts/profile-sync'
import type { RepositoryRuntime } from '@mymind/contracts/storage'
import {
  assertValidProfileLogin,
  assertValidProfilePassword,
  deriveProfileSyncKey,
  normalizeOptionalProfileName,
  normalizeProfileLogin,
  profileSyncKeyFingerprint,
  profileSyncKeyFromHex,
  profileSyncKeyToHex
} from '@mymind/core/profile-sync'
import { ensureSyncInfrastructure } from './sync'

export interface ProfileSecretPort {
  get(): Promise<string | null>
  set(value: string): Promise<void>
  remove(): Promise<void>
}

export interface LocalProfileRepository {
  getProfile(): LocalProfile | null
  createProfile(input: CreateLocalProfileInput): Promise<LocalProfile>
  updateProfile(input: UpdateLocalProfileInput): LocalProfile
  replaceCredentials(input: ReplaceProfileCredentialsInput): Promise<LocalProfile>
  getSyncKey(): Promise<Uint8Array | null>
  removeProfile(): Promise<boolean>
}

interface LocalProfileRow {
  id: string
  login: string
  normalized_login: string
  name: string | null
  gender: 'male' | 'female' | null
  credential_fingerprint: string
  created_at: number
  updated_at: number
}

function toProfile(row: LocalProfileRow): LocalProfile {
  return {
    id: row.id,
    login: row.login,
    normalizedLogin: row.normalized_login,
    name: row.name,
    gender: row.gender,
    credentialFingerprint: row.credential_fingerprint,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function normalizeDisplayLogin(login: string): string {
  const value = login.normalize('NFKC').trim()
  if (!value) throw new Error('Введите логин')
  if (value.length > 80) throw new Error('Логин слишком длинный')
  return value
}

function normalizeGender(
  gender: CreateLocalProfileInput['gender'] | UpdateLocalProfileInput['gender']
): 'male' | 'female' | null {
  if (gender === undefined || gender === null) return null
  if (gender !== 'male' && gender !== 'female') throw new Error('Некорректно указан пол')
  return gender
}

export function createLocalProfileRepository(
  runtime: RepositoryRuntime,
  secret: ProfileSecretPort
): LocalProfileRepository {
  const database = runtime.database
  ensureSyncInfrastructure(database())

  function getRow(): LocalProfileRow | null {
    return (
      (database()
        .prepare(
          `SELECT id, login, normalized_login, name, gender, credential_fingerprint, created_at, updated_at
           FROM local_profile
           ORDER BY created_at ASC
           LIMIT 1`
        )
        .get() as LocalProfileRow | undefined) ?? null
    )
  }

  function getProfile(): LocalProfile | null {
    const row = getRow()
    return row ? toProfile(row) : null
  }

  return {
    getProfile,

    async createProfile(input) {
      if (getRow()) throw new Error('Профиль уже создан на этом устройстве')
      const login = normalizeDisplayLogin(input.login)
      const normalizedLogin = assertValidProfileLogin(login)
      assertValidProfilePassword(input.password)
      const name = normalizeOptionalProfileName(input.name)
      if (name && name.length > 100) throw new Error('Имя слишком длинное')
      const gender = normalizeGender(input.gender)
      const key = await deriveProfileSyncKey(normalizedLogin, input.password)
      const encodedKey = profileSyncKeyToHex(key)
      const now = runtime.now()
      const profile: LocalProfile = {
        id: runtime.createId(),
        login,
        normalizedLogin,
        name,
        gender,
        credentialFingerprint: profileSyncKeyFingerprint(key),
        createdAt: now,
        updatedAt: now
      }

      await secret.set(encodedKey)
      try {
        database()
          .prepare(
            `INSERT INTO local_profile(
              id, login, normalized_login, name, gender, credential_fingerprint, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            profile.id,
            profile.login,
            profile.normalizedLogin,
            profile.name,
            profile.gender,
            profile.credentialFingerprint,
            profile.createdAt,
            profile.updatedAt
          )
      } catch (reason) {
        await secret.remove().catch(() => undefined)
        throw reason
      } finally {
        key.fill(0)
      }
      return profile
    },

    updateProfile(input) {
      const current = getProfile()
      if (!current) throw new Error('Сначала создайте профиль')
      const name =
        input.name === undefined ? current.name : normalizeOptionalProfileName(input.name)
      if (name && name.length > 100) throw new Error('Имя слишком длинное')
      const gender = input.gender === undefined ? current.gender : normalizeGender(input.gender)
      const updatedAt = runtime.now()

      database()
        .prepare('UPDATE local_profile SET name = ?, gender = ?, updated_at = ? WHERE id = ?')
        .run(name, gender, updatedAt, current.id)

      return { ...current, name, gender, updatedAt }
    },

    async replaceCredentials(input) {
      const current = getProfile()
      if (!current) throw new Error('Сначала создайте профиль')
      const login = normalizeDisplayLogin(input.login)
      const normalizedLogin = normalizeProfileLogin(assertValidProfileLogin(login))
      assertValidProfilePassword(input.password)
      const key = await deriveProfileSyncKey(normalizedLogin, input.password)
      const nextSecret = profileSyncKeyToHex(key)
      const previousSecret = await secret.get()
      const credentialFingerprint = profileSyncKeyFingerprint(key)
      const updatedAt = runtime.now()

      await secret.set(nextSecret)
      try {
        database()
          .prepare(
            `UPDATE local_profile
             SET login = ?, normalized_login = ?, credential_fingerprint = ?, updated_at = ?
             WHERE id = ?`
          )
          .run(login, normalizedLogin, credentialFingerprint, updatedAt, current.id)
      } catch (reason) {
        if (previousSecret) await secret.set(previousSecret).catch(() => undefined)
        else await secret.remove().catch(() => undefined)
        throw reason
      } finally {
        key.fill(0)
      }

      return {
        ...current,
        login,
        normalizedLogin,
        credentialFingerprint,
        updatedAt
      }
    },

    async getSyncKey() {
      const profile = getProfile()
      if (!profile) return null
      const encoded = await secret.get()
      if (!encoded) return null
      const key = profileSyncKeyFromHex(encoded)
      if (profileSyncKeyFingerprint(key) !== profile.credentialFingerprint) {
        key.fill(0)
        throw new Error('Ключ профиля повреждён. Повторно задайте логин и пароль.')
      }
      return key
    },

    async removeProfile() {
      const current = getProfile()
      if (!current) return false
      await secret.remove()
      database().prepare('DELETE FROM local_profile WHERE id = ?').run(current.id)
      return true
    }
  }
}
