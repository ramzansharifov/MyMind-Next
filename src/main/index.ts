import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { app, BrowserWindow, dialog, session, shell } from 'electron'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

import windowsIcon from '../../build/icon.ico?asset'
import icon from '../../resources/icon.png?asset'
import { IPC_CHANNELS } from '../shared/contracts/system'
import { closeDatabase, initializeDatabase } from './database/client'
import { runDatabaseMigrations } from './database/migrate'
import { registerIpcHandlers } from './ipc/register-ipc'
import { lockPasswordVault } from './repositories/passwords.repository'
import { runStudyLinkTargetsMaintenance } from './repositories/study.repository'
import { installContentSecurityPolicy } from './security/content-security-policy'
import { installPermissionPolicy } from './security/permissions'
import { focusExistingAppWindow } from './security/single-instance'
import { AiChatViewController } from './services/ai-chat-view-controller'
import { CalendarReminderScheduler } from './services/calendar-reminder-scheduler'
import { HabitReminderScheduler } from './services/habit-reminder-scheduler'
import { mainOperationTracker } from './services/main-operation-tracker'
import { clearTrackedPasswordClipboard } from './services/password-clipboard'
import {
  ShutdownCoordinator,
  type ShutdownFallbackContext,
  type ShutdownFallbackDecision,
  type ShutdownFallbackReason
} from './services/shutdown-coordinator'
import { registerStudyAssetProtocol, registerStudyAssetScheme } from './services/study-assets'
import { runStudyPlainTextMaintenance } from './services/study-plain-text-maintenance'

let mainWindow: BrowserWindow | null = null
const aiChatViewController = new AiChatViewController(() => mainWindow)
const calendarReminderScheduler = new CalendarReminderScheduler(() => mainWindow)
const habitReminderScheduler = new HabitReminderScheduler(() => mainWindow)

const APP_USER_MODEL_ID = 'com.mymind.desktop'
const WINDOWS_DEV_TOAST_ACTIVATOR_CLSID = '{D9EAA7A4-8E8F-4CC9-B63B-C074E7DF5597}'

function resolveAppUserModelId(): string {
  return process.platform === 'win32' && is.dev ? process.execPath : APP_USER_MODEL_ID
}

function configureDesktopNotificationIdentity(): void {
  if (process.platform === 'win32' && is.dev) {
    app.setToastActivatorCLSID(WINDOWS_DEV_TOAST_ACTIVATOR_CLSID)
  }
  electronApp.setAppUserModelId(resolveAppUserModelId())
}

function ensureWindowsDevelopmentNotificationShortcut(): void {
  if (process.platform !== 'win32' || !is.dev) return

  try {
    const programsDirectory = join(
      app.getPath('appData'),
      'Microsoft',
      'Windows',
      'Start Menu',
      'Programs'
    )
    mkdirSync(programsDirectory, { recursive: true })

    const shortcutPath = join(programsDirectory, 'MyMind Development.lnk')
    const created = shell.writeShortcutLink(shortcutPath, 'create', {
      target: process.execPath,
      cwd: app.getAppPath(),
      args: `"${app.getAppPath()}"`,
      description: 'MyMind development',
      appUserModelId: resolveAppUserModelId(),
      toastActivatorClsid: app.toastActivatorCLSID
    })

    if (!created) {
      console.warn('Failed to create the Windows development notification shortcut', shortcutPath)
    }
  } catch (reason: unknown) {
    console.warn('Failed to configure the Windows development notification shortcut', reason)
  }
}

const shutdownFallbackCopy: Record<
  ShutdownFallbackReason,
  {
    message: string
    detail: string
  }
> = {
  'renderer-timeout': {
    message: 'Интерфейс не подтвердил сохранение изменений.',
    detail:
      'Можно подождать ещё, отменить закрытие или закрыть приложение без гарантии сохранения последних изменений.'
  },
  'renderer-unresponsive': {
    message: 'Интерфейс MyMind перестал отвечать.',
    detail:
      'Можно подождать восстановления, отменить закрытие или завершить приложение принудительно.'
  },
  'renderer-gone': {
    message: 'Процесс интерфейса MyMind завершился.',
    detail:
      'Последние несохранённые изменения могут быть недоступны. Можно отменить закрытие или завершить приложение.'
  },
  'operations-timeout': {
    message: 'Фоновые операции выполняются дольше ожидаемого.',
    detail:
      'Возможно, ещё копируется файл или сохраняется материал. Можно подождать, отменить закрытие или завершить приложение принудительно.'
  }
}

async function resolveShutdownFallback(
  context: ShutdownFallbackContext
): Promise<ShutdownFallbackDecision> {
  const copy = shutdownFallbackCopy[context.reason]

  const buttons = context.canRetry
    ? ['Подождать ещё', 'Отменить закрытие', 'Закрыть без сохранения']
    : ['Отменить закрытие', 'Закрыть без сохранения']

  const options = {
    type: 'warning' as const,
    title: 'Завершение MyMind',
    message: copy.message,
    detail: copy.detail,
    buttons,
    defaultId: 0,
    cancelId: context.canRetry ? 1 : 0,
    noLink: true
  }

  const ownerWindow = mainWindow && !mainWindow.isDestroyed() ? mainWindow : null

  const result = ownerWindow
    ? await dialog.showMessageBox(ownerWindow, options)
    : await dialog.showMessageBox(options)

  if (context.canRetry) {
    if (result.response === 0) {
      return 'retry'
    }

    if (result.response === 2) {
      return 'force'
    }

    return 'cancel'
  }

  return result.response === 1 ? 'force' : 'cancel'
}

function closeApplicationResources(): void {
  aiChatViewController.destroy()
  calendarReminderScheduler.stop()
  habitReminderScheduler.stop()
  clearTrackedPasswordClipboard()
  lockPasswordVault()
  closeDatabase()
}

const shutdownCoordinator = new ShutdownCoordinator({
  closeResources: closeApplicationResources,
  waitForOperations: () => mainOperationTracker.whenIdle(),
  pauseOperations: () => mainOperationTracker.pauseNewOperations(),
  resumeOperations: () => mainOperationTracker.resumeNewOperations(),
  resolveFallback: resolveShutdownFallback
})

function requestWindowShutdown(window: BrowserWindow): void {
  shutdownCoordinator.requestShutdown({
    sendRequest: (requestId) => {
      window.webContents.send(IPC_CHANNELS.shutdownRequested, {
        requestId
      })
    },
    isAvailable: () => !window.isDestroyed() && !window.webContents.isDestroyed(),
    close: () => {
      if (!window.isDestroyed()) {
        window.destroy()
      }

      app.quit()
    }
  })
}

function requestHeadlessShutdown(): void {
  void shutdownCoordinator.requestShutdownWithoutRenderer({
    sendRequest: () => undefined,
    isAvailable: () => true,
    close: () => {
      app.quit()
    }
  })
}

function createWindow(): void {
  const window = new BrowserWindow({
    width: 900,
    height: 670,
    minWidth: 760,
    minHeight: 560,
    show: false,
    frame: false,
    title: 'MyMind',
    backgroundColor: '#0b0d10',
    autoHideMenuBar: true,
    icon: process.platform === 'win32' ? windowsIcon : icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  mainWindow = window

  if (process.platform === 'win32') {
    window.setAppDetails({
      appId: resolveAppUserModelId(),
      appIconPath: windowsIcon,
      appIconIndex: 0
    })
  }

  const sendWindowState = (): void => {
    if (!window.isDestroyed() && !window.webContents.isDestroyed()) {
      window.webContents.send(IPC_CHANNELS.windowStateChanged, {
        maximized: window.isMaximized()
      })
    }
  }

  window.on('ready-to-show', () => {
    window.show()
  })

  window.on('maximize', sendWindowState)
  window.on('unmaximize', sendWindowState)

  window.on('close', (event) => {
    if (!shutdownCoordinator.isApproved()) {
      event.preventDefault()
      requestWindowShutdown(window)
    }
  })

  window.on('query-session-end', (event) => {
    if (!shutdownCoordinator.isApproved()) {
      event.preventDefault()
      requestWindowShutdown(window)
    }
  })

  window.on('closed', () => {
    aiChatViewController.onWindowClosed(window)
    if (mainWindow === window) {
      mainWindow = null
    }
  })

  window.webContents.on('unresponsive', () => {
    shutdownCoordinator.notifyRendererUnavailable('renderer-unresponsive')
  })

  window.webContents.on('render-process-gone', (_event, details) => {
    if (details.reason !== 'clean-exit') {
      shutdownCoordinator.notifyRendererUnavailable('renderer-gone')
    }
  })

  window.webContents.on('destroyed', () => {
    shutdownCoordinator.notifyRendererUnavailable('renderer-gone')
  })

  window.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsedUrl = new URL(url)

      if (parsedUrl.protocol === 'https:' || parsedUrl.protocol === 'mailto:') {
        void shell.openExternal(url)
      }
    } catch {
      // Invalid URLs are ignored.
    }

    return {
      action: 'deny'
    }
  })

  window.webContents.on('will-navigate', (event, navigationUrl) => {
    const currentUrl = window.webContents.getURL()

    if (navigationUrl !== currentUrl) {
      event.preventDefault()
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    void window.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

const hasSingleInstanceLock = app.requestSingleInstanceLock()

if (!hasSingleInstanceLock) {
  app.quit()
} else {
  registerStudyAssetScheme()

  app.on('second-instance', () => {
    focusExistingAppWindow(mainWindow)
  })

  void app.whenReady().then(() => {
    configureDesktopNotificationIdentity()
    ensureWindowsDevelopmentNotificationShortcut()

    app.on('browser-window-created', (_event, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    const rendererUrl =
      is.dev && process.env['ELECTRON_RENDERER_URL']
        ? process.env['ELECTRON_RENDERER_URL']
        : pathToFileURL(join(__dirname, '../renderer/index.html')).href

    installPermissionPolicy(session.defaultSession, {
      rendererUrl,
      getTrustedWebContents: () => mainWindow?.webContents ?? null
    })

    installContentSecurityPolicy(session.defaultSession, {
      development: is.dev,
      rendererUrl
    })

    registerStudyAssetProtocol()

    initializeDatabase()
    runDatabaseMigrations()

    const plainTextMaintenance = runStudyPlainTextMaintenance()

    if (plainTextMaintenance.applied) {
      console.info('Study plain-text maintenance completed', plainTextMaintenance)
    }

    runStudyLinkTargetsMaintenance()

    registerIpcHandlers({
      getTrustedWebContents: () => mainWindow?.webContents ?? null,
      aiChat: {
        setOpen: (input) => aiChatViewController.setOpen(input),
        setBounds: (bounds) => aiChatViewController.setBounds(bounds),
        reload: () => aiChatViewController.reload()
      },
      onShutdownResponse: (response) => shutdownCoordinator.respond(response)
    })

    createWindow()
    calendarReminderScheduler.start()
    habitReminderScheduler.start()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
      }
    })
  })
}

app.on('before-quit', (event) => {
  if (shutdownCoordinator.isApproved()) {
    return
  }

  event.preventDefault()

  if (mainWindow && !mainWindow.isDestroyed()) {
    requestWindowShutdown(mainWindow)
    return
  }

  requestHeadlessShutdown()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
