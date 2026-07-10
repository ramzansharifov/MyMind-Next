import type { StudyApi } from './study'

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
}
