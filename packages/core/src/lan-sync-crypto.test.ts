import { describe, expect, it } from 'vitest'
import {
  decryptLanSyncJson,
  deriveLanSyncSessionKey,
  encryptLanSyncJson,
  parseLanSyncEncryptedEnvelope
} from './lan-sync-crypto'

describe('LAN sync application encryption', () => {
  it('derives the same session key and round-trips authenticated JSON', () => {
    const profileKey = new Uint8Array(32).fill(7)
    const first = deriveLanSyncSessionKey(profileKey, 'challenge', 'client', 'server')
    const second = deriveLanSyncSessionKey(profileKey, 'challenge', 'client', 'server')
    expect(first).toEqual(second)

    const envelope = encryptLanSyncJson(
      { secret: 'данные', count: 3 },
      first,
      new Uint8Array(12).fill(9),
      'request',
      'POST',
      '/mymind-sync/v1/plan',
      'token',
      'request-12345678'
    )
    expect(
      decryptLanSyncJson(
        parseLanSyncEncryptedEnvelope(envelope),
        second,
        'request',
        'POST',
        '/mymind-sync/v1/plan',
        'token',
        'request-fedcba98'
      )
    ).toEqual({ secret: 'данные', count: 3 })
  })

  it('binds ciphertext to endpoint, direction and session token', () => {
    const key = new Uint8Array(32).fill(5)
    const envelope = encryptLanSyncJson(
      { value: 1 },
      key,
      new Uint8Array(12).fill(4),
      'request',
      'POST',
      '/mymind-sync/v1/commit',
      'token-a',
      'request-abcdef12'
    )

    expect(() =>
      decryptLanSyncJson(
        envelope,
        key,
        'response',
        'POST',
        '/mymind-sync/v1/commit',
        'token-a',
        'request-abcdef12'
      )
    ).toThrow()
    expect(() =>
      decryptLanSyncJson(
        envelope,
        key,
        'request',
        'POST',
        '/mymind-sync/v1/commit',
        'token-b',
        'request-abcdef12'
      )
    ).toThrow()
  })

  it('rejects tampered ciphertext', () => {
    const key = new Uint8Array(32).fill(1)
    const envelope = encryptLanSyncJson(
      { value: 'protected' },
      key,
      new Uint8Array(12).fill(2),
      'response',
      'POST',
      '/mymind-sync/v1/plan',
      'token',
      'request-12345678'
    )
    const tampered = {
      ...envelope,
      ciphertext:
        (envelope.ciphertext[0] === 'A' ? 'B' : 'A') + envelope.ciphertext.slice(1)
    }
    expect(() =>
      decryptLanSyncJson(
        tampered,
        key,
        'response',
        'POST',
        '/mymind-sync/v1/plan',
        'token',
        'request-fedcba98'
      )
    ).toThrow()
  })
})
