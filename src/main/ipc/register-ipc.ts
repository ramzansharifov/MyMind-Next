import { BrowserWindow, ipcMain, type IpcMainInvokeEvent, type WebContents } from 'electron'

import { IPC_CHANNELS, type SystemWindowState } from '../../shared/contracts/system'
import { shutdownResponseSchema, systemHealthSchema } from '../../shared/validation/system'
import { getSqlite } from '../database/client'
import { mainOperationTracker } from '../services/main-operation-tracker'
import { registerBoardsIpcHandlers } from './register-boards-ipc'
import { registerDiaryIpcHandlers } from './register-diary-ipc'
import { registerFinanceIpcHandlers } from './register-finance-ipc'
import { registerHabitsIpcHandlers } from './register-habits-ipc'
import { registerMoviesIpcHandlers } from './register-movies-ipc'
import { registerMusicIpcHandlers } from './register-music-ipc'
import { registerNotesIpcHandlers } from './register-notes-ipc'
import { registerPasswordsIpcHandlers } from './register-passwords-ipc'
import { registerPreferencesIpcHandlers } from './register-preferences-ipc'
import { registerStudyIpcHandlers } from './register-study-ipc'
import { registerTasksIpcHandlers } from './register-tasks-ipc'

interface SQLiteVersionRow {
  version: string
}

interface RegisterIpcHandlersOptions {
  getTrustedWebContents(): WebContents | null
  onShutdownResponse(
    response: ReturnType<typeof shutdownResponseSchema.parse>
  ): void | Promise<void>
}

function getTrustedWindow(
  event: IpcMainInvokeEvent,
  getTrustedWebContents: () => WebContents | null
): BrowserWindow {
  const trustedWebContents = getTrustedWebContents()

  if (
    trustedWebContents === null ||
    event.sender !== trustedWebContents ||
    event.senderFrame !== event.sender.mainFrame
  ) {
    throw new Error('Untrusted window control request')
  }

  const window = BrowserWindow.fromWebContents(event.sender)

  if (!window || window.isDestroyed()) {
    throw new Error('Window is unavailable')
  }

  return window
}

function getWindowState(window: BrowserWindow): SystemWindowState {
  return {
    maximized: window.isMaximized()
  }
}

export function registerIpcHandlers(options: RegisterIpcHandlersOptions): void {
  registerStudyIpcHandlers()
  registerBoardsIpcHandlers()
  registerNotesIpcHandlers()
  registerDiaryIpcHandlers()
  registerFinanceIpcHandlers()
  registerMoviesIpcHandlers()
  registerMusicIpcHandlers()
  registerTasksIpcHandlers()
  registerHabitsIpcHandlers()
  registerPasswordsIpcHandlers()
  registerPreferencesIpcHandlers()

  ipcMain.removeHandler(IPC_CHANNELS.systemHealth)
  ipcMain.removeHandler(IPC_CHANNELS.respondToShutdown)
  ipcMain.removeHandler(IPC_CHANNELS.windowGetState)
  ipcMain.removeHandler(IPC_CHANNELS.windowMinimize)
  ipcMain.removeHandler(IPC_CHANNELS.windowToggleMaximize)
  ipcMain.removeHandler(IPC_CHANNELS.windowClose)

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

  ipcMain.handle(IPC_CHANNELS.windowGetState, (event) => {
    const window = getTrustedWindow(event, options.getTrustedWebContents)
    return getWindowState(window)
  })

  ipcMain.handle(IPC_CHANNELS.windowMinimize, (event) => {
    const window = getTrustedWindow(event, options.getTrustedWebContents)
    window.minimize()
  })

  ipcMain.handle(IPC_CHANNELS.windowToggleMaximize, (event) => {
    const window = getTrustedWindow(event, options.getTrustedWebContents)

    if (window.isMaximized()) {
      window.unmaximize()
    } else {
      window.maximize()
    }

    return getWindowState(window)
  })

  ipcMain.handle(IPC_CHANNELS.windowClose, (event) => {
    const window = getTrustedWindow(event, options.getTrustedWebContents)
    window.close()
  })

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
