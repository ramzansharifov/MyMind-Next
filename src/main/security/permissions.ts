import type { Session } from 'electron'

export type PermissionPolicySession = Pick<
  Session,
  'setPermissionCheckHandler' | 'setPermissionRequestHandler'
>

export function isAppPermissionAllowed(permission: string): boolean {
  // Add a narrowly scoped allowlist entry here only after the feature has a documented threat model.
  void permission
  return false
}

export function installPermissionPolicy(targetSession: PermissionPolicySession): void {
  targetSession.setPermissionCheckHandler((_webContents, permission) =>
    isAppPermissionAllowed(permission)
  )
  targetSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(isAppPermissionAllowed(permission))
  })
}
