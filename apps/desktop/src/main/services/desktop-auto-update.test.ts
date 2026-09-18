import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const listeners = new Map<string, Array<(value?: unknown) => void>>()

  return {
    listeners,
    isPackaged: true,
    checkForUpdates: vi.fn<() => Promise<void>>(),
    quitAndInstall: vi.fn(),
    showMessageBox: vi.fn(),
    on: vi.fn((event: string, listener: (value?: unknown) => void) => {
      const current = listeners.get(event) ?? []
      current.push(listener)
      listeners.set(event, current)
    }),
    appendFileSync: vi.fn(),
    mkdirSync: vi.fn()
  }
})

vi.mock('electron', () => ({
  app: {
    get isPackaged() {
      return mocks.isPackaged
    },
    getVersion: () => '1.1.1',
    getPath: () => 'C:\\MyMindTest'
  },
  dialog: {
    showMessageBox: mocks.showMessageBox
  }
}))

vi.mock('electron-updater', () => ({
  default: {
    autoUpdater: {
      autoDownload: false,
      autoInstallOnAppQuit: false,
      allowPrerelease: true,
      disableWebInstaller: false,
      logger: null,
      on: mocks.on,
      checkForUpdates: mocks.checkForUpdates,
      quitAndInstall: mocks.quitAndInstall
    }
  }
}))

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>()
  const mocked = {
    ...actual,
    appendFileSync: mocks.appendFileSync,
    mkdirSync: mocks.mkdirSync
  }

  return {
    ...mocked,
    default: mocked
  }
})

function emit(event: string, value?: unknown): void {
  for (const listener of mocks.listeners.get(event) ?? []) {
    listener(value)
  }
}

async function loadService(): Promise<typeof import('./desktop-auto-update')> {
  return import('./desktop-auto-update')
}

beforeEach(() => {
  vi.resetModules()
  vi.useFakeTimers()
  mocks.listeners.clear()
  mocks.isPackaged = true
  mocks.checkForUpdates.mockReset().mockResolvedValue(undefined)
  mocks.quitAndInstall.mockReset()
  mocks.showMessageBox.mockReset().mockResolvedValue({ response: 1 })
  mocks.on.mockClear()
  mocks.appendFileSync.mockReset()
  mocks.mkdirSync.mockReset()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('DesktopAutoUpdateService', () => {
  it('checks for updates after the startup delay', async () => {
    const { DesktopAutoUpdateService } = await loadService()
    const service = new DesktopAutoUpdateService({
      getWindow: () => null,
      onInstallRequested: vi.fn(),
      onStatusChanged: vi.fn()
    })

    service.start()

    expect(mocks.checkForUpdates).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(15_000)

    expect(mocks.checkForUpdates).toHaveBeenCalledTimes(1)
  })

  it('starts a manual update check immediately', async () => {
    const { DesktopAutoUpdateService } = await loadService()
    const service = new DesktopAutoUpdateService({
      getWindow: () => null,
      onInstallRequested: vi.fn(),
      onStatusChanged: vi.fn()
    })

    service.start()
    await service.checkForUpdates()

    expect(mocks.checkForUpdates).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(15_000)
    expect(mocks.checkForUpdates).toHaveBeenCalledTimes(1)
  })

  it('publishes download progress to the renderer status', async () => {
    const { DesktopAutoUpdateService } = await loadService()
    const onStatusChanged = vi.fn()
    const service = new DesktopAutoUpdateService({
      getWindow: () => null,
      onInstallRequested: vi.fn(),
      onStatusChanged
    })

    service.start()
    emit('update-available', { version: '1.1.2' })
    emit('download-progress', {
      percent: 42.4,
      transferred: 42_400,
      total: 100_000,
      bytesPerSecond: 8_000
    })

    expect(service.getStatus()).toMatchObject({
      currentVersion: '1.1.1',
      availableVersion: '1.1.2',
      phase: 'downloading',
      percent: 42.4,
      transferred: 42_400,
      total: 100_000,
      bytesPerSecond: 8_000
    })
    expect(onStatusChanged).toHaveBeenLastCalledWith(
      expect.objectContaining({
        phase: 'downloading',
        percent: 42.4
      })
    )
  })

  it('requests a safe restart after the update is downloaded and accepted', async () => {
    const { DesktopAutoUpdateService } = await loadService()
    const onInstallRequested = vi.fn()
    mocks.showMessageBox.mockResolvedValueOnce({ response: 0 })

    const service = new DesktopAutoUpdateService({
      getWindow: () => null,
      onInstallRequested,
      onStatusChanged: vi.fn()
    })

    service.start()
    emit('update-downloaded', { version: '1.1.2' })

    await vi.waitFor(() => expect(onInstallRequested).toHaveBeenCalledTimes(1))
    expect(service.getStatus()).toMatchObject({
      phase: 'downloaded',
      availableVersion: '1.1.2',
      percent: 100
    })
  })

  it('reports updater support as unavailable in development builds', async () => {
    mocks.isPackaged = false
    const { DesktopAutoUpdateService } = await loadService()
    const service = new DesktopAutoUpdateService({
      getWindow: () => null,
      onInstallRequested: vi.fn(),
      onStatusChanged: vi.fn()
    })

    service.start()

    expect(service.getStatus().phase).toBe('unsupported')
    expect(mocks.checkForUpdates).not.toHaveBeenCalled()
  })
})
