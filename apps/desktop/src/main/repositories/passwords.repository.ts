import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  randomInt,
  randomUUID,
  scrypt,
  timingSafeEqual
} from 'node:crypto'

import type { PasswordCryptoPort } from '@mymind/contracts/password-crypto'
import { createPasswordsRepository } from '@mymind/persistence/passwords'
import { getSqlite } from '../database/client'

const nodePasswordCrypto: PasswordCryptoPort = {
  randomBytes(length) {
    return new Uint8Array(randomBytes(length))
  },

  randomInt(maxExclusive) {
    return randomInt(0, maxExclusive)
  },

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
          if (error) {
            reject(error)
            return
          }
          resolve(new Uint8Array(derivedKey))
        }
      )
    })
  },

  encryptAes256Gcm(plaintext, key, aad) {
    const nonce = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', Buffer.from(key), nonce, { authTagLength: 16 })
    cipher.setAAD(Buffer.from(aad))
    const ciphertext = Buffer.concat([
      cipher.update(Buffer.from(plaintext)),
      cipher.final()
    ])
    const tag = cipher.getAuthTag()
    return {
      nonce: new Uint8Array(nonce),
      ciphertext: new Uint8Array(ciphertext),
      tag: new Uint8Array(tag)
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
      Buffer.concat([
        decipher.update(Buffer.from(payload.ciphertext)),
        decipher.final()
      ])
    )
  },

  timingSafeEqual(left, right) {
    if (left.length !== right.length) return false
    return timingSafeEqual(Buffer.from(left), Buffer.from(right))
  }
}

const repository = createPasswordsRepository(
  {
    database: getSqlite,
    createId: randomUUID,
    now: Date.now
  },
  nodePasswordCrypto
)

export const getPasswordVaultStatus = repository.getPasswordVaultStatus
export const setupPasswordVault = repository.setupPasswordVault
export const unlockPasswordVault = repository.unlockPasswordVault
export const lockPasswordVault = repository.lockPasswordVault
export const changeMasterPassword = repository.changeMasterPassword
export const listPasswordsOverview = repository.listPasswordsOverview
export const getPasswordItem = repository.getPasswordItem
export const createPasswordGroup = repository.createPasswordGroup
export const updatePasswordGroup = repository.updatePasswordGroup
export const deletePasswordGroup = repository.deletePasswordGroup
export const createPasswordItem = repository.createPasswordItem
export const updatePasswordItem = repository.updatePasswordItem
export const deletePasswordItem = repository.deletePasswordItem
export const generatePassword = repository.generatePassword
