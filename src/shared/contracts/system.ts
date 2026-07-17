import type { BoardApi } from './boards'
import type { PreferencesApi } from './preferences'
import type { StudyApi } from './study'

export const IPC_CHANNELS = {
  systemHealth: 'system:health',
  shutdownRequested: 'system:shutdown-requested',
  respondToShutdown: 'system:respond-to-shutdown'
} as const

export interface SystemHealth {
  database: 'ready'
  sqliteVersion: string
}

export interface ShutdownRequest {
  requestId: string
}

export interface ShutdownResponse extends ShutdownRequest {
  decision: 'success' | 'failed' | 'cancel' | 'force'
}

export interface MyMindApi {
  system: {
    getHealth(): Promise<SystemHealth>
    onShutdownRequested(listener: (request: ShutdownRequest) => void): () => void
    respondToShutdown(response: ShutdownResponse): Promise<void>
  }

  study: StudyApi
  boards: BoardApi
  preferences: PreferencesApi
}
