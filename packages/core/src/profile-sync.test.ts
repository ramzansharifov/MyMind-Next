import { describe, expect, it } from 'vitest'
import {
  createProfileSyncProof,
  deriveProfileSyncKey,
  normalizeProfileLogin,
  profileSyncKeyFingerprint,
  timingSafeHexEqual
} from './profile-sync'

describe('local profile sync identity', () => {
  it('normalizes the login consistently across devices', () => {
    expect(normalizeProfileLogin('  Ramzan.Test  ')).toBe('ramzan.test')
    expect(normalizeProfileLogin('ＲＡＭＺＡＮ')).toBe('ramzan')
  })

  it('derives the same credential fingerprint from the same login and password', async () => {
    const first = await deriveProfileSyncKey('Ramzan', 'secret-123')
    const second = await deriveProfileSyncKey(' ramzan ', 'secret-123')
    expect(profileSyncKeyFingerprint(first)).toBe(profileSyncKeyFingerprint(second))
  })

  it('rejects a proof created with a different password-derived key', async () => {
    const correct = await deriveProfileSyncKey('ramzan', 'secret-123')
    const wrong = await deriveProfileSyncKey('ramzan', 'other')
    const expected = createProfileSyncProof(
      'client',
      correct,
      'ramzan',
      'challenge',
      'client-nonce',
      'server-nonce'
    )
    const actual = createProfileSyncProof(
      'client',
      wrong,
      'ramzan',
      'challenge',
      'client-nonce',
      'server-nonce'
    )
    expect(timingSafeHexEqual(expected, actual)).toBe(false)
  })

  it('uses different proof domains for client and server', async () => {
    const key = await deriveProfileSyncKey('ramzan', 'secret-123')
    const client = createProfileSyncProof(
      'client',
      key,
      'ramzan',
      'challenge',
      'client-nonce',
      'server-nonce'
    )
    const server = createProfileSyncProof(
      'server',
      key,
      'ramzan',
      'challenge',
      'client-nonce',
      'server-nonce'
    )
    expect(client).not.toBe(server)
  })
})
