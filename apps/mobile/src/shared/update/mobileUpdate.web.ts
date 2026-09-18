import type { MobileReleaseAsset } from './mobileUpdateCore'

export function getInstalledMobileVersion(): string {
  return 'web'
}

export function mobileUpdatesSupported(): boolean {
  return false
}

export async function checkRemoteMobileRelease(): Promise<MobileReleaseAsset | null> {
  return null
}

export async function downloadAndOpenMobileUpdate(
  release: MobileReleaseAsset,
  onProgress: (progress: { transferred: number; total: number; percent: number }) => void
): Promise<void> {
  void release
  void onProgress
  throw new Error('Обновление APK доступно только в Android-версии MyMind')
}
