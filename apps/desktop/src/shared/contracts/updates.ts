export const UPDATE_IPC_CHANNELS = {
  getStatus: 'updates:get-status',
  check: 'updates:check',
  install: 'updates:install',
  statusChanged: 'updates:status-changed'
} as const

export type DesktopUpdatePhase =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'up-to-date'
  | 'error'
  | 'unsupported'

export interface DesktopUpdateStatus {
  currentVersion: string
  phase: DesktopUpdatePhase
  availableVersion: string | null
  percent: number | null
  transferred: number | null
  total: number | null
  bytesPerSecond: number | null
  lastCheckedAt: string | null
  error: string | null
}

export interface DesktopUpdatesApi {
  getStatus(): Promise<DesktopUpdateStatus>
  check(): Promise<DesktopUpdateStatus>
  install(): Promise<void>
  onStatusChanged(listener: (status: DesktopUpdateStatus) => void): () => void
}
