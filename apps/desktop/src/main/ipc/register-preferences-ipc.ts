import { ipcMain } from 'electron'

import { PREFERENCES_IPC_CHANNELS } from '../../shared/contracts/preferences'
import { updateAppearancePreferencesInputSchema } from '../../shared/validation/preferences'
import {
  getAppearancePreferences,
  updateAppearancePreferences
} from '../repositories/preferences.repository'
import { mainOperationTracker } from '../services/main-operation-tracker'

export function registerPreferencesIpcHandlers(): void {
  Object.values(PREFERENCES_IPC_CHANNELS).forEach((channel) => {
    ipcMain.removeHandler(channel)
  })

  ipcMain.handle(PREFERENCES_IPC_CHANNELS.getAppearance, () =>
    mainOperationTracker.run(() => getAppearancePreferences())
  )

  ipcMain.handle(PREFERENCES_IPC_CHANNELS.updateAppearance, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => {
      const input = updateAppearancePreferencesInputSchema.parse(rawInput)

      return updateAppearancePreferences(input)
    })
  )
}
