import { gcm } from '@noble/ciphers/aes.js'
import { scryptAsync } from '@noble/hashes/scrypt.js'
import { getRandomBytes } from 'expo-crypto'
import type { PasswordCryptoPort } from '@mymind/contracts/password-crypto'

const GCM_NONCE_BYTES = 12
const GCM_TAG_BYTES = 16
const encoder = new TextEncoder()

function secureRandomInt(maxExclusive: number): number {
  if (!Number.isSafeInteger(maxExclusive) || maxExclusive <= 0 || maxExclusive > 256) {
    throw new Error('Некорректная граница генератора случайных чисел')
  }
  const ceiling = 256 - (256 % maxExclusive)
  for (;;) {
    const value = getRandomBytes(1)[0] ?? 0
    if (value < ceiling) return value % maxExclusive
  }
}

export const mobilePasswordCrypto: PasswordCryptoPort = {
  randomBytes(length) {
    return getRandomBytes(length)
  },

  randomInt(maxExclusive) {
    return secureRandomInt(maxExclusive)
  },

  async deriveScryptKey(password, salt, parameters) {
    const passwordBytes = encoder.encode(password)
    try {
      return await scryptAsync(passwordBytes, salt, {
        N: parameters.n,
        r: parameters.r,
        p: parameters.p,
        dkLen: parameters.keyLength,
        maxmem: parameters.maxMemoryBytes
      })
    } finally {
      passwordBytes.fill(0)
    }
  },

  encryptAes256Gcm(plaintext, key, aad) {
    if (key.length !== 32) throw new Error('Некорректный ключ хранилища паролей')
    const nonce = getRandomBytes(GCM_NONCE_BYTES)
    const sealed = gcm(key, nonce, aad).encrypt(plaintext)
    try {
      if (sealed.length < GCM_TAG_BYTES) throw new Error('Не удалось зашифровать данные')
      return {
        nonce: new Uint8Array(nonce),
        ciphertext: sealed.slice(0, sealed.length - GCM_TAG_BYTES),
        tag: sealed.slice(sealed.length - GCM_TAG_BYTES)
      }
    } finally {
      sealed.fill(0)
    }
  },

  decryptAes256Gcm(payload, key, aad) {
    if (key.length !== 32 || payload.nonce.length !== GCM_NONCE_BYTES || payload.tag.length !== GCM_TAG_BYTES) {
      throw new Error('Некорректные параметры зашифрованных данных')
    }
    const sealed = new Uint8Array(payload.ciphertext.length + payload.tag.length)
    sealed.set(payload.ciphertext)
    sealed.set(payload.tag, payload.ciphertext.length)
    try {
      return gcm(key, payload.nonce, aad).decrypt(sealed)
    } finally {
      sealed.fill(0)
    }
  },

  timingSafeEqual(left, right) {
    if (left.length !== right.length) return false
    let difference = 0
    for (let index = 0; index < left.length; index += 1) {
      difference |= (left[index] ?? 0) ^ (right[index] ?? 0)
    }
    return difference === 0
  }
}
