import type {
  LanSyncDevice,
  MobileSyncModule,
  SyncModule,
  SyncModuleInventory,
  SyncResult
} from '@mymind/contracts/profile-sync'

export interface SyncModulePreview {
  module: MobileSyncModule
  phone: SyncModuleInventory
  computer: SyncModuleInventory
}

export interface SyncPreview {
  device: LanSyncDevice
  modules: SyncModulePreview[]
}

export interface LanSyncClient {
  discover(manualHost?: string): Promise<LanSyncDevice[]>
  preview(device: LanSyncDevice): Promise<SyncPreview>
  sync(device: LanSyncDevice, modules: readonly SyncModule[]): Promise<SyncResult>
}
