import { ipcMain } from 'electron'

import { PREFERENCES_IPC_CHANNELS } from '../../shared/contracts/preferences'
import { updateAppearancePreferencesInputSchema } from '../../shared/validation/preferences'
import {
  getAppearancePreferences,
  updateAppearancePreferences
} from '../repositories/preferences.repository'

export function registerPreferencesIpcHandlers(): void {
  Object.values(PREFERENCES_IPC_CHANNELS).forEach((channel) => {
    ipcMain.removeHandler(channel)
  })

  ipcMain.handle(PREFERENCES_IPC_CHANNELS.getAppearance, () => getAppearancePreferences())

  ipcMain.handle(PREFERENCES_IPC_CHANNELS.updateAppearance, (_event, rawInput: unknown) => {
    const input = updateAppearancePreferencesInputSchema.parse(rawInput)

    return updateAppearancePreferences(input)
  })
}
