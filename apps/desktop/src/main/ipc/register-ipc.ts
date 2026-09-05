import { BrowserWindow, ipcMain, type IpcMainInvokeEvent, type WebContents } from 'electron'

import {
  AI_CHAT_IPC_CHANNELS,
  type AiChatBounds,
  type SetAiChatOpenInput
} from '../../shared/contracts/ai-chat'
import {
  IPC_CHANNELS,
  type StorageChangeResult,
  type StorageInfo,
  type SystemWindowState
} from '../../shared/contracts/system'
import { aiChatBoundsSchema, setAiChatOpenInputSchema } from '../../shared/validation/ai-chat'
import { shutdownResponseSchema, systemHealthSchema } from '../../shared/validation/system'
import { getSqlite } from '../database/client'
import { mainOperationTracker } from '../services/main-operation-tracker'
import { registerBoardsIpcHandlers } from './register-boards-ipc'
import { registerCalendarIpcHandlers } from './register-calendar-ipc'
import { registerDiaryIpcHandlers } from './register-diary-ipc'
import { registerFinanceIpcHandlers } from './register-finance-ipc'
import { registerHabitsIpcHandlers } from './register-habits-ipc'
import { registerMoviesIpcHandlers } from './register-movies-ipc'
import { registerMusicIpcHandlers } from './register-music-ipc'
import { registerNotesIpcHandlers } from './register-notes-ipc'
import { registerNutritionIpcHandlers } from './register-nutrition-ipc'
import { registerPasswordsIpcHandlers } from './register-passwords-ipc'
import { registerPreferencesIpcHandlers } from './register-preferences-ipc'
import { registerStudyIpcHandlers } from './register-study-ipc'
import { registerTasksIpcHandlers } from './register-tasks-ipc'
import { registerWorkoutsIpcHandlers } from './register-workouts-ipc'

interface SQLiteVersionRow {
  version: string
}

interface RegisterIpcHandlersOptions {
  getTrustedWebContents(): WebContents | null
  storage: {
    getInfo(): StorageInfo
    changeLocation(window: BrowserWindow): Promise<StorageChangeResult>
    openLocation(): Promise<void>
  }
  aiChat: {
    setOpen(input: SetAiChatOpenInput): void
    setBounds(bounds: AiChatBounds): void
    reload(): void
  }
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
  registerCalendarIpcHandlers()
  registerNotesIpcHandlers()
  registerDiaryIpcHandlers()
  registerFinanceIpcHandlers()
  registerMoviesIpcHandlers()
  registerMusicIpcHandlers()
  registerTasksIpcHandlers()
  registerHabitsIpcHandlers()
  registerPasswordsIpcHandlers()
  registerWorkoutsIpcHandlers()
  registerNutritionIpcHandlers()
  registerPreferencesIpcHandlers()

  ipcMain.removeHandler(AI_CHAT_IPC_CHANNELS.setOpen)
  ipcMain.removeHandler(AI_CHAT_IPC_CHANNELS.setBounds)
  ipcMain.removeHandler(AI_CHAT_IPC_CHANNELS.reload)
  ipcMain.removeHandler(IPC_CHANNELS.systemHealth)
  ipcMain.removeHandler(IPC_CHANNELS.storageGetInfo)
  ipcMain.removeHandler(IPC_CHANNELS.storageChangeLocation)
  ipcMain.removeHandler(IPC_CHANNELS.storageOpenLocation)
  ipcMain.removeHandler(IPC_CHANNELS.respondToShutdown)
  ipcMain.removeHandler(IPC_CHANNELS.windowGetState)
  ipcMain.removeHandler(IPC_CHANNELS.windowMinimize)
  ipcMain.removeHandler(IPC_CHANNELS.windowToggleMaximize)
  ipcMain.removeHandler(IPC_CHANNELS.windowClose)

  ipcMain.handle(AI_CHAT_IPC_CHANNELS.setOpen, (event, rawInput: unknown) => {
    getTrustedWindow(event, options.getTrustedWebContents)
    options.aiChat.setOpen(setAiChatOpenInputSchema.parse(rawInput))
  })

  ipcMain.handle(AI_CHAT_IPC_CHANNELS.setBounds, (event, rawBounds: unknown) => {
    getTrustedWindow(event, options.getTrustedWebContents)
    options.aiChat.setBounds(aiChatBoundsSchema.parse(rawBounds))
  })

  ipcMain.handle(AI_CHAT_IPC_CHANNELS.reload, (event) => {
    getTrustedWindow(event, options.getTrustedWebContents)
    options.aiChat.reload()
  })

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

  ipcMain.handle(IPC_CHANNELS.storageGetInfo, (event) => {
    getTrustedWindow(event, options.getTrustedWebContents)
    return options.storage.getInfo()
  })

  ipcMain.handle(IPC_CHANNELS.storageChangeLocation, (event) => {
    const window = getTrustedWindow(event, options.getTrustedWebContents)
    return options.storage.changeLocation(window)
  })

  ipcMain.handle(IPC_CHANNELS.storageOpenLocation, (event) => {
    getTrustedWindow(event, options.getTrustedWebContents)
    return options.storage.openLocation()
  })

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
