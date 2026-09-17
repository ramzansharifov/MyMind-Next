import { app, dialog, type BrowserWindow } from 'electron'
import electronUpdater from 'electron-updater'

const STARTUP_CHECK_DELAY_MS = 15_000
const PERIODIC_CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000

interface DesktopAutoUpdateOptions {
  getWindow(): BrowserWindow | null
  onInstallRequested(): void
}

export class DesktopAutoUpdateService {
  private started = false
  private checking = false
  private restartPromptOpen = false
  private startupTimer: ReturnType<typeof setTimeout> | null = null
  private periodicTimer: ReturnType<typeof setInterval> | null = null

  private readonly updater = electronUpdater.autoUpdater

  constructor(private readonly options: DesktopAutoUpdateOptions) {}

  start(): void {
    if (this.started || !app.isPackaged || process.platform !== 'win32') {
      return
    }

    this.started = true
    this.updater.logger = console
    this.updater.autoDownload = true
    this.updater.autoInstallOnAppQuit = true
    this.updater.allowPrerelease = false
    this.updater.disableWebInstaller = true

    this.updater.on('error', (reason) => {
      console.warn('Desktop auto-update check failed', reason)
    })

    this.updater.on('update-downloaded', (info) => {
      void this.promptForRestart(info.version)
    })

    this.startupTimer = setTimeout(() => {
      this.startupTimer = null
      void this.checkForUpdates()
    }, STARTUP_CHECK_DELAY_MS)

    this.periodicTimer = setInterval(() => {
      void this.checkForUpdates()
    }, PERIODIC_CHECK_INTERVAL_MS)
  }

  stop(): void {
    if (this.startupTimer) {
      clearTimeout(this.startupTimer)
      this.startupTimer = null
    }

    if (this.periodicTimer) {
      clearInterval(this.periodicTimer)
      this.periodicTimer = null
    }
  }

  installDownloadedUpdate(): void {
    this.updater.quitAndInstall(false, true)
  }

  private async checkForUpdates(): Promise<void> {
    if (!this.started || this.checking) {
      return
    }

    this.checking = true

    try {
      await this.updater.checkForUpdates()
    } catch (reason: unknown) {
      console.warn('Desktop auto-update request failed', reason)
    } finally {
      this.checking = false
    }
  }

  private async promptForRestart(version: string): Promise<void> {
    if (this.restartPromptOpen) {
      return
    }

    this.restartPromptOpen = true

    try {
      const options = {
        type: 'info' as const,
        title: 'Обновление MyMind готово',
        message: `MyMind ${version} уже скачан.`,
        detail:
          'Можно перезапустить приложение сейчас. Перед установкой MyMind сначала безопасно сохранит открытые изменения. Если выбрать «Позже», обновление установится при обычном завершении приложения.',
        buttons: ['Перезапустить и установить', 'Позже'],
        defaultId: 0,
        cancelId: 1,
        noLink: true
      }

      const ownerWindow = this.options.getWindow()
      const result =
        ownerWindow && !ownerWindow.isDestroyed()
          ? await dialog.showMessageBox(ownerWindow, options)
          : await dialog.showMessageBox(options)

      if (result.response === 0) {
        this.options.onInstallRequested()
      }
    } finally {
      this.restartPromptOpen = false
    }
  }
}
