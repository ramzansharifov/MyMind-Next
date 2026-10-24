export interface BackupSummary {
  createdAt: number
  files: number
  bytes: number
}

export interface RestoreResult extends BackupSummary {
  restored: boolean
}
