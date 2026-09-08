import { describe, expect, it } from 'vitest'
import {
  MOBILE_RESTORE_RECOVERY_VERSION,
  decodeMobileRestoreRecoveryMarker,
  encodeMobileRestoreRecoveryMarker
} from './restoreRecoveryState'

const rollbackDirectory = '.mymind-restore-rollback-123e4567-e89b-12d3-a456-426614174000'

describe('mobile restore recovery marker', () => {
  it('round-trips a safe rollback directory', () => {
    expect(decodeMobileRestoreRecoveryMarker(encodeMobileRestoreRecoveryMarker(rollbackDirectory)))
      .toEqual({
        version: MOBILE_RESTORE_RECOVERY_VERSION,
        rollbackDirectory
      })
  })

  it('rejects traversal and arbitrary directories', () => {
    for (const value of [
      '../rollback',
      '/rollback',
      '.mymind-restore-rollback-../../data',
      'document-assets'
    ]) {
      expect(() => encodeMobileRestoreRecoveryMarker(value)).toThrow(/точка отката/i)
    }
  })

  it('rejects malformed and unsupported markers', () => {
    expect(() => decodeMobileRestoreRecoveryMarker('{')).toThrow(/повреждена/i)
    expect(() =>
      decodeMobileRestoreRecoveryMarker(
        JSON.stringify({ version: MOBILE_RESTORE_RECOVERY_VERSION + 1, rollbackDirectory })
      )
    ).toThrow(/несовместима/i)
  })
})
