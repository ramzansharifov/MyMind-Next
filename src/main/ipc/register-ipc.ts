import { ipcMain, type WebContents } from 'electron'

import { IPC_CHANNELS } from '../../shared/contracts/system'
import { shutdownResponseSchema, systemHealthSchema } from '../../shared/validation/system'
import { getSqlite } from '../database/client'
import { mainOperationTracker } from '../services/main-operation-tracker'
import { registerBoardsIpcHandlers } from './register-boards-ipc'
import { registerPreferencesIpcHandlers } from './register-preferences-ipc'
import { registerStudyIpcHandlers } from './register-study-ipc'

interface SQLiteVersionRow {
  version: string
}

interface RegisterIpcHandlersOptions {
  getTrustedWebContents(): WebContents | null
  onShutdownResponse(
    response: ReturnType<typeof shutdownResponseSchema.parse>
  ): void | Promise<void>
}

export function registerIpcHandlers(options: RegisterIpcHandlersOptions): void {
  registerStudyIpcHandlers()
  registerBoardsIpcHandlers()
  registerPreferencesIpcHandlers()

  ipcMain.removeHandler(IPC_CHANNELS.systemHealth)
  ipcMain.removeHandler(IPC_CHANNELS.respondToShutdown)

  ipcMain.handle(IPC_CHANNELS.systemHealth, () =>
    mainOperationTracker.run(() => {
      const result = getSqlite()
        .prepare('SELECT sqlite_version() AS version')
        .get() as SQLiteVersionRow

      return systemHealthSchema.parse({
        database: 'ready',
        sqliteVersion: result.version
      })
    })
  )

  ipcMain.handle(IPC_CHANNELS.respondToShutdown, (event, rawResponse: unknown) => {
    const trustedWebContents = options.getTrustedWebContents()

    if (
      trustedWebContents === null ||
      event.sender !== trustedWebContents ||
      event.senderFrame !== event.sender.mainFrame
    ) {
      throw new Error('Untrusted shutdown response')
    }

    return options.onShutdownResponse(shutdownResponseSchema.parse(rawResponse))
  })
}
