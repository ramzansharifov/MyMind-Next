import { app, dialog, type BrowserWindow } from 'electron'
import electronUpdater from 'electron-updater'
import { appendFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

import type { DesktopUpdateStatus } from '../../shared/contracts/updates'

const STARTUP_CHECK_DELAY_MS = 15_000
const PERIODIC_CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000

interface DesktopAutoUpdateOptions {
  getWindow(): BrowserWindow | null
  onInstallRequested(): void
  onStatusChanged(status: DesktopUpdateStatus): void
}

function initialStatus(): DesktopUpdateStatus {
  return {
    currentVersion: app.getVersion(),
    phase: app.isPackaged && process.platform === 'win32' ? 'idle' : 'unsupported',
    availableVersion: null,
    percent: null,
    transferred: null,
    total: null,
    bytesPerSecond: null,
    lastCheckedAt: null,
    error: null
  }
}

function errorMessage(reason: unknown): string {
  if (reason instanceof Error) {
    return reason.message
  }

  return String(reason)
}

export class DesktopAutoUpdateService {
  private started = false
  private checking = false
  private restartPromptOpen = false
  private startupTimer: ReturnType<typeof setTimeout> | null = null
  private periodicTimer: ReturnType<typeof setInterval> | null = null
  private status = initialStatus()

  private readonly updater = electronUpdater.autoUpdater
  constructor(private readonly options: DesktopAutoUpdateOptions) {}

  start(): void {
    if (this.started) {
      return
    }

    if (!app.isPackaged || process.platform !== 'win32') {
      this.setStatus({ phase: 'unsupported' })
      return
    }

    this.started = true
    this.configureLogger()

    this.updater.autoDownload = false
    this.updater.autoInstallOnAppQuit = false
    this.updater.allowPrerelease = false
    this.updater.disableWebInstaller = true

    this.updater.on('checking-for-update', () => {
      this.setStatus({
        phase: 'checking',
        error: null,
        percent: null,
        transferred: null,
        total: null,
        bytesPerSecond: null
      })
    })

    this.updater.on('update-available', (info) => {
      this.setStatus({
        phase: 'available',
        availableVersion: info.version,
        lastCheckedAt: new Date().toISOString(),
        error: null
      })
    })

    this.updater.on('update-not-available', () => {
      this.setStatus({
        phase: 'up-to-date',
        availableVersion: null,
        percent: null,
        transferred: null,
        total: null,
        bytesPerSecond: null,
        lastCheckedAt: new Date().toISOString(),
        error: null
      })
    })

    this.updater.on('download-progress', (progress) => {
      this.setStatus({
        phase: 'downloading',
        percent: Math.max(0, Math.min(100, progress.percent)),
        transferred: progress.transferred,
        total: progress.total,
        bytesPerSecond: progress.bytesPerSecond,
        error: null
      })
    })

    this.updater.on('error', (reason) => {
      const message = errorMessage(reason)
      this.writeLog('ERROR', message)
      console.warn('Desktop auto-update check failed', reason)
      this.setStatus({
        phase: 'error',
        error: message,
        lastCheckedAt: new Date().toISOString()
      })
    })

    this.updater.on('update-downloaded', (info) => {
      this.setStatus({
        phase: 'downloaded',
        availableVersion: info.version,
        percent: 100,
        transferred: this.status.total ?? this.status.transferred,
        error: null
      })
      void this.promptForRestart(info.version)
    })

    this.startupTimer = setTimeout(() => {
      this.startupTimer = null
      void this.checkForUpdates()
    }, STARTUP_CHECK_DELAY_MS)

    this.periodicTimer = setInterval(() => {
      void this.checkForUpdates()
    }, PERIODIC_CHECK_INTERVAL_MS)

    this.writeLog('INFO', `Desktop updater started for MyMind ${this.status.currentVersion} (manual download mode)`)
    this.emitStatus()
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

  getStatus(): DesktopUpdateStatus {
    return { ...this.status }
  }

  async checkForUpdates(): Promise<DesktopUpdateStatus> {
    if (!this.started || this.checking) {
      return this.getStatus()
    }

    if (this.status.phase === 'downloading' || this.status.phase === 'downloaded') {
      return this.getStatus()
    }

    if (this.startupTimer) {
      clearTimeout(this.startupTimer)
      this.startupTimer = null
    }

    this.checking = true
    this.setStatus({ phase: 'checking', error: null })

    try {
      await this.updater.checkForUpdates()
    } catch (reason: unknown) {
      const message = errorMessage(reason)
      this.writeLog('ERROR', `Update check request failed: ${message}`)
      console.warn('Desktop auto-update request failed', reason)
      this.setStatus({
        phase: 'error',
        error: message,
        lastCheckedAt: new Date().toISOString()
      })
    } finally {
      this.checking = false
    }

    return this.getStatus()
  }

  async downloadUpdate(): Promise<DesktopUpdateStatus> {
    if (!this.started || this.status.phase !== 'available') {
      return this.getStatus()
    }

    this.setStatus({
      phase: 'downloading',
      percent: 0,
      transferred: 0,
      total: null,
      bytesPerSecond: null,
      error: null
    })

    try {
      await this.updater.downloadUpdate()
    } catch (reason: unknown) {
      const message = errorMessage(reason)
      this.writeLog('ERROR', `Update download failed: ${message}`)
      console.warn('Desktop update download failed', reason)
      this.setStatus({
        phase: 'error',
        error: message
      })
    }

    return this.getStatus()
  }

  requestInstall(): void {
    if (this.status.phase === 'downloaded') {
      this.options.onInstallRequested()
    }
  }

  installDownloadedUpdate(): void {
    this.writeLog('INFO', 'Installing downloaded update')
    this.updater.quitAndInstall(false, true)
  }

  private configureLogger(): void {
    const log = (level: string, message?: unknown, ...optionalParams: unknown[]): void => {
      const values = [message, ...optionalParams].filter((value) => value !== undefined)
      this.writeLog(
        level,
        values
          .map((value) => {
            if (value instanceof Error) return value.stack ?? value.message
            if (typeof value === 'string') return value

            try {
              return JSON.stringify(value)
            } catch {
              return String(value)
            }
          })
          .join(' ')
      )
    }

    this.updater.logger = {
      info: (message?: unknown, ...optionalParams: unknown[]) =>
        log('INFO', message, ...optionalParams),
      warn: (message?: unknown, ...optionalParams: unknown[]) =>
        log('WARN', message, ...optionalParams),
      error: (message?: unknown, ...optionalParams: unknown[]) =>
        log('ERROR', message, ...optionalParams),
      debug: (message?: unknown, ...optionalParams: unknown[]) =>
        log('DEBUG', message, ...optionalParams)
    }
  }

  private setStatus(patch: Partial<DesktopUpdateStatus>): void {
    this.status = {
      ...this.status,
      ...patch
    }

    this.writeLog(
      'STATUS',
      JSON.stringify({
        phase: this.status.phase,
        currentVersion: this.status.currentVersion,
        availableVersion: this.status.availableVersion,
        percent: this.status.percent === null ? null : Math.round(this.status.percent * 10) / 10,
        transferred: this.status.transferred,
        total: this.status.total,
        error: this.status.error
      })
    )
    this.emitStatus()
  }

  private emitStatus(): void {
    this.options.onStatusChanged(this.getStatus())
  }

  private writeLog(level: string, message: string): void {
    try {
      const logPath = join(app.getPath('userData'), 'logs', 'desktop-updater.log')
      mkdirSync(dirname(logPath), { recursive: true })
      appendFileSync(logPath, `[${new Date().toISOString()}] [${level}] ${message}\n`, 'utf8')
    } catch (reason: unknown) {
      console.warn('Failed to write desktop updater log', reason)
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
          'Можно перезапустить приложение сейчас. Перед установкой MyMind сначала безопасно сохранит открытые изменения. Если выбрать «Позже», установка не начнётся без вашего подтверждения.',
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
