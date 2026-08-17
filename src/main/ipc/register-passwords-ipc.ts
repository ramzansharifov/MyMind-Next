import { ipcMain, shell } from 'electron'

import { PASSWORDS_IPC_CHANNELS } from '../../shared/contracts/passwords'
import {
  changeMasterPasswordInputSchema,
  copyPasswordItemFieldInputSchema,
  createPasswordGroupInputSchema,
  createPasswordItemInputSchema,
  deletePasswordGroupInputSchema,
  deletePasswordItemInputSchema,
  generatePasswordInputSchema,
  getPasswordItemInputSchema,
  openPasswordItemWebsiteInputSchema,
  setupPasswordVaultInputSchema,
  unlockPasswordVaultInputSchema,
  updatePasswordGroupInputSchema,
  updatePasswordItemInputSchema
} from '../../shared/validation/passwords'
import {
  changeMasterPassword,
  createPasswordGroup,
  createPasswordItem,
  deletePasswordGroup,
  deletePasswordItem,
  generatePassword,
  getPasswordItem,
  getPasswordVaultStatus,
  listPasswordsOverview,
  lockPasswordVault,
  setupPasswordVault,
  unlockPasswordVault,
  updatePasswordGroup,
  updatePasswordItem
} from '../repositories/passwords.repository'
import { clearTrackedPasswordClipboard, copyPasswordValue } from '../services/password-clipboard'
import { mainOperationTracker } from '../services/main-operation-tracker'

function safeWebsite(value: string): string {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error('Некорректный адрес сайта')
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('Можно открывать только HTTP/HTTPS-адреса')
  }
  return url.toString()
}

export function registerPasswordsIpcHandlers(): void {
  Object.values(PASSWORDS_IPC_CHANNELS).forEach((channel) => ipcMain.removeHandler(channel))

  ipcMain.handle(PASSWORDS_IPC_CHANNELS.getVaultStatus, () =>
    mainOperationTracker.run(() => getPasswordVaultStatus())
  )
  ipcMain.handle(PASSWORDS_IPC_CHANNELS.setupVault, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => setupPasswordVault(setupPasswordVaultInputSchema.parse(rawInput)))
  )
  ipcMain.handle(PASSWORDS_IPC_CHANNELS.unlockVault, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => unlockPasswordVault(unlockPasswordVaultInputSchema.parse(rawInput)))
  )
  ipcMain.handle(PASSWORDS_IPC_CHANNELS.lockVault, () =>
    mainOperationTracker.run(() => {
      clearTrackedPasswordClipboard()
      return lockPasswordVault()
    })
  )
  ipcMain.handle(PASSWORDS_IPC_CHANNELS.changeMasterPassword, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() =>
      changeMasterPassword(changeMasterPasswordInputSchema.parse(rawInput))
    )
  )
  ipcMain.handle(PASSWORDS_IPC_CHANNELS.listOverview, () =>
    mainOperationTracker.run(() => listPasswordsOverview())
  )
  ipcMain.handle(PASSWORDS_IPC_CHANNELS.getItem, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => {
      const input = getPasswordItemInputSchema.parse(rawInput)
      return getPasswordItem(input.id)
    })
  )
  ipcMain.handle(PASSWORDS_IPC_CHANNELS.createGroup, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => createPasswordGroup(createPasswordGroupInputSchema.parse(rawInput)))
  )
  ipcMain.handle(PASSWORDS_IPC_CHANNELS.updateGroup, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => updatePasswordGroup(updatePasswordGroupInputSchema.parse(rawInput)))
  )
  ipcMain.handle(PASSWORDS_IPC_CHANNELS.deleteGroup, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => deletePasswordGroup(deletePasswordGroupInputSchema.parse(rawInput)))
  )
  ipcMain.handle(PASSWORDS_IPC_CHANNELS.createItem, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => createPasswordItem(createPasswordItemInputSchema.parse(rawInput)))
  )
  ipcMain.handle(PASSWORDS_IPC_CHANNELS.updateItem, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => updatePasswordItem(updatePasswordItemInputSchema.parse(rawInput)))
  )
  ipcMain.handle(PASSWORDS_IPC_CHANNELS.deleteItem, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => deletePasswordItem(deletePasswordItemInputSchema.parse(rawInput)))
  )
  ipcMain.handle(PASSWORDS_IPC_CHANNELS.generatePassword, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => generatePassword(generatePasswordInputSchema.parse(rawInput)))
  )
  ipcMain.handle(PASSWORDS_IPC_CHANNELS.copyItemField, (_event, rawInput: unknown) =>
    mainOperationTracker.run(() => {
      const input = copyPasswordItemFieldInputSchema.parse(rawInput)
      const item = getPasswordItem(input.id)
      const value = input.field === 'password' ? item.password : item.username
      if (!value) throw new Error(input.field === 'username' ? 'Логин не указан' : 'Пароль не указан')
      copyPasswordValue(value)
      return true
    })
  )
  ipcMain.handle(PASSWORDS_IPC_CHANNELS.openWebsite, (_event, rawInput: unknown) =>
    mainOperationTracker.run(async () => {
      const input = openPasswordItemWebsiteInputSchema.parse(rawInput)
      const item = getPasswordItem(input.id)
      if (!item.website) throw new Error('Адрес сайта не указан')
      await shell.openExternal(safeWebsite(item.website))
      return true
    })
  )
}
