import type { AppearancePreferences } from '@mymind/contracts/preferences'
import type { MobileBackupSummary, MobileRestoreResult } from '../shared/backup/mobileBackup'
import { SettingsScreen } from './SettingsScreen'
import { ReminderSettings } from './ReminderSettings'
import { MobileUpdateSettings } from './MobileUpdateSettings'
import type { MobileUpdaterController } from './useMobileUpdater'

export function Settings({
  updater,
  ...props
}: {
  appearance: AppearancePreferences
  updater: MobileUpdaterController
  save(value: AppearancePreferences): void
  exportBackup(): Promise<MobileBackupSummary>
  restoreBackup(): Promise<MobileRestoreResult>
}): React.JSX.Element {
  return (
    <SettingsScreen
      {...props}
      reminders={<ReminderSettings />}
      updates={<MobileUpdateSettings updater={updater} />}
      updatesSubtitle={
        updater.status.phase === 'available' && updater.status.available
          ? `Доступна v${updater.status.available.version}`
          : `Установлена v${updater.status.currentVersion}`
      }
    />
  )
}
