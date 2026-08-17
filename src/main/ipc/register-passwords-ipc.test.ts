import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PASSWORDS_IPC_CHANNELS } from '../../shared/contracts/passwords'

const mocks = vi.hoisted(() => ({
  handle: vi.fn(),
  removeHandler: vi.fn(),
  openExternal: vi.fn(),
  copyPasswordValue: vi.fn(),
  clearTrackedPasswordClipboard: vi.fn(),
  run: vi.fn((operation: () => unknown) => operation()),
  getPasswordItem: vi.fn()
}))

vi.mock('electron', () => ({
  ipcMain: { handle: mocks.handle, removeHandler: mocks.removeHandler },
  shell: { openExternal: mocks.openExternal }
}))
vi.mock('../services/main-operation-tracker', () => ({ mainOperationTracker: { run: mocks.run } }))
vi.mock('../services/password-clipboard', () => ({
  copyPasswordValue: mocks.copyPasswordValue,
  clearTrackedPasswordClipboard: mocks.clearTrackedPasswordClipboard
}))
vi.mock('../repositories/passwords.repository', () => ({
  getPasswordVaultStatus: vi.fn(),
  setupPasswordVault: vi.fn(),
  unlockPasswordVault: vi.fn(),
  lockPasswordVault: vi.fn(),
  changeMasterPassword: vi.fn(),
  listPasswordsOverview: vi.fn(),
  getPasswordItem: mocks.getPasswordItem,
  createPasswordGroup: vi.fn(),
  updatePasswordGroup: vi.fn(),
  deletePasswordGroup: vi.fn(),
  createPasswordItem: vi.fn(),
  updatePasswordItem: vi.fn(),
  deletePasswordItem: vi.fn(),
  generatePassword: vi.fn()
}))

import { registerPasswordsIpcHandlers } from './register-passwords-ipc'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('registerPasswordsIpcHandlers', () => {
  it('registers every password vault channel', () => {
    registerPasswordsIpcHandlers()
    expect(mocks.removeHandler.mock.calls.map(([channel]) => channel)).toEqual(
      Object.values(PASSWORDS_IPC_CHANNELS)
    )
    expect(mocks.handle.mock.calls.map(([channel]) => channel)).toEqual(
      Object.values(PASSWORDS_IPC_CHANNELS)
    )
  })

  it('validates the master password before setting up a vault', async () => {
    registerPasswordsIpcHandlers()
    const handler = mocks.handle.mock.calls.find(
      ([channel]) => channel === PASSWORDS_IPC_CHANNELS.setupVault
    )?.[1]

    await expect(handler({}, { masterPassword: 'short' })).rejects.toThrow('минимум 12 символов')
  })

  it('copies a decrypted password without sending the secret through the clipboard API input', async () => {
    mocks.getPasswordItem.mockReturnValue({ password: 'secret-123', username: 'user@example.com' })
    registerPasswordsIpcHandlers()
    const handler = mocks.handle.mock.calls.find(
      ([channel]) => channel === PASSWORDS_IPC_CHANNELS.copyItemField
    )?.[1]

    const id = '0b8c2031-348f-4faf-9c99-a8f387e80341'
    await expect(handler({}, { id, field: 'password' })).resolves.toBe(true)
    expect(mocks.getPasswordItem).toHaveBeenCalledWith(id)
    expect(mocks.copyPasswordValue).toHaveBeenCalledWith('secret-123')
  })
})
