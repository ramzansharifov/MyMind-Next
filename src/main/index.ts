import { app, shell, BrowserWindow, session } from 'electron'
import { join } from 'path'
import { pathToFileURL } from 'node:url'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

import { closeDatabase, initializeDatabase } from './database/client'
import { runDatabaseMigrations } from './database/migrate'
import { registerIpcHandlers } from './ipc/register-ipc'
import { registerStudyAssetProtocol, registerStudyAssetScheme } from './services/study-assets'
import { installContentSecurityPolicy } from './security/content-security-policy'
import { installPermissionPolicy } from './security/permissions'
import { focusExistingAppWindow } from './security/single-instance'
import { runStudyLinkTargetsMaintenance } from './repositories/study.repository'
import { ShutdownCoordinator } from './services/shutdown-coordinator'
import { runStudyPlainTextMaintenance } from './services/study-plain-text-maintenance'
import { IPC_CHANNELS } from '../shared/contracts/system'

let mainWindow: BrowserWindow | null = null
const shutdownCoordinator = new ShutdownCoordinator(closeDatabase)

function requestWindowShutdown(window: BrowserWindow): void {
  shutdownCoordinator.requestShutdown({
    sendRequest: (requestId) => {
      window.webContents.send(IPC_CHANNELS.shutdownRequested, { requestId })
    },
    close: () => {
      if (!window.isDestroyed()) {
        window.destroy()
      }
      app.quit()
    }
  })
}

function createWindow(): void {
  // Create the browser window.
  const window = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })
  mainWindow = window

  window.on('ready-to-show', () => {
    window.show()
  })
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
    if (mainWindow === window) mainWindow = null
  })

  window.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsedUrl = new URL(url)

      if (parsedUrl.protocol === 'https:' || parsedUrl.protocol === 'mailto:') {
        void shell.openExternal(url)
      }
    } catch {
      // Invalid URL — do nothing.
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

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
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
    // Set app user model id for windows
    electronApp.setAppUserModelId('com.mymind.desktop')

    // Default open or close DevTools by F12 in development
    // and ignore CommandOrControl + R in production.
    // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
    app.on('browser-window-created', (_, window) => {
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
      onShutdownResponse: (response) => {
        shutdownCoordinator.respond(response)
      }
    })
    createWindow()

    app.on('activate', function () {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
}

app.on('before-quit', (event) => {
  if (shutdownCoordinator.isApproved()) {
    return
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    event.preventDefault()
    requestWindowShutdown(mainWindow)
    return
  }

  closeDatabase()
})
// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
