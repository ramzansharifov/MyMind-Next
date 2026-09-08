export const MOBILE_RESTORE_RECOVERY_VERSION = 1 as const
export const MOBILE_RESTORE_PENDING_FILE = '.mymind-restore-pending.json'
export const MOBILE_RESTORE_ROLLBACK_PREFIX = '.mymind-restore-rollback-'

const ROLLBACK_DIRECTORY_PATTERN = /^\.mymind-restore-rollback-[0-9a-f-]{36}$/i

export interface MobileRestoreRecoveryMarker {
  version: typeof MOBILE_RESTORE_RECOVERY_VERSION
  rollbackDirectory: string
}

export function assertSafeRollbackDirectoryName(value: string): void {
  if (!ROLLBACK_DIRECTORY_PATTERN.test(value)) {
    throw new Error('Некорректная точка отката MyMind')
  }
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
