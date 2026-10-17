import {
  createLocalProfileRepository,
  type ProfileSecretPort
} from '@mymind/persistence/local-profile'
import type { LocalProfile } from '@mymind/contracts/profile-sync'
import type { PwaDatabase } from '../storage/database'
import { syncActivity } from './activity'

interface SealedSecret {
  key: CryptoKey
  nonce: Uint8Array<ArrayBuffer>
  ciphertext: ArrayBuffer
}

/** Non-extractable wrapping key and ciphertext remain in this browser's IndexedDB. */
export function createPwaProfileSecret(db: PwaDatabase): ProfileSecretPort {
  return {
    async get() {
      const record = await db.disk.readState<SealedSecret>('profile-secret')
      if (!record) return null
      const clear = new Uint8Array(
        await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: record.nonce },
          record.key,
          record.ciphertext
        )
      )
      try {
        return new TextDecoder().decode(clear)
      } finally {
        clear.fill(0)
      }
    },
    async set(value) {
      const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
        'encrypt',
        'decrypt'
      ])
      const nonce = crypto.getRandomValues(new Uint8Array(12))
      const clear = new TextEncoder().encode(value)
      try {
        const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, clear)
        await db.disk.writeState<SealedSecret>('profile-secret', { key, nonce, ciphertext })
      } finally {
        clear.fill(0)
      }
    },
    remove: () => db.disk.writeState('profile-secret', undefined)
  }
}

export function createPwaProfileRepository(
  db: PwaDatabase
): ReturnType<typeof createLocalProfileRepository> {
  const runtime = { database: () => db, createId: () => crypto.randomUUID(), now: Date.now }
  const repository = createLocalProfileRepository(runtime, createPwaProfileSecret(db))
  const durable = async <T>(operation: Promise<T>): Promise<T> => {
    const result = await operation
    await db.flush()
    return result
  }
  return {
    ...repository,
    createProfile: (input) => syncActivity.run(() => durable(repository.createProfile(input))),
    replaceCredentials: (input) =>
      syncActivity.run(() => durable(repository.replaceCredentials(input))),
    removeProfile: () => syncActivity.run(() => durable(repository.removeProfile())),
    updateProfile: (input): LocalProfile => repository.updateProfile(input)
  }
}
