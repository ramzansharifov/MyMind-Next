import { hmac } from '@noble/hashes/hmac.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { scryptAsync } from '@noble/hashes/scrypt.js'

const encoder = new TextEncoder()
const SYNC_KEY_BYTES = 32
const SYNC_KDF_N = 32_768
const SYNC_KDF_R = 8
const SYNC_KDF_P = 1
const SYNC_KDF_MAXMEM = 64 * 1024 * 1024

function toHex(bytes: Uint8Array): string {
  let result = ''
  for (const byte of bytes) result += byte.toString(16).padStart(2, '0')
  return result
}

function proofMessage(
  role: 'client' | 'server',
  normalizedLogin: string,
  challengeId: string,
  clientNonce: string,
  serverNonce: string
): Uint8Array {
  return encoder.encode(
    ['mymind-lan-sync', 'v1', role, normalizedLogin, challengeId, clientNonce, serverNonce].join('|')
  )
}

export function normalizeProfileLogin(login: string): string {
  return login.normalize('NFKC').trim().toLocaleLowerCase('en-US')
}

export function normalizeOptionalProfileName(name: string | null | undefined): string | null {
  const normalized = name?.normalize('NFKC').trim() ?? ''
  return normalized ? normalized : null
}

export function assertValidProfileLogin(login: string): string {
  const normalized = normalizeProfileLogin(login)
  if (!normalized) throw new Error('Введите логин')
  if (normalized.length > 80) throw new Error('Логин слишком длинный')
  return normalized
}

export function assertValidProfilePassword(password: string): void {
  if (!password) throw new Error('Введите пароль')
  if (password.length > 256) throw new Error('Пароль слишком длинный')
}

export async function deriveProfileSyncKey(login: string, password: string): Promise<Uint8Array> {
  const normalizedLogin = assertValidProfileLogin(login)
  assertValidProfilePassword(password)

  const saltMaterial = sha256(
    encoder.encode(`mymind:local-profile-sync:v1:${normalizedLogin}`)
  ).slice(0, 16)
  const passwordBytes = encoder.encode(password)

  try {
    return await scryptAsync(passwordBytes, saltMaterial, {
      N: SYNC_KDF_N,
      r: SYNC_KDF_R,
      p: SYNC_KDF_P,
      dkLen: SYNC_KEY_BYTES,
      maxmem: SYNC_KDF_MAXMEM
    })
  } finally {
    passwordBytes.fill(0)
    saltMaterial.fill(0)
  }
}

export function profileSyncKeyFingerprint(syncKey: Uint8Array): string {
  if (syncKey.length !== SYNC_KEY_BYTES) throw new Error('Некорректный ключ синхронизации')
  return toHex(sha256(syncKey))
}

export function createProfileSyncProof(
  role: 'client' | 'server',
  syncKey: Uint8Array,
  login: string,
  challengeId: string,
  clientNonce: string,
  serverNonce: string
): string {
  if (syncKey.length !== SYNC_KEY_BYTES) throw new Error('Некорректный ключ синхронизации')
  const normalizedLogin = assertValidProfileLogin(login)
  if (!challengeId || !clientNonce || !serverNonce) throw new Error('Некорректный challenge')
  return toHex(
    hmac(
      sha256,
      syncKey,
      proofMessage(role, normalizedLogin, challengeId, clientNonce, serverNonce)
    )
  )
}

export function timingSafeHexEqual(left: string, right: string): boolean {
  if (left.length !== right.length || left.length === 0) return false
  let difference = 0
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }
  return difference === 0
}
