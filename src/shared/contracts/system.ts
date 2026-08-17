import type { BoardApi } from './boards'
import type { DiaryApi } from './diary'
import type { FinanceApi } from './finance'
import type { HabitsApi } from './habits'
import type { MoviesApi } from './movies'
import type { MusicApi } from './music'
import type { NotesApi } from './notes'
import type { NutritionApi } from './nutrition'
import type { PasswordsApi } from './passwords'
import type { PreferencesApi } from './preferences'
import type { StudyApi } from './study'
import type { TasksApi } from './tasks'
import type { WorkoutsApi } from './workouts'

export const IPC_CHANNELS = {
  systemHealth: 'system:health',
  shutdownRequested: 'system:shutdown-requested',
  respondToShutdown: 'system:respond-to-shutdown',
  windowGetState: 'system:window-get-state',
  windowStateChanged: 'system:window-state-changed',
  windowMinimize: 'system:window-minimize',
  windowToggleMaximize: 'system:window-toggle-maximize',
  windowClose: 'system:window-close'
} as const

export interface SystemHealth {
  database: 'ready'
  sqliteVersion: string
}

export interface SystemWindowState {
  maximized: boolean
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
    getWindowState(): Promise<SystemWindowState>
    onWindowStateChanged(listener: (state: SystemWindowState) => void): () => void
    minimizeWindow(): Promise<void>
    toggleMaximizeWindow(): Promise<SystemWindowState>
    closeWindow(): Promise<void>
    onShutdownRequested(listener: (request: ShutdownRequest) => void): () => void
    respondToShutdown(response: ShutdownResponse): Promise<void>
  }

  study: StudyApi
  boards: BoardApi
  notes: NotesApi
  diary: DiaryApi
  finance: FinanceApi
  movies: MoviesApi
  music: MusicApi
  tasks: TasksApi
  habits: HabitsApi
  passwords: PasswordsApi
  workouts: WorkoutsApi
  nutrition: NutritionApi
  preferences: PreferencesApi
}
