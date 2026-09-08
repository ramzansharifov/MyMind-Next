export const MOBILE_RESTORE_RECOVERY_VERSION = 1 as const
export const MOBILE_RESTORE_PENDING_FILE = '.mymind-restore-pending.json'
export const MOBILE_RESTORE_ROLLBACK_PREFIX = '.mymind-restore-rollback-'
export const MOBILE_RESTORE_STAGE_PREFIX = '.mymind-restore-stage-'

const UUID_TEXT = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const ROLLBACK_DIRECTORY_PATTERN = new RegExp(`^\\.mymind-restore-rollback-${UUID_TEXT}$`, 'i')
const STAGE_DIRECTORY_PATTERN = new RegExp(`^\\.mymind-restore-stage-${UUID_TEXT}$`, 'i')

export interface MobileRestoreRecoveryMarker {
  version: typeof MOBILE_RESTORE_RECOVERY_VERSION
  rollbackDirectory: string
}

export function assertSafeRollbackDirectoryName(value: string): void {
  if (!ROLLBACK_DIRECTORY_PATTERN.test(value)) {
    throw new Error('Некорректная точка отката MyMind')
  }
}

export function isMobileRestoreArtifactDirectoryName(value: string): boolean {
  return ROLLBACK_DIRECTORY_PATTERN.test(value) || STAGE_DIRECTORY_PATTERN.test(value)
}

export function encodeMobileRestoreRecoveryMarker(rollbackDirectory: string): string {
  assertSafeRollbackDirectoryName(rollbackDirectory)
  return JSON.stringify({
    version: MOBILE_RESTORE_RECOVERY_VERSION,
    rollbackDirectory
  } satisfies MobileRestoreRecoveryMarker)
}

export function decodeMobileRestoreRecoveryMarker(value: string): MobileRestoreRecoveryMarker {
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    throw new Error('Служебная точка отката MyMind повреждена')
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Служебная точка отката MyMind повреждена')
  }
  const candidate = parsed as Record<string, unknown>
  if (
    candidate.version !== MOBILE_RESTORE_RECOVERY_VERSION ||
    typeof candidate.rollbackDirectory !== 'string'
  ) {
    throw new Error('Служебная точка отката MyMind несовместима')
  }
  assertSafeRollbackDirectoryName(candidate.rollbackDirectory)
  return {
    version: MOBILE_RESTORE_RECOVERY_VERSION,
    rollbackDirectory: candidate.rollbackDirectory
  }
}
