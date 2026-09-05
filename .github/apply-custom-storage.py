from pathlib import Path


def replace(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    if old not in text:
        raise RuntimeError(f'pattern not found in {path}: {old[:100]!r}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')

# Database uses the selected storage root.
replace(
    'src/main/database/client.ts',
    "import { app } from 'electron'\nimport Database from 'better-sqlite3'",
    "import Database from 'better-sqlite3'"
)
replace(
    'src/main/database/client.ts',
    "import { join } from 'node:path'",
    "import { dirname } from 'node:path'\n\nimport { getDatabaseFilePath } from '../services/storage-location'"
)
replace(
    'src/main/database/client.ts',
    "  const databaseDirectory = join(app.getPath('userData'), 'data')\n\n  mkdirSync(databaseDirectory, {\n    recursive: true\n  })\n\n  initializeDatabaseAtPath(join(databaseDirectory, 'mymind.sqlite'))",
    "  const databasePath = getDatabaseFilePath()\n\n  mkdirSync(dirname(databasePath), {\n    recursive: true\n  })\n\n  initializeDatabaseAtPath(databasePath)"
)

# Study/note/workout assets share the selected root.
replace(
    'src/main/services/study-assets.ts',
    "import { app, dialog, protocol, shell, type BrowserWindow, type OpenDialogOptions } from 'electron'",
    "import { dialog, protocol, shell, type BrowserWindow, type OpenDialogOptions } from 'electron'"
)
replace(
    'src/main/services/study-assets.ts',
    "import { resolveStudyAssetByteRange } from './study-asset-range'",
    "import { resolveStudyAssetByteRange } from './study-asset-range'\nimport { getStudyAttachmentsRoot } from './storage-location'"
)
replace(
    'src/main/services/study-assets.ts',
    "  return studyAssetsRootForTesting ?? join(app.getPath('documents'), 'MyMind', 'Attachments')",
    "  return studyAssetsRootForTesting ?? getStudyAttachmentsRoot()"
)
replace(
    'src/main/services/workout-progress-assets.ts',
    "import { app, type BrowserWindow } from 'electron'",
    "import type { BrowserWindow } from 'electron'"
)
replace(
    'src/main/services/workout-progress-assets.ts',
    "import { persistPreparedStudyAssetImport, selectStudyAssetForImport } from './study-assets'",
    "import { persistPreparedStudyAssetImport, selectStudyAssetForImport } from './study-assets'\nimport { getStudyAttachmentsRoot } from './storage-location'"
)
replace(
    'src/main/services/workout-progress-assets.ts',
    "  return join(app.getPath('documents'), 'MyMind', 'Attachments')",
    "  return getStudyAttachmentsRoot()"
)

# Preload bridge.
replace(
    'src/preload/index.ts',
    "  type OperationFeedback,\n  type SystemHealth,\n  type SystemWindowState",
    "  type OperationFeedback,\n  type StorageChangeResult,\n  type StorageInfo,\n  type SystemHealth,\n  type SystemWindowState"
)
replace(
    'src/preload/index.ts',
    "    getHealth: () => invoke(IPC_CHANNELS.systemHealth) as Promise<SystemHealth>,\n    getWindowState:",
    "    getHealth: () => invoke(IPC_CHANNELS.systemHealth) as Promise<SystemHealth>,\n    getStorageInfo: () => invoke(IPC_CHANNELS.storageGetInfo) as Promise<StorageInfo>,\n    changeStorageLocation: () =>\n      invoke(IPC_CHANNELS.storageChangeLocation) as Promise<StorageChangeResult>,\n    openStorageLocation: () => invoke(IPC_CHANNELS.storageOpenLocation) as Promise<void>,\n    getWindowState:"
)

# IPC delegates storage lifecycle to main startup owner.
replace(
    'src/main/ipc/register-ipc.ts',
    "import { IPC_CHANNELS, type SystemWindowState } from '../../shared/contracts/system'",
    "import {\n  IPC_CHANNELS,\n  type StorageChangeResult,\n  type StorageInfo,\n  type SystemWindowState\n} from '../../shared/contracts/system'"
)
replace(
    'src/main/ipc/register-ipc.ts',
    "  aiChat: {\n    setOpen(input: SetAiChatOpenInput): void",
    "  storage: {\n    getInfo(): StorageInfo\n    changeLocation(window: BrowserWindow): Promise<StorageChangeResult>\n    openLocation(): Promise<void>\n  }\n  aiChat: {\n    setOpen(input: SetAiChatOpenInput): void"
)
replace(
    'src/main/ipc/register-ipc.ts',
    "  ipcMain.removeHandler(IPC_CHANNELS.systemHealth)\n  ipcMain.removeHandler(IPC_CHANNELS.respondToShutdown)",
    "  ipcMain.removeHandler(IPC_CHANNELS.systemHealth)\n  ipcMain.removeHandler(IPC_CHANNELS.storageGetInfo)\n  ipcMain.removeHandler(IPC_CHANNELS.storageChangeLocation)\n  ipcMain.removeHandler(IPC_CHANNELS.storageOpenLocation)\n  ipcMain.removeHandler(IPC_CHANNELS.respondToShutdown)"
)
replace(
    'src/main/ipc/register-ipc.ts',
    "  ipcMain.handle(IPC_CHANNELS.windowGetState, (event) => {",
    "  ipcMain.handle(IPC_CHANNELS.storageGetInfo, (event) => {\n    getTrustedWindow(event, options.getTrustedWebContents)\n    return options.storage.getInfo()\n  })\n\n  ipcMain.handle(IPC_CHANNELS.storageChangeLocation, (event) => {\n    const window = getTrustedWindow(event, options.getTrustedWebContents)\n    return options.storage.changeLocation(window)\n  })\n\n  ipcMain.handle(IPC_CHANNELS.storageOpenLocation, (event) => {\n    getTrustedWindow(event, options.getTrustedWebContents)\n    return options.storage.openLocation()\n  })\n\n  ipcMain.handle(IPC_CHANNELS.windowGetState, (event) => {"
)

# Startup resolves storage before opening SQLite; runtime relocation checkpoints/closes/reopens safely.
replace(
    'src/main/index.ts',
    "import { closeDatabase, initializeDatabase } from './database/client'",
    "import { closeDatabase, getSqlite, initializeDatabase } from './database/client'"
)
replace(
    'src/main/index.ts',
    "import { registerStudyAssetProtocol, registerStudyAssetScheme } from './services/study-assets'",
    "import { registerStudyAssetProtocol, registerStudyAssetScheme } from './services/study-assets'\nimport {\n  chooseStorageLocation,\n  ensureInitialStorageLocation,\n  getStorageInfo,\n  getStorageRoot,\n  moveStorageTo\n} from './services/storage-location'"
)
replace(
    'src/main/index.ts',
    "  void app.whenReady().then(() => {",
    "  void app.whenReady().then(async () => {"
)
replace(
    'src/main/index.ts',
    "    registerStudyAssetProtocol()\n\n    initializeDatabase()",
    "    registerStudyAssetProtocol()\n\n    try {\n      await ensureInitialStorageLocation()\n    } catch (reason: unknown) {\n      const message = reason instanceof Error ? reason.message : String(reason)\n      dialog.showErrorBox('Не удалось открыть хранилище MyMind', message)\n      app.quit()\n      return\n    }\n\n    initializeDatabase()"
)
replace(
    'src/main/index.ts',
    "    registerIpcHandlers({\n      getTrustedWebContents: () => mainWindow?.webContents ?? null,\n      aiChat:",
    "    registerIpcHandlers({\n      getTrustedWebContents: () => mainWindow?.webContents ?? null,\n      storage: {\n        getInfo: getStorageInfo,\n        openLocation: async () => {\n          const error = await shell.openPath(getStorageRoot())\n          if (error) throw new Error(error)\n        },\n        changeLocation: async (window) => {\n          const target = await chooseStorageLocation(window)\n          const current = getStorageInfo()\n          if (!target) return { status: 'cancelled', path: current.path }\n          if (target === current.path) return { status: 'unchanged', path: current.path }\n\n          mainOperationTracker.pauseNewOperations()\n          await mainOperationTracker.whenIdle()\n          calendarReminderScheduler.stop()\n          habitReminderScheduler.stop()\n          getSqlite().pragma('wal_checkpoint(TRUNCATE)')\n          closeDatabase()\n\n          try {\n            const result = await moveStorageTo(target)\n            setTimeout(() => {\n              app.relaunch()\n              app.exit(0)\n            }, 300)\n            return result\n          } catch (reason: unknown) {\n            initializeDatabase()\n            runDatabaseMigrations()\n            calendarReminderScheduler.start()\n            habitReminderScheduler.start()\n            mainOperationTracker.resumeNewOperations()\n            throw reason\n          }\n        }\n      },\n      aiChat:"
)

# Settings overview gets a dedicated storage section.
replace(
    'src/renderer/src/modules/settings/SettingsPage.tsx',
    "import { AppearanceSettingsSection } from './AppearanceSettingsSection'",
    "import { AppearanceSettingsSection } from './AppearanceSettingsSection'\nimport { StorageSettingsSection } from './StorageSettingsSection'"
)
replace(
    'src/renderer/src/modules/settings/SettingsPage.tsx',
    "      </div>\n\n      {error && <SettingsErrorNotice error={error} />}",
    "      </div>\n\n      <StorageSettingsSection />\n\n      {error && <SettingsErrorNotice error={error} />}"
)

# Improve pointer replacement and first-run adoption/target safety in the new service.
replace(
    'src/main/services/storage-location.ts',
    "  const defaultRoot = getDefaultStorageRoot()\n  const chosenRoot = await chooseInitialStorageRoot(defaultRoot)",
    "  const defaultRoot = getDefaultStorageRoot()\n  if (await readStorageMarker(defaultRoot)) {\n    await ensureStorageRootAvailable(defaultRoot)\n    await writeStoragePointer(defaultRoot)\n    selectedStorageRoot = resolve(defaultRoot)\n    return\n  }\n\n  const chosenRoot = await chooseInitialStorageRoot(defaultRoot)"
)
replace(
    'src/main/services/storage-location.ts',
    "async function validateInitialTarget(target: string): Promise<void> {\n  const marker = await readStorageMarker(target)\n  if (marker) {\n    return\n  }\n\n  const databasePath",
    "async function validateInitialTarget(target: string): Promise<void> {\n  const marker = await readStorageMarker(target)\n  if (marker) return\n\n  if (!samePath(target, getDefaultStorageRoot())) {\n    for (const directory of MANAGED_DIRECTORIES) {\n      if (await pathExists(join(target, directory))) {\n        throw new Error(`В выбранной папке уже существует каталог «${directory}». Выберите другую папку.`)\n      }\n    }\n  }\n\n  const databasePath"
)
replace(
    'src/main/services/storage-location.ts',
    "  await writeFile(temporaryPath, `${JSON.stringify(payload, null, 2)}\\n`, 'utf8')\n  await rename(temporaryPath, path)",
    "  await writeFile(temporaryPath, `${JSON.stringify(payload, null, 2)}\\n`, 'utf8')\n\n  const backupPath = `${path}.bak`\n  const hadPrevious = await pathExists(path)\n  if (hadPrevious) await rename(path, backupPath)\n\n  try {\n    await rename(temporaryPath, path)\n    await rm(backupPath, { force: true })\n  } catch (reason: unknown) {\n    if (hadPrevious && (await pathExists(backupPath))) {\n      await rename(backupPath, path).catch(() => undefined)\n    }\n    throw reason\n  }"
)
