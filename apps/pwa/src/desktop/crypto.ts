import { sha256 } from '@noble/hashes/sha2.js'
export { randomUUID } from '../platform/crypto'

export function createHash(algorithm: string): {
  update(value: string | Uint8Array): ReturnType<typeof createHash>
  digest(encoding: 'hex'): string
} {
  if (algorithm !== 'sha256') throw new Error('Неподдерживаемый алгоритм хеширования')
  const hash = sha256.create()
  const builder = {
    update(value: string | Uint8Array) {
      hash.update(typeof value === 'string' ? new TextEncoder().encode(value) : value)
      return builder
    },
    digest(encoding: 'hex') {
      if (encoding !== 'hex') throw new Error('Неподдерживаемая кодировка хеша')
      return [...hash.digest()].map((byte) => byte.toString(16).padStart(2, '0')).join('')
    }
  }
  return builder
}
