import { BrowserWindow, ipcMain, type IpcMainInvokeEvent, type WebContents } from 'electron'
import type {
  CreateLocalProfileInput,
  ProfileGender,
  ReplaceProfileCredentialsInput,
  UpdateLocalProfileInput
} from '@mymind/contracts/profile-sync'

import { PROFILE_SYNC_IPC_CHANNELS } from '../../shared/contracts/profile-sync'
import {
  createLocalProfile,
  getLocalProfile,
  removeLocalProfile,
  replaceLocalProfileCredentials,
  updateLocalProfile
} from '../services/local-profile'
import type { LanSyncServer } from '../services/lan-sync-server'
import { mainOperationTracker } from '../services/main-operation-tracker'

interface RegisterProfileSyncIpcOptions {
  getTrustedWebContents(): WebContents | null
  server: LanSyncServer
}

function assertTrustedSender(
  event: IpcMainInvokeEvent,
  getTrustedWebContents: () => WebContents | null
): void {
  const trusted = getTrustedWebContents()
  if (
    trusted === null ||
    event.sender !== trusted ||
    event.senderFrame === null ||
    event.senderFrame !== event.sender.mainFrame
  ) {
    throw new Error('Untrusted profile sync request')
  }
  const window = BrowserWindow.fromWebContents(event.sender)
  if (!window || window.isDestroyed()) throw new Error('Window is unavailable')
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Некорректные данные профиля')
  }
  return value as Record<string, unknown>
}

function optionalString(value: unknown, label: string): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value !== 'string') throw new Error(`Некорректное поле «${label}»`)
  return value
}

function gender(value: unknown): ProfileGender | undefined {
  if (value === undefined) return undefined
  if (value === null || value === 'male' || value === 'female') return value
  throw new Error('Некорректно указан пол')
}

function parseCreateProfile(value: unknown): CreateLocalProfileInput {
  const input = record(value)
  if (typeof input.login !== 'string' || typeof input.password !== 'string') {
    throw new Error('Для профиля нужны логин и пароль')
  }
  return {
    login: input.login,
    password: input.password,
    name: optionalString(input.name, 'имя'),
    gender: gender(input.gender)
  }
}

function parseUpdateProfile(value: unknown): UpdateLocalProfileInput {
  const input = record(value)
  return {
    name: optionalString(input.name, 'имя'),
    gender: gender(input.gender)
  }
}

function parseReplaceCredentials(value: unknown): ReplaceProfileCredentialsInput {
  const input = record(value)
  if (typeof input.login !== 'string' || typeof input.password !== 'string') {
    throw new Error('Для профиля нужны логин и пароль')
  }
  return { login: input.login, password: input.password }
}

export function registerProfileSyncIpcHandlers(options: RegisterProfileSyncIpcOptions): void {
  for (const channel of [
    PROFILE_SYNC_IPC_CHANNELS.getProfile,
    PROFILE_SYNC_IPC_CHANNELS.createProfile,
    PROFILE_SYNC_IPC_CHANNELS.updateProfile,
    PROFILE_SYNC_IPC_CHANNELS.replaceCredentials,
    PROFILE_SYNC_IPC_CHANNELS.removeProfile,
    PROFILE_SYNC_IPC_CHANNELS.getLanStatus
  ]) {
    ipcMain.removeHandler(channel)
  }

  ipcMain.handle(PROFILE_SYNC_IPC_CHANNELS.getProfile, (event) => {
    assertTrustedSender(event, options.getTrustedWebContents)
    return mainOperationTracker.run(() => getLocalProfile())
  })

  ipcMain.handle(PROFILE_SYNC_IPC_CHANNELS.createProfile, (event, rawInput: unknown) => {
    assertTrustedSender(event, options.getTrustedWebContents)
    return mainOperationTracker.run(async () => {
      const profile = await createLocalProfile(parseCreateProfile(rawInput))
      await options.server.invalidateAuthorization()
      return profile
    })
  })

  ipcMain.handle(PROFILE_SYNC_IPC_CHANNELS.updateProfile, (event, rawInput: unknown) => {
    assertTrustedSender(event, options.getTrustedWebContents)
    return mainOperationTracker.run(() => updateLocalProfile(parseUpdateProfile(rawInput)))
  })

  ipcMain.handle(PROFILE_SYNC_IPC_CHANNELS.replaceCredentials, (event, rawInput: unknown) => {
    assertTrustedSender(event, options.getTrustedWebContents)
    return mainOperationTracker.run(async () => {
      const profile = await replaceLocalProfileCredentials(parseReplaceCredentials(rawInput))
      await options.server.invalidateAuthorization()
      return profile
    })
  })

  ipcMain.handle(PROFILE_SYNC_IPC_CHANNELS.removeProfile, (event) => {
    assertTrustedSender(event, options.getTrustedWebContents)
    return mainOperationTracker.run(async () => {
      const removed = await removeLocalProfile()
      await options.server.invalidateAuthorization()
      return removed
    })
  })

  ipcMain.handle(PROFILE_SYNC_IPC_CHANNELS.getLanStatus, (event) => {
    assertTrustedSender(event, options.getTrustedWebContents)
    return options.server.getStatus()
  })
}
