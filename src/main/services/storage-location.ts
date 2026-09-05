import {
  app,
  dialog,
  type BrowserWindow,
  type MessageBoxOptions,
  type OpenDialogOptions
} from 'electron'
import { randomUUID } from 'node:crypto'
import { access, cp, mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { constants } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'

import type { StorageChangeResult, StorageInfo } from '../../shared/contracts/system'

const STORAGE_CONFIG_VERSION = 1
const STORAGE_POINTER_FILE = 'storage-location.json'
const STORAGE_MARKER_FILE = '.mymind-storage.json'
const MANAGED_DIRECTORIES = ['data', 'Attachments'] as const

interface StoragePointer {
  version: number
  storageRoot: string
}

interface StorageMarker {
  version: number
  appId: 'com.mymind.desktop'
}

let selectedStorageRoot: string | null = null

export function getDefaultStorageRoot(): string {
  return join(app.getPath('documents'), 'MyMind')
}

export function getStorageRoot(): string {
  if (!selectedStorageRoot) {
    throw new Error('MyMind storage has not been initialized')
  }

  return selectedStorageRoot
}

export function getDatabaseFilePath(): string {
  return join(getStorageRoot(), 'data', 'mymind.sqlite')
}

export function getStudyAttachmentsRoot(): string {
  return join(getStorageRoot(), 'Attachments')
}

export function getStorageInfo(): StorageInfo {
  const path = getStorageRoot()
  const defaultPath = getDefaultStorageRoot()

  return {
    path,
    defaultPath,
    isDefault: samePath(path, defaultPath)
  }
}

export async function ensureInitialStorageLocation(): Promise<void> {
  const configuredRoot = await readConfiguredStorageRoot()

  if (configuredRoot) {
    await ensureConfiguredStorageRootAvailable(configuredRoot)
    selectedStorageRoot = configuredRoot
    return
  }

  const defaultRoot = getDefaultStorageRoot()
  if (await readStorageMarker(defaultRoot)) {
    await ensureExistingWritableDirectory(defaultRoot)
    await writeStoragePointer(defaultRoot)
    selectedStorageRoot = resolve(defaultRoot)
    return
  }

  const chosenRoot = resolve(await chooseInitialStorageRoot(defaultRoot))

  if (await readStorageMarker(chosenRoot)) {
    await ensureExistingWritableDirectory(chosenRoot)
    await writeStoragePointer(chosenRoot)
    selectedStorageRoot = chosenRoot
    return
  }

  await prepareInitialStorage(chosenRoot)
  await writeStoragePointer(chosenRoot)
  selectedStorageRoot = chosenRoot
  await cleanupLegacyStorage(chosenRoot)
}

export async function chooseStorageLocation(
  parentWindow: BrowserWindow | null
): Promise<string | null> {
  const options: OpenDialogOptions = {
    title: 'Выберите папку для данных MyMind',
    buttonLabel: 'Выбрать папку',
    defaultPath: getStorageRoot(),
    properties: ['openDirectory', 'createDirectory']
  }

  const result = parentWindow
    ? await dialog.showOpenDialog(parentWindow, options)
    : await dialog.showOpenDialog(options)

  if (result.canceled || result.filePaths.length === 0) {
    return null
  }

  return resolve(result.filePaths[0])
}

export async function moveStorageTo(targetRoot: string): Promise<StorageChangeResult> {
  const sourceRoot = getStorageRoot()
  const target = resolve(targetRoot)

  if (samePath(sourceRoot, target)) {
    return {
      status: 'unchanged',
      path: sourceRoot
    }
  }

  assertIndependentRoots(sourceRoot, target)
  await validateStorageTarget(target)
  await ensureWritableDirectory(target)

  const stageRoot = join(target, `.mymind-migration-${randomUUID()}`)
  await mkdir(stageRoot, { recursive: true })

  try {
    for (const directory of MANAGED_DIRECTORIES) {
      const source = join(sourceRoot, directory)
      if (await pathExists(source)) {
        await cp(source, join(stageRoot, directory), {
          recursive: true,
          errorOnExist: true,
          force: false
        })
      }
    }

    await verifyMigratedDatabase(sourceRoot, stageRoot)

    for (const directory of MANAGED_DIRECTORIES) {
      const staged = join(stageRoot, directory)
      if (await pathExists(staged)) {
        await rename(staged, join(target, directory))
      }
    }

    await writeStorageMarker(target)
    await writeStoragePointer(target)
    selectedStorageRoot = target
  } catch (reason: unknown) {
    await removeManagedStorage(target).catch(() => undefined)
    throw reason
  } finally {
    await rm(stageRoot, { recursive: true, force: true }).catch(() => undefined)
  }

  await removeManagedStorage(sourceRoot).catch((reason: unknown) => {
    console.warn('MyMind data was moved, but the old storage could not be fully cleaned up', reason)
  })

  return {
    status: 'moved',
    path: target,
    relaunching: true
  }
}

async function chooseInitialStorageRoot(defaultRoot: string): Promise<string> {
  const options: MessageBoxOptions = {
    type: 'question',
    title: 'Хранилище MyMind',
    message: 'Где хранить данные MyMind?',
    detail: `По умолчанию все локальные данные будут храниться здесь:\n${defaultRoot}\n\nВы сможете изменить эту папку позже в настройках.`,
    buttons: ['Использовать эту папку', 'Выбрать другую…'],
    defaultId: 0,
    cancelId: 0,
    noLink: true
  }

  const choice = await dialog.showMessageBox(options)
  if (choice.response !== 1) {
    return resolve(defaultRoot)
  }

  const result = await dialog.showOpenDialog({
    title: 'Выберите папку для данных MyMind',
    buttonLabel: 'Выбрать папку',
    defaultPath: defaultRoot,
    properties: ['openDirectory', 'createDirectory']
  })

  if (result.canceled || result.filePaths.length === 0) {
    return resolve(defaultRoot)
  }

  return resolve(result.filePaths[0])
}

async function prepareInitialStorage(targetRoot: string): Promise<void> {
  const target = resolve(targetRoot)
  await ensureWritableDirectory(target)
  await validateInitialTarget(target)

  const legacyData = join(app.getPath('userData'), 'data')
  const legacyAttachments = join(getDefaultStorageRoot(), 'Attachments')

  if (!samePath(legacyData, join(target, 'data')) && (await pathExists(legacyData))) {
    await cp(legacyData, join(target, 'data'), {
      recursive: true,
      errorOnExist: true,
      force: false
    })
  }

  if (
    !samePath(legacyAttachments, join(target, 'Attachments')) &&
    (await pathExists(legacyAttachments))
  ) {
    await cp(legacyAttachments, join(target, 'Attachments'), {
      recursive: true,
      errorOnExist: true,
      force: false
    })
  }

  await mkdir(join(target, 'data'), { recursive: true })
  await mkdir(join(target, 'Attachments'), { recursive: true })
  await writeStorageMarker(target)
}

async function cleanupLegacyStorage(targetRoot: string): Promise<void> {
  const target = resolve(targetRoot)
  const legacyData = join(app.getPath('userData'), 'data')
  const legacyAttachments = join(getDefaultStorageRoot(), 'Attachments')

  if (!samePath(legacyData, join(target, 'data'))) {
    await rm(legacyData, { recursive: true, force: true }).catch((reason: unknown) => {
      console.warn(
        'MyMind storage initialized, but legacy database files could not be removed',
        reason
      )
    })
  }

  if (!samePath(legacyAttachments, join(target, 'Attachments'))) {
    await rm(legacyAttachments, { recursive: true, force: true }).catch((reason: unknown) => {
      console.warn(
        'MyMind storage initialized, but legacy attachments could not be removed',
        reason
      )
    })
  }
}

async function readConfiguredStorageRoot(): Promise<string | null> {
  const pointerPath = getStoragePointerPath()

  try {
    const raw = await readFile(pointerPath, 'utf8')
    const parsed = JSON.parse(raw) as Partial<StoragePointer>

    if (
      parsed.version !== STORAGE_CONFIG_VERSION ||
      typeof parsed.storageRoot !== 'string' ||
      !isAbsolute(parsed.storageRoot)
    ) {
      return null
    }

    return resolve(parsed.storageRoot)
  } catch {
    return null
  }
}

async function ensureConfiguredStorageRootAvailable(root: string): Promise<void> {
  try {
    const info = await stat(root)
    if (!info.isDirectory()) {
      throw new Error('путь не является папкой')
    }

    await ensureExistingWritableDirectory(root)

    if (await readStorageMarker(root)) {
      return
    }

    const hasKnownData =
      (await pathExists(join(root, 'data', 'mymind.sqlite'))) ||
      (await pathExists(join(root, 'Attachments')))

    if (!hasKnownData) {
      throw new Error('служебный маркер и данные MyMind отсутствуют')
    }

    await writeStorageMarker(root)
  } catch (reason: unknown) {
    const message = reason instanceof Error ? reason.message : String(reason)
    throw new Error(`Папка данных MyMind недоступна: ${root}\n${message}`)
  }
}

async function ensureExistingWritableDirectory(directory: string): Promise<void> {
  await access(directory, constants.W_OK)

  const probe = join(directory, `.mymind-write-test-${randomUUID()}`)
  await writeFile(probe, 'ok', { flag: 'wx' })
  await rm(probe, { force: true })
}

async function validateInitialTarget(target: string): Promise<void> {
  const marker = await readStorageMarker(target)
  if (marker) return

  if (!samePath(target, getDefaultStorageRoot())) {
    for (const directory of MANAGED_DIRECTORIES) {
      if (await pathExists(join(target, directory))) {
        throw new Error(
          `В выбранной папке уже существует каталог «${directory}». Выберите другую папку.`
        )
      }
    }
  }

  const databasePath = join(target, 'data', 'mymind.sqlite')
  if (await pathExists(databasePath)) {
    throw new Error(
      'В выбранной папке уже находится база MyMind без служебного маркера. Выберите другую папку, чтобы не перезаписать данные.'
    )
  }
}

async function validateStorageTarget(target: string): Promise<void> {
  const marker = await readStorageMarker(target)
  if (marker) {
    throw new Error('В выбранной папке уже находится другое хранилище MyMind')
  }

  for (const directory of MANAGED_DIRECTORIES) {
    if (await pathExists(join(target, directory))) {
      throw new Error(
        `В выбранной папке уже существует каталог «${directory}». Выберите пустую папку или другую директорию.`
      )
    }
  }
}

async function verifyMigratedDatabase(sourceRoot: string, stageRoot: string): Promise<void> {
  const sourceDatabase = join(sourceRoot, 'data', 'mymind.sqlite')
  if (!(await pathExists(sourceDatabase))) {
    return
  }

  const migratedDatabase = join(stageRoot, 'data', 'mymind.sqlite')
  const migratedStats = await stat(migratedDatabase).catch(() => null)

  if (!migratedStats?.isFile() || migratedStats.size <= 0) {
    throw new Error('Не удалось проверить перенесённую базу данных MyMind')
  }
}

async function ensureWritableDirectory(directory: string): Promise<void> {
  await mkdir(directory, { recursive: true })
  await ensureExistingWritableDirectory(directory)
}

async function writeStoragePointer(storageRoot: string): Promise<void> {
  const path = getStoragePointerPath()
  await mkdir(dirname(path), { recursive: true })

  const temporaryPath = `${path}.${randomUUID()}.tmp`
  const payload: StoragePointer = {
    version: STORAGE_CONFIG_VERSION,
    storageRoot: resolve(storageRoot)
  }

  await writeFile(temporaryPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')

  const backupPath = `${path}.bak`
  const hadPrevious = await pathExists(path)
  if (hadPrevious) await rename(path, backupPath)

  try {
    await rename(temporaryPath, path)
    await rm(backupPath, { force: true })
  } catch (reason: unknown) {
    if (hadPrevious && (await pathExists(backupPath))) {
      await rename(backupPath, path).catch(() => undefined)
    }
    throw reason
  }
}

async function writeStorageMarker(root: string): Promise<void> {
  await mkdir(root, { recursive: true })

  const marker: StorageMarker = {
    version: STORAGE_CONFIG_VERSION,
    appId: 'com.mymind.desktop'
  }

  await writeFile(join(root, STORAGE_MARKER_FILE), `${JSON.stringify(marker, null, 2)}\n`, 'utf8')
}

async function readStorageMarker(root: string): Promise<StorageMarker | null> {
  try {
    const raw = await readFile(join(root, STORAGE_MARKER_FILE), 'utf8')
    const parsed = JSON.parse(raw) as Partial<StorageMarker>

    return parsed.version === STORAGE_CONFIG_VERSION && parsed.appId === 'com.mymind.desktop'
      ? (parsed as StorageMarker)
      : null
  } catch {
    return null
  }
}

async function removeManagedStorage(root: string): Promise<void> {
  for (const directory of MANAGED_DIRECTORIES) {
    await rm(join(root, directory), { recursive: true, force: true })
  }
  await rm(join(root, STORAGE_MARKER_FILE), { force: true })
}

function assertIndependentRoots(sourceRoot: string, targetRoot: string): void {
  const source = resolve(sourceRoot)
  const target = resolve(targetRoot)
  const fromSource = relative(source, target)
  const fromTarget = relative(target, source)

  const targetInsideSource =
    fromSource !== '' && !fromSource.startsWith('..') && !isAbsolute(fromSource)
  const sourceInsideTarget =
    fromTarget !== '' && !fromTarget.startsWith('..') && !isAbsolute(fromTarget)

  if (targetInsideSource || sourceInsideTarget) {
    throw new Error(
      'Новая папка данных не может находиться внутри текущего хранилища или содержать его'
    )
  }
}

function getStoragePointerPath(): string {
  return join(app.getPath('userData'), STORAGE_POINTER_FILE)
}

function samePath(left: string, right: string): boolean {
  const normalizedLeft = resolve(left)
  const normalizedRight = resolve(right)

  return process.platform === 'win32'
    ? normalizedLeft.toLowerCase() === normalizedRight.toLowerCase()
    : normalizedLeft === normalizedRight
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}
