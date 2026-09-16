import { gcm } from '@noble/ciphers/aes.js'
import { hmac } from '@noble/hashes/hmac.js'
import { sha256 } from '@noble/hashes/sha2.js'
import type { LanSyncEncryptedEnvelope } from '@mymind/contracts/profile-sync'

const encoder = new TextEncoder()
const decoder = new TextDecoder('utf-8', { fatal: true })
const SESSION_KEY_BYTES = 32
const GCM_NONCE_BYTES = 12
const GCM_TAG_BYTES = 16
const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

export type LanSyncCipherDirection = 'request' | 'response'

function encodeBase64(bytes: Uint8Array): string {
  let output = ''
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index] ?? 0
    const hasB = index + 1 < bytes.length
    const hasC = index + 2 < bytes.length
    const b = bytes[index + 1] ?? 0
    const c = bytes[index + 2] ?? 0
    output += BASE64[a >> 2]
    output += BASE64[((a & 3) << 4) | (b >> 4)]
    output += hasB ? BASE64[((b & 15) << 2) | (c >> 6)] : '='
    output += hasC ? BASE64[c & 63] : '='
  }
  return output
}

function decodeBase64(value: string, label: string): Uint8Array {
  if (
    value.length % 4 !== 0 ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)
  ) {
    throw new Error(`Некорректное поле ${label} в защищённом LAN сообщении`)
  }
  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0
  const output = new Uint8Array((value.length / 4) * 3 - padding)
  let cursor = 0
  for (let index = 0; index < value.length; index += 4) {
    const a = BASE64.indexOf(value[index] ?? '')
    const b = BASE64.indexOf(value[index + 1] ?? '')
    const cChar = value[index + 2] ?? '='
    const dChar = value[index + 3] ?? '='
    const c = cChar === '=' ? 0 : BASE64.indexOf(cChar)
    const d = dChar === '=' ? 0 : BASE64.indexOf(dChar)
    if (a < 0 || b < 0 || c < 0 || d < 0) {
      throw new Error(`Некорректное поле ${label} в защищённом LAN сообщении`)
    }
    if (cursor < output.length) output[cursor++] = (a << 2) | (b >> 4)
    if (cursor < output.length) output[cursor++] = ((b & 15) << 4) | (c >> 2)
    if (cursor < output.length) output[cursor++] = ((c & 3) << 6) | d
  }
  return output
}

function aad(
  direction: LanSyncCipherDirection,
  method: string,
  path: string,
  sessionToken: string,
  requestId: string
): Uint8Array {
  if (
    !sessionToken ||
    sessionToken.length > 256 ||
    !/^[A-Z]+$/.test(method) ||
    !path.startsWith('/mymind-sync/v1/') ||
    !/^[a-zA-Z0-9_-]{8,128}$/.test(requestId)
  ) {
    throw new Error('Некорректный контекст защищённого LAN сообщения')
  }
  return encoder.encode(
    ['mymind-lan-sync', 'v1', direction, method, path, sessionToken, requestId].join('|')
  )
}

export function deriveLanSyncSessionKey(
  syncKey: Uint8Array,
  challengeId: string,
  clientNonce: string,
  serverNonce: string
): Uint8Array {
  if (syncKey.length !== SESSION_KEY_BYTES || !challengeId || !clientNonce || !serverNonce) {
    throw new Error('Некорректные параметры LAN session key')
  }
  return hmac(
    sha256,
    syncKey,
    encoder.encode(
      ['mymind-lan-sync-session', 'v1', challengeId, clientNonce, serverNonce].join('|')
    )
  )
}

export function encryptLanSyncJson(
  value: unknown,
  sessionKey: Uint8Array,
  nonce: Uint8Array,
  direction: LanSyncCipherDirection,
  method: string,
  path: string,
  sessionToken: string,
  requestId: string
): LanSyncEncryptedEnvelope {
  if (sessionKey.length !== SESSION_KEY_BYTES || nonce.length !== GCM_NONCE_BYTES) {
    throw new Error('Некорректный ключ или nonce защищённого LAN сообщения')
  }
  const plaintext = encoder.encode(JSON.stringify(value))
  try {
    const sealed = gcm(
      sessionKey,
      nonce,
      aad(direction, method, path, sessionToken, requestId)
    ).encrypt(plaintext)
    try {
      if (sealed.length < GCM_TAG_BYTES) throw new Error('Не удалось зашифровать LAN сообщение')
      return {
        version: 1,
        requestId,
        nonce: encodeBase64(nonce),
        ciphertext: encodeBase64(sealed.subarray(0, sealed.length - GCM_TAG_BYTES)),
        tag: encodeBase64(sealed.subarray(sealed.length - GCM_TAG_BYTES))
      }
    } finally {
      sealed.fill(0)
    }
  } finally {
    plaintext.fill(0)
  }
}

export function decryptLanSyncJson(
  envelope: LanSyncEncryptedEnvelope,
  sessionKey: Uint8Array,
  direction: LanSyncCipherDirection,
  method: string,
  path: string,
  sessionToken: string,
  requestId: string
): unknown {
  if (sessionKey.length !== SESSION_KEY_BYTES) {
    throw new Error('Некорректный ключ защищённого LAN сообщения')
  }
  const nonce = decodeBase64(envelope.nonce, 'nonce')
  const ciphertext = decodeBase64(envelope.ciphertext, 'ciphertext')
  const tag = decodeBase64(envelope.tag, 'tag')
  if (nonce.length !== GCM_NONCE_BYTES || tag.length !== GCM_TAG_BYTES) {
    throw new Error('Некорректный формат защищённого LAN сообщения')
  }
  const sealed = new Uint8Array(ciphertext.length + tag.length)
  sealed.set(ciphertext)
  sealed.set(tag, ciphertext.length)
  let plaintext: Uint8Array | null = null
  try {
    plaintext = gcm(
      sessionKey,
      nonce,
      aad(direction, method, path, sessionToken, requestId)
    ).decrypt(sealed)
    try {
      return JSON.parse(decoder.decode(plaintext))
    } catch {
      throw new Error('Защищённое LAN сообщение повреждено')
    }
  } catch (reason) {
    if (reason instanceof Error && reason.message === 'Защищённое LAN сообщение повреждено') {
      throw reason
    }
    throw new Error('Не удалось проверить защищённое LAN сообщение')
  } finally {
    sealed.fill(0)
    plaintext?.fill(0)
    nonce.fill(0)
    ciphertext.fill(0)
    tag.fill(0)
  }
}

export function parseLanSyncEncryptedEnvelope(value: unknown): LanSyncEncryptedEnvelope {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Некорректное защищённое LAN сообщение')
  }
  const record = value as Record<string, unknown>
  if (
    record.version !== 1 ||
    typeof record.requestId !== 'string' ||
    !/^[a-zA-Z0-9_-]{8,128}$/.test(record.requestId) ||
    typeof record.nonce !== 'string' ||
    typeof record.ciphertext !== 'string' ||
    typeof record.tag !== 'string' ||
    record.nonce.length > 64 ||
    record.tag.length > 64 ||
    record.ciphertext.length > 180 * 1024 * 1024
  ) {
    throw new Error('Некорректное защищённое LAN сообщение')
  }
  return {
    version: 1,
    requestId: record.requestId,
    nonce: record.nonce,
    ciphertext: record.ciphertext,
    tag: record.tag
  }
}
