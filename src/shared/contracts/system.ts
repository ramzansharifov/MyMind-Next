import type { StudyApi } from './study'
import type { PreferencesApi } from './preferences'

export const IPC_CHANNELS = {
  systemHealth: 'system:health'
} as const

export interface SystemHealth {
  database: 'ready'
  sqliteVersion: string
}

export interface MyMindApi {
  system: {
    getHealth(): Promise<SystemHealth>
  }

  study: StudyApi
  preferences: PreferencesApi
}
