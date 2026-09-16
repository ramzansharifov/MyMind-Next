import type {
  CreateLocalProfileInput,
  LocalProfile,
  ReplaceProfileCredentialsInput,
  UpdateLocalProfileInput
} from '@mymind/contracts/profile-sync'

export const PROFILE_SYNC_IPC_CHANNELS = {
  getProfile: 'profile-sync:get-profile',
  createProfile: 'profile-sync:create-profile',
  updateProfile: 'profile-sync:update-profile',
  replaceCredentials: 'profile-sync:replace-credentials',
  removeProfile: 'profile-sync:remove-profile',
  getLanStatus: 'profile-sync:get-lan-status',
  dataChanged: 'profile-sync:data-changed'
} as const

export interface LanSyncHostStatus {
  running: boolean
  port: number
  addresses: string[]
  deviceId: string
  deviceName: string
  profileReady: boolean
  lastSyncAt: number | null
}

export interface ProfileSyncApi {
  getProfile(): Promise<LocalProfile | null>
  createProfile(input: CreateLocalProfileInput): Promise<LocalProfile>
  updateProfile(input: UpdateLocalProfileInput): Promise<LocalProfile>
  replaceCredentials(input: ReplaceProfileCredentialsInput): Promise<LocalProfile>
  removeProfile(): Promise<boolean>
  getLanStatus(): Promise<LanSyncHostStatus>
  onDataChanged(listener: (modules: string[]) => void): () => void
}
