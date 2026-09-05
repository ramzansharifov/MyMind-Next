import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const electronMocks = vi.hoisted(() => ({
  paths: {
    userData: '',
    documents: ''
  },
  showMessageBox: vi.fn(),
  showOpenDialog: vi.fn()
}))

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn((name: string) => {
      if (name === 'userData') return electronMocks.paths.userData
      if (name === 'documents') return electronMocks.paths.documents
      throw new Error(`Unexpected Electron path: ${name}`)
    })
  },
  dialog: {
    showMessageBox: electronMocks.showMessageBox,
    showOpenDialog: electronMocks.showOpenDialog
  }
}))

let root = ''
let userData = ''
let documents = ''
let defaultStorage = ''
let customStorage = ''

beforeEach(async () => {
  vi.resetModules()
  vi.clearAllMocks()

  root = await mkdtemp(join(tmpdir(), 'mymind-storage-location-'))
  userData = join(root, 'user-data')
  documents = join(root, 'documents')
  defaultStorage = join(documents, 'MyMind')
  customStorage = join(root, 'custom-storage')

  electronMocks.paths.userData = userData
  electronMocks.paths.documents = documents
  electronMocks.showMessageBox.mockResolvedValue({ response: 0 })
  electronMocks.showOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] })

  await mkdir(userData, { recursive: true })
  await mkdir(documents, { recursive: true })
})

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
})

async function loadStorageService() {
  return import('./storage-location')
}

async function createLegacyData(): Promise<void> {
  await mkdir(join(userData, 'data'), { recursive: true })
  await writeFile(join(userData, 'data', 'mymind.sqlite'), 'legacy-database')

  await mkdir(join(defaultStorage, 'Attachments'), { recursive: true })
  await writeFile(join(defaultStorage, 'Attachments', 'legacy-photo.jpg'), 'legacy-photo')
}

async function writeStorageMarker(storageRoot: string): Promise<void> {
  await mkdir(storageRoot, { recursive: true })
  await writeFile(
    join(storageRoot, '.mymind-storage.json'),
    `${JSON.stringify({ version: 1, appId: 'com.mymind.desktop' }, null, 2)}\n`
  )
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

describe('storage location lifecycle', () => {
  it('migrates the legacy database into the default root and preserves existing attachments', async () => {
    await createLegacyData()
    const storage = await loadStorageService()

    await storage.ensureInitialStorageLocation()

    expect(storage.getStorageRoot()).toBe(resolve(defaultStorage))
    expect(await readFile(join(defaultStorage, 'data', 'mymind.sqlite'), 'utf8')).toBe(
      'legacy-database'
    )
    expect(await readFile(join(defaultStorage, 'Attachments', 'legacy-photo.jpg'), 'utf8')).toBe(
      'legacy-photo'
    )
    expect(await pathExists(join(userData, 'data'))).toBe(false)

    const pointer = JSON.parse(await readFile(join(userData, 'storage-location.json'), 'utf8')) as {
      storageRoot: string
    }
    expect(pointer.storageRoot).toBe(resolve(defaultStorage))
  })

  it('copies legacy data to a custom first-launch root before removing the old copies', async () => {
    await createLegacyData()
    electronMocks.showMessageBox.mockResolvedValue({ response: 1 })
    electronMocks.showOpenDialog.mockResolvedValue({
      canceled: false,
      filePaths: [customStorage]
    })
    const storage = await loadStorageService()

    await storage.ensureInitialStorageLocation()

    expect(storage.getStorageRoot()).toBe(resolve(customStorage))
    expect(await readFile(join(customStorage, 'data', 'mymind.sqlite'), 'utf8')).toBe(
      'legacy-database'
    )
    expect(await readFile(join(customStorage, 'Attachments', 'legacy-photo.jpg'), 'utf8')).toBe(
      'legacy-photo'
    )
    expect(await pathExists(join(userData, 'data'))).toBe(false)
    expect(await pathExists(join(defaultStorage, 'Attachments'))).toBe(false)

    const pointer = JSON.parse(await readFile(join(userData, 'storage-location.json'), 'utf8')) as {
      storageRoot: string
    }
    expect(pointer.storageRoot).toBe(resolve(customStorage))
  })

  it('keeps the legacy source intact when the new storage pointer cannot be committed', async () => {
    await mkdir(join(defaultStorage, 'Attachments'), { recursive: true })
    await writeFile(join(defaultStorage, 'Attachments', 'important.jpg'), 'important')

    const blockedUserData = join(root, 'blocked-user-data')
    await writeFile(blockedUserData, 'not-a-directory')
    electronMocks.paths.userData = blockedUserData
    electronMocks.showMessageBox.mockResolvedValue({ response: 1 })
    electronMocks.showOpenDialog.mockResolvedValue({
      canceled: false,
      filePaths: [customStorage]
    })
    const storage = await loadStorageService()

    await expect(storage.ensureInitialStorageLocation()).rejects.toThrow()

    expect(await readFile(join(defaultStorage, 'Attachments', 'important.jpg'), 'utf8')).toBe(
      'important'
    )
    expect(await readFile(join(customStorage, 'Attachments', 'important.jpg'), 'utf8')).toBe(
      'important'
    )
  })

  it('can reconnect an existing marked custom storage when the pointer was lost', async () => {
    await writeStorageMarker(customStorage)
    await mkdir(join(customStorage, 'data'), { recursive: true })
    await writeFile(join(customStorage, 'data', 'mymind.sqlite'), 'existing-database')
    electronMocks.showMessageBox.mockResolvedValue({ response: 1 })
    electronMocks.showOpenDialog.mockResolvedValue({
      canceled: false,
      filePaths: [customStorage]
    })
    const storage = await loadStorageService()

    await storage.ensureInitialStorageLocation()

    expect(storage.getStorageRoot()).toBe(resolve(customStorage))
    expect(await readFile(join(customStorage, 'data', 'mymind.sqlite'), 'utf8')).toBe(
      'existing-database'
    )
    const pointer = JSON.parse(await readFile(join(userData, 'storage-location.json'), 'utf8')) as {
      storageRoot: string
    }
    expect(pointer.storageRoot).toBe(resolve(customStorage))
  })

  it('does not silently recreate a configured storage root that has disappeared', async () => {
    const missingStorage = join(root, 'missing-storage')
    await writeFile(
      join(userData, 'storage-location.json'),
      `${JSON.stringify({ version: 1, storageRoot: missingStorage }, null, 2)}\n`
    )
    const storage = await loadStorageService()

    await expect(storage.ensureInitialStorageLocation()).rejects.toThrow(
      /Папка данных MyMind недоступна/
    )
    expect(await pathExists(missingStorage)).toBe(false)
  })

  it('moves an initialized storage atomically and rejects nested destinations', async () => {
    await createLegacyData()
    const storage = await loadStorageService()
    await storage.ensureInitialStorageLocation()

    const result = await storage.moveStorageTo(customStorage)

    expect(result).toEqual({
      status: 'moved',
      path: resolve(customStorage),
      relaunching: true
    })
    expect(storage.getStorageRoot()).toBe(resolve(customStorage))
    expect(await readFile(join(customStorage, 'data', 'mymind.sqlite'), 'utf8')).toBe(
      'legacy-database'
    )
    expect(await readFile(join(customStorage, 'Attachments', 'legacy-photo.jpg'), 'utf8')).toBe(
      'legacy-photo'
    )
    expect(await pathExists(join(defaultStorage, 'data'))).toBe(false)
    expect(await pathExists(join(defaultStorage, 'Attachments'))).toBe(false)

    await expect(storage.moveStorageTo(join(customStorage, 'nested'))).rejects.toThrow(
      /не может находиться внутри текущего хранилища/
    )
  })
})
