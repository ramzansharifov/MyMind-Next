import { ipcMain } from 'electron'

import { IPC_CHANNELS } from '../../shared/contracts/system'
import { systemHealthSchema } from '../../shared/validation/system'
import { getSqlite } from '../database/client'

interface SQLiteVersionRow {
  version: string
}

export function registerIpcHandlers(): void {
  ipcMain.removeHandler(IPC_CHANNELS.systemHealth)

  ipcMain.handle(IPC_CHANNELS.systemHealth, () => {
    const result = getSqlite()
      .prepare('SELECT sqlite_version() AS version')
      .get() as SQLiteVersionRow

    return systemHealthSchema.parse({
      database: 'ready',
      sqliteVersion: result.version
    })
  })
}
