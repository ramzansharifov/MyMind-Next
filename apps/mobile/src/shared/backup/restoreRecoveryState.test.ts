import { describe, expect, it } from 'vitest'
import {
  MOBILE_RESTORE_RECOVERY_VERSION,
  decodeMobileRestoreRecoveryMarker,
  encodeMobileRestoreRecoveryMarker,
  isMobileRestoreArtifactDirectoryName
} from './restoreRecoveryState'

const rollbackDirectory = '.mymind-restore-rollback-123e4567-e89b-12d3-a456-426614174000'
const stageDirectory = '.mymind-restore-stage-123e4567-e89b-12d3-a456-426614174000'

describe('mobile restore recovery marker', () => {
  it('round-trips a safe rollback directory', () => {
    expect(decodeMobileRestoreRecoveryMarker(encodeMobileRestoreRecoveryMarker(rollbackDirectory)))
      .toEqual({
        version: MOBILE_RESTORE_RECOVERY_VERSION,
        rollbackDirectory
      })
  })

  it('recognizes only strict internal restore artifact directories', () => {
    expect(isMobileRestoreArtifactDirectoryName(rollbackDirectory)).toBe(true)
    expect(isMobileRestoreArtifactDirectoryName(stageDirectory)).toBe(true)
    for (const value of [
      '.mymind-restore-rollback-',
      '.mymind-restore-stage-',
      '.mymind-restore-stage-../../document-assets',
      'document-assets',
      '../rollback'
    ]) {
      expect(isMobileRestoreArtifactDirectoryName(value)).toBe(false)
    }
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
