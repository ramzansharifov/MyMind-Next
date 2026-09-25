export type ProfileGender = 'male' | 'female' | null

export interface LocalProfile {
  id: string
  login: string
  normalizedLogin: string
  name: string | null
  gender: ProfileGender
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

export const MOBILE_SYNC_MODULES = [
  'notes',
  'tasks',
  'habits',
  'nutrition',
  'calendar',
  'diary',
  'movies',
  'music',
  'finance',
  'passwords'
] as const satisfies readonly SyncModule[]

export type MobileSyncModule = (typeof MOBILE_SYNC_MODULES)[number]

export interface SyncScope {
  modules: SyncModule[]
}

export interface LanSyncDevice {
  deviceId: string
  deviceName: string
  host: string
  port: number
  protocolVersion: 1
  profileReady: boolean
  modules: SyncModule[]
}

export interface SyncModuleSummary {
  module: SyncModule
  received: number
  sent: number
  deleted: number
  conflicts: number
}

export interface SyncModuleInventory {
  module: SyncModule
  records: number
  deleted: number
}

export interface SyncInventoryRequest {
  modules: SyncModule[]
}

export interface SyncInventoryResponse {
  generatedAt: number
  modules: SyncModuleInventory[]
}

export interface SyncResult {
  startedAt: number
  completedAt: number
  device: LanSyncDevice
  modules: SyncModuleSummary[]
}

export interface SyncChallengeRequest {
  clientNonce: string
}

export interface SyncChallengeResponse {
  challengeId: string
  serverNonce: string
  expiresAt: number
}

export interface SyncProofRequest {
  challengeId: string
  clientNonce: string
  proof: string
}

export interface SyncProofResponse {
  sessionToken: string
  expiresAt: number
  serverProof: string
}

export interface LanSyncEncryptedEnvelope {
  version: 1
  requestId: string
  nonce: string
  ciphertext: string
  tag: string
}

export const LAN_SYNC_PROTOCOL_VERSION = 1 as const
export const LAN_SYNC_DEFAULT_PORT = 49632
export const LAN_SYNC_PORT_SPAN = 5

export type SyncScalar = string | number | null

export interface SyncSnapshotRow {
  key: string
  version: number
  data: Record<string, SyncScalar>
}

export interface SyncSnapshotTombstone {
  key: string
  deletedAt: number
}

export interface SyncTableSnapshot {
  table: string
  rows: SyncSnapshotRow[]
  tombstones: SyncSnapshotTombstone[]
}

export interface SyncModuleSnapshot {
  module: SyncModule
  tables: SyncTableSnapshot[]
}

export interface SyncDataSnapshot {
  version: 1
  generatedAt: number
  modules: SyncModuleSnapshot[]
}

export type SyncAssetKind = 'note-asset' | 'workout-photo'

export interface SyncAssetReference {
  path: string
  kind: SyncAssetKind
  ownerId: string
  assetId: string
  fileName: string
}

export interface SyncAssetManifestEntry extends SyncAssetReference {
  size: number
  sha256: string
}

export interface SyncPlanRequest {
  snapshot: SyncDataSnapshot
  assets: SyncAssetManifestEntry[]
}

export interface SyncPlanResponse {
  planId: string
  expiresAt: number
  snapshot: SyncDataSnapshot
  summaries: SyncModuleSummary[]
  uploads: SyncAssetManifestEntry[]
  downloads: SyncAssetManifestEntry[]
}

export interface SyncAssetUploadChunk {
  planId: string
  path: string
  offset: number
  data: string
}

export interface SyncAssetUploadProgress {
  path: string
  received: number
  complete: boolean
}

export interface SyncAssetDownloadChunk {
  path: string
  offset: number
  totalSize: number
  sha256: string
  data: string
  complete: boolean
}

export interface SyncCommitRequest {
  planId: string
}

export interface SyncCommitResponse {
  committedAt: number
}
