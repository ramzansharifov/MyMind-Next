export type ProfileGender = 'male' | 'female' | null

export interface LocalProfile {
  id: string
  login: string
  normalizedLogin: string
  name: string | null
  gender: ProfileGender
  credentialFingerprint: string
  createdAt: number
  updatedAt: number
}

export interface CreateLocalProfileInput {
  login: string
  password: string
  name?: string | null
  gender?: ProfileGender
}

export interface UpdateLocalProfileInput {
  name?: string | null
  gender?: ProfileGender
}

export interface ReplaceProfileCredentialsInput {
  login: string
  password: string
}

export const SYNC_MODULES = [
  'notes',
  'tasks',
  'habits',
  'movies',
  'music',
  'calendar',
  'diary',
  'workouts',
  'nutrition',
  'finance',
  'passwords'
] as const

export type SyncModule = (typeof SYNC_MODULES)[number]

export interface SyncScope {
  modules: SyncModule[]
}

export interface LanSyncDevice {
  deviceId: string
  deviceName: string
  host: string
  port: number
  protocolVersion: 1
  profileLogin: string
  modules: SyncModule[]
}

export interface SyncModuleSummary {
  module: SyncModule
  received: number
  sent: number
  deleted: number
  conflicts: number
}

export interface SyncResult {
  startedAt: number
  completedAt: number
  device: LanSyncDevice
  modules: SyncModuleSummary[]
}

export interface SyncChallengeRequest {
  login: string
  clientNonce: string
}

export interface SyncChallengeResponse {
  challengeId: string
  serverNonce: string
  expiresAt: number
}

export interface SyncProofRequest {
  challengeId: string
  login: string
  clientNonce: string
  proof: string
}

export interface SyncProofResponse {
  sessionToken: string
  expiresAt: number
  serverProof: string
}

export const LAN_SYNC_PROTOCOL_VERSION = 1 as const
export const LAN_SYNC_DEFAULT_PORT = 49632
